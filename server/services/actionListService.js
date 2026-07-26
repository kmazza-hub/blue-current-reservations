"use strict";

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
      for (const action of db.managerActions) {
        if (
          action.organizationId === organizationId &&
          action.locationId === locationId &&
          action.automatic &&
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

    const completed = Boolean(patch.completed);
    const updated = await this.database.update("managerActions", actionId, {
      completed,
      completedAt: completed ? new Date().toISOString() : null,
      completedBy: completed ? (actor?.name || actor?.email || "Manager") : null,
      autoResolved: false,
      updatedAt: new Date().toISOString()
    });

    if (updated && this.operationsFeedService) {
      await this.operationsFeedService.record({
        organizationId,
        locationId,
        category: String(updated.source || "operations").toLowerCase(),
        type: completed ? "action_completed" : "action_reopened",
        title: completed ? `Action completed: ${updated.title}` : `Action reopened: ${updated.title}`,
        detail: `${updated.source} · ${updated.due}`,
        actor: actor?.name || actor?.email || "Manager"
      });
    }

    return updated;
  }
}

module.exports = ActionListService;
