"use strict";

const crypto = require("crypto");

class ActionListService {
  constructor(database, operationsFeedService) {
    this.database = database;
    this.operationsFeedService = operationsFeedService;
  }

  slug(value) {
    return String(value || "item")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);
  }

  async operatingSignals(organizationId, locationId) {
    const db = await this.database.read();

    const employees = [...(db.staff || []), ...(db.employees || [])]
      .filter(item => item.organizationId === organizationId && item.locationId === locationId);
    const employeeIds = new Set(employees.map(item => item.id));

    const pendingPto = (db.ptoRequests || [])
      .filter(item => employeeIds.has(item.employeeId) && item.status === "pending");

    const lowInventory = (db.inventoryItems || [])
      .filter(item => item.locationId === locationId)
      .filter(item => Number(item.onHand || 0) <= Number(item.par || 0) * 0.6)
      .sort((a, b) => {
        const aRatio = Number(a.par || 0) ? Number(a.onHand || 0) / Number(a.par || 1) : 1;
        const bRatio = Number(b.par || 0) ? Number(b.onHand || 0) / Number(b.par || 1) : 1;
        return aRatio - bRatio;
      })
      .slice(0, 3);

    const openMaintenance = (db.maintenanceTickets || [])
      .filter(item => item.locationId === locationId)
      .filter(item => !["closed", "completed"].includes(String(item.status || "").toLowerCase()))
      .slice(0, 3);

    const latestHandoff = (db.shiftHandoffs || [])
      .filter(item => item.organizationId === organizationId && item.locationId === locationId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;

    const handoffAgeHours = latestHandoff
      ? Math.max(0, (Date.now() - new Date(latestHandoff.createdAt || Date.now()).getTime()) / 36e5)
      : null;

    return {
      db,
      employees,
      pendingPto,
      lowInventory,
      openMaintenance,
      latestHandoff,
      handoffAgeHours
    };
  }

  desiredAutomaticActions(organizationId, locationId, signals) {
    const now = new Date().toISOString();
    const actions = [];

    for (const request of signals.pendingPto) {
      const employee = signals.employees.find(item => item.id === request.employeeId);
      const employeeName = employee?.name || "Employee";
      actions.push({
        id: `action_${locationId}_pto_${request.id}`,
        organizationId,
        locationId,
        title: `Review ${employeeName}’s pending PTO request`,
        source: "Workforce",
        priority: "high",
        due: "Due today",
        completed: false,
        automatic: true,
        sourceRecordId: request.id,
        sourceRecordType: "pto_request",
        createdAt: request.createdAt || now
      });
    }

    for (const item of signals.lowInventory) {
      actions.push({
        id: `action_${locationId}_inventory_${item.id || this.slug(item.name)}`,
        organizationId,
        locationId,
        title: `Confirm replenishment for ${item.name || "low-stock item"}`,
        source: "Inventory",
        priority: "high",
        due: "Before dinner service",
        completed: false,
        automatic: true,
        sourceRecordId: item.id || null,
        sourceRecordType: "inventory_item",
        createdAt: now
      });
    }

    for (const ticket of signals.openMaintenance) {
      actions.push({
        id: `action_${locationId}_maintenance_${ticket.id || this.slug(ticket.title)}`,
        organizationId,
        locationId,
        title: ticket.title ? `Follow up: ${ticket.title}` : "Follow up on open maintenance item",
        source: "Maintenance",
        priority: String(ticket.priority || ticket.severity || "").toLowerCase() === "critical" ? "high" : "medium",
        due: "Before service",
        completed: false,
        automatic: true,
        sourceRecordId: ticket.id || null,
        sourceRecordType: "maintenance_ticket",
        createdAt: ticket.createdAt || now
      });
    }

    if (!signals.latestHandoff || signals.handoffAgeHours > 24) {
      actions.push({
        id: `action_${locationId}_shift_handoff`,
        organizationId,
        locationId,
        title: signals.latestHandoff ? "Post an updated shift handoff" : "Post the first shift handoff",
        source: "Handoffs",
        priority: "medium",
        due: "Before the next manager arrives",
        completed: false,
        automatic: true,
        sourceRecordId: signals.latestHandoff?.id || null,
        sourceRecordType: "shift_handoff",
        createdAt: now
      });
    }

    return actions;
  }

  async synchronizeAutomaticActions(organizationId, locationId) {
    const signals = await this.operatingSignals(organizationId, locationId);
    const desired = this.desiredAutomaticActions(organizationId, locationId, signals);
    const desiredIds = new Set(desired.map(item => item.id));

    await this.database.mutate(db => {
      db.managerActions ||= [];

      for (const desiredAction of desired) {
        const existing = db.managerActions.find(item => item.id === desiredAction.id);

        if (!existing) {
          db.managerActions.push(desiredAction);
          continue;
        }

        // Keep the manager's completion decision, while refreshing operational context.
        existing.title = desiredAction.title;
        existing.source = desiredAction.source;
        existing.priority = desiredAction.priority;
        existing.due = desiredAction.due;
        existing.automatic = true;
        existing.sourceRecordId = desiredAction.sourceRecordId;
        existing.sourceRecordType = desiredAction.sourceRecordType;
        existing.updatedAt = new Date().toISOString();
      }

      // Resolve automatic tasks when the underlying condition no longer exists.
      // Each synchronizer may resolve only the source record types it owns.
      const synchronizedTypes = new Set(["pto_request", "inventory_item", "maintenance_ticket", "shift_handoff"]);
      for (const action of db.managerActions) {
        if (
          action.organizationId === organizationId &&
          action.locationId === locationId &&
          action.automatic &&
          synchronizedTypes.has(action.sourceRecordType) &&
          !desiredIds.has(action.id) &&
          !action.completed
        ) {
          action.completed = true;
          action.completedAt = new Date().toISOString();
          action.completedBy = "Blue Current";
          action.autoResolved = true;
          action.updatedAt = new Date().toISOString();
        }
      }
    });
  }

  async synchronizeServiceExceptions(organizationId, locationId, input, actor) {
    const supplied = Array.isArray(input?.exceptions) ? input.exceptions.slice(0, 100) : [];
    const desired = supplied.map(item => {
      const exceptionKey = String(item?.exceptionKey || "").trim().slice(0, 240);
      if (!exceptionKey) return null;
      const sourceRecordId = crypto.createHash("sha256").update(exceptionKey).digest("hex").slice(0, 24);
      const guest = String(item?.guest || "Guest").trim().slice(0, 80) || "Guest";
      const table = String(item?.table || "Assigned table").trim().slice(0, 40) || "Assigned table";
      const reason = String(item?.reason || "Service recovery needed").trim().slice(0, 160);
      const recoveryAction = String(item?.action || "Check the table now").trim().slice(0, 160);
      const minutes = Math.max(1, Math.min(999, Number(item?.minutes) || 1));
      return {
        id: `action_${locationId}_service_${sourceRecordId}`,
        organizationId,
        locationId,
        title: `Service recovery: ${guest} · ${table}`.slice(0, 140),
        source: "Service",
        priority: "high",
        due: "Now",
        completed: false,
        automatic: true,
        sourceRecordId,
        sourceRecordType: "service_exception",
        serviceContext: { guest, table, reason, recoveryAction, minutes },
        createdAt: new Date().toISOString()
      };
    }).filter(Boolean);
    const desiredIds = new Set(desired.map(item => item.id));
    const transitions = await this.database.mutate(db => {
      db.managerActions ||= [];
      const changed = [];
      for (const desiredAction of desired) {
        const existing = db.managerActions.find(item => item.id === desiredAction.id);
        if (!existing) {
          db.managerActions.push(desiredAction);
          changed.push({ type: "opened", action: desiredAction });
          continue;
        }
        existing.title = desiredAction.title;
        existing.priority = desiredAction.priority;
        existing.due = desiredAction.due;
        existing.serviceContext = desiredAction.serviceContext;
        existing.updatedAt = new Date().toISOString();
      }
      for (const action of db.managerActions) {
        if (action.organizationId === organizationId && action.locationId === locationId && action.sourceRecordType === "service_exception" && !desiredIds.has(action.id) && !action.completed) {
          action.completed = true;
          action.completedAt = new Date().toISOString();
          action.completedBy = "Blue Current";
          action.autoResolved = true;
          action.updatedAt = new Date().toISOString();
          changed.push({ type: "resolved", action });
        }
      }
      return changed;
    });
    if (this.operationsFeedService) {
      for (const transition of transitions) {
        const opened = transition.type === "opened", action = transition.action;
        await this.operationsFeedService.record({
          organizationId,
          locationId,
          category: "service",
          type: opened ? "service_exception_opened" : "service_exception_resolved",
          title: opened ? action.title : `Service recovery cleared: ${action.serviceContext?.guest || "Guest"} · ${action.serviceContext?.table || "Table"}`,
          detail: opened ? `${action.serviceContext?.reason || "Recovery needed"} · ${action.serviceContext?.recoveryAction || "Check the table"}` : "The underlying Service condition is no longer active.",
          actor: opened ? (actor?.name || actor?.email || "Service") : "Blue Current"
        });
      }
    }
    return { exceptions: desired.length, transitions: transitions.length, synchronizedAt: new Date().toISOString() };
  }

  async list(organizationId, locationId) {
    await this.synchronizeAutomaticActions(organizationId, locationId);

    const actions = await this.database.list(
      "managerActions",
      item => item.organizationId === organizationId && item.locationId === locationId
    );

    return {
      actions: [...actions].sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);

        const rank = { high: 0, medium: 1, low: 2 };
        const priorityDifference = (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
        if (priorityDifference) return priorityDifference;

        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }),
      generatedAt: new Date().toISOString(),
      mode: "live-operational-actions"
    };
  }

  async create(organizationId, locationId, input, actor) {
    const title = String(input.title || "").trim();
    if (!title) {
      const error = new Error("Action title is required.");
      error.statusCode = 400;
      throw error;
    }

    const allowedPriorities = new Set(["high", "medium", "low"]);
    const priority = allowedPriorities.has(String(input.priority || "").toLowerCase())
      ? String(input.priority).toLowerCase()
      : "medium";

    const now = new Date().toISOString();
    const action = {
      id: `action_${locationId}_manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      organizationId,
      locationId,
      title: title.slice(0, 140),
      source: String(input.source || "Operations").trim().slice(0, 40) || "Operations",
      priority,
      due: String(input.due || "Due today").trim().slice(0, 80) || "Due today",
      completed: false,
      automatic: false,
      createdBy: actor?.name || actor?.email || "Manager",
      createdAt: now,
      updatedAt: now
    };

    await this.database.create("managerActions", action);

    if (this.operationsFeedService) {
      await this.operationsFeedService.record({
        organizationId,
        locationId,
        category: String(action.source || "operations").toLowerCase(),
        type: "action_created",
        title: `Manager action added: ${action.title}`,
        detail: `${action.source} · ${action.due}`,
        actor: action.createdBy
      });
    }

    return action;
  }

  async delete(organizationId, locationId, actionId, actor) {
    const current = await this.database.get("managerActions", actionId);
    if (!current || current.organizationId !== organizationId || current.locationId !== locationId) {
      return null;
    }

    if (current.automatic) {
      const error = new Error("Automatic actions cannot be deleted. Resolve the underlying condition instead.");
      error.statusCode = 409;
      throw error;
    }

    await this.database.delete("managerActions", actionId);

    if (this.operationsFeedService) {
      await this.operationsFeedService.record({
        organizationId,
        locationId,
        category: String(current.source || "operations").toLowerCase(),
        type: "action_deleted",
        title: `Manager action removed: ${current.title}`,
        detail: `${current.source} · ${current.due}`,
        actor: actor?.name || actor?.email || "Manager"
      });
    }

    return current;
  }

  async update(organizationId, locationId, actionId, patch, actor) {
    const current = await this.database.get("managerActions", actionId);
    if (!current || current.organizationId !== organizationId || current.locationId !== locationId) {
      return null;
    }

    const changes = {
      updatedAt: new Date().toISOString()
    };

    let eventType = null;
    let eventTitle = null;

    if (Object.prototype.hasOwnProperty.call(patch, "completed")) {
      const completed = Boolean(patch.completed);
      changes.completed = completed;
      changes.completedAt = completed ? new Date().toISOString() : null;
      changes.completedBy = completed ? (actor?.name || actor?.email || "Manager") : null;
      changes.autoResolved = false;
      eventType = completed ? "action_completed" : "action_reopened";
      eventTitle = completed ? `Action completed: ${current.title}` : `Action reopened: ${current.title}`;
    }

    if (patch.edit) {
      if (current.automatic) {
        const error = new Error("Automatic actions cannot be edited. Resolve the underlying condition instead.");
        error.statusCode = 409;
        throw error;
      }

      const title = String(patch.title || "").trim();
      if (!title) {
        const error = new Error("Action title is required.");
        error.statusCode = 400;
        throw error;
      }

      const allowedPriorities = new Set(["high", "medium", "low"]);
      const priority = allowedPriorities.has(String(patch.priority || "").toLowerCase())
        ? String(patch.priority).toLowerCase()
        : current.priority;

      changes.title = title.slice(0, 140);
      changes.source = String(patch.source || current.source || "Operations").trim().slice(0, 40) || "Operations";
      changes.priority = priority;
      changes.due = String(patch.due || current.due || "Due today").trim().slice(0, 80) || "Due today";
      eventType = "action_edited";
      eventTitle = `Manager action updated: ${changes.title}`;
    }

    if (patch.assign) {
      const assignedTo = String(patch.assignedTo || "").trim();
      changes.assignedTo = assignedTo.slice(0, 80) || null;
      changes.assignedAt = changes.assignedTo ? new Date().toISOString() : null;
      changes.assignedBy = changes.assignedTo ? (actor?.name || actor?.email || "Manager") : null;
      eventType = changes.assignedTo ? "action_assigned" : "action_unassigned";
      eventTitle = changes.assignedTo
        ? `Action assigned to ${changes.assignedTo}: ${current.title}`
        : `Action unassigned: ${current.title}`;
    }

    if (patch.noteUpdate) {
      const note = String(patch.note || "").trim();
      changes.note = note.slice(0, 500) || null;
      changes.noteUpdatedAt = new Date().toISOString();
      changes.noteUpdatedBy = actor?.name || actor?.email || "Manager";
      eventType = changes.note ? "action_note_added" : "action_note_removed";
      eventTitle = changes.note
        ? `Manager note added: ${current.title}`
        : `Manager note removed: ${current.title}`;
    }

    const updated = await this.database.update("managerActions", actionId, changes);

    if (updated && this.operationsFeedService && eventType) {
      await this.operationsFeedService.record({
        organizationId,
        locationId,
        category: String(updated.source || "operations").toLowerCase(),
        type: eventType,
        title: eventTitle,
        detail: `${updated.source} · ${updated.due}`,
        actor: actor?.name || actor?.email || "Manager"
      });
    }

    return updated;
  }
}

module.exports = ActionListService;
