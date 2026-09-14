"use strict";

const models = require("../../shared/models");

const VALID_PTO = new Set(["pending", "approved", "denied", "cancelled"]);

class WorkforceFoundationService {
  constructor(database, auditService, realtimeHub) {
    this.database = database;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
  }

  async requireLocation(organizationId, locationId) {
    const location = locationId ? await this.database.get("locations", locationId) : null;
    if (!location || location.organizationId !== organizationId) {
      const error = new Error("Location is not available to this organization.");
      error.statusCode = 404;
      throw error;
    }
    return location;
  }

  async snapshot(organizationId, locationId) {
    await this.requireLocation(organizationId, locationId);
    const db = await this.database.read();
    const staff = (db.staff || []).filter(item => item.organizationId === organizationId && item.locationId === locationId);
    const portalEmployees = (db.employees || []).filter(item => item.organizationId === organizationId && item.locationId === locationId);
    const employees = [...staff, ...portalEmployees.filter(item => !staff.some(existing => existing.id === item.id))];
    const employeeIds = new Set(employees.map(item => item.id));
    const metrics = this.employeeMetrics(db, employees, organizationId, locationId);
    return {
      employees: employees.map(employee => ({ ...employee, metrics: metrics[employee.id] })),
      roles: (db.workforceRoles || []).filter(item => item.organizationId === organizationId && item.locationId === locationId),
      availability: (db.employeeAvailability || []).filter(item => employeeIds.has(item.employeeId)),
      ptoRequests: (db.ptoRequests || []).filter(item => employeeIds.has(item.employeeId)),
      shiftTemplates: (db.shiftTemplates || []).filter(item => item.organizationId === organizationId && item.locationId === locationId),
      summary: {
        activeEmployees: employees.filter(item => (item.employmentStatus || item.status || "active") === "active").length,
        pendingPto: (db.ptoRequests || []).filter(item => employeeIds.has(item.employeeId) && item.status === "pending").length,
        roles: new Set(employees.map(item => item.role).filter(Boolean)).size,
        templates: (db.shiftTemplates || []).filter(item => item.organizationId === organizationId && item.locationId === locationId).length
      },
      generatedAt: new Date().toISOString()
    };
  }

  employeeMetrics(db, employees, organizationId, locationId) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (28 * 86400000));
    const cards = (db.employeeTimecards || []).filter(item => item.organizationId === organizationId && item.locationId === locationId && item.clockIn && new Date(item.clockIn) >= windowStart && new Date(item.clockIn) <= now);
    const shifts = (db.scheduleShifts || []).filter(item => item.organizationId === organizationId && item.locationId === locationId && item.employeeId && item.date && item.startTime && ["published", "scheduled"].includes(item.status || "published"));
    const pto = (db.ptoRequests || []).filter(item => item.status === "approved" && String(item.requestType || "").toLowerCase() === "sick");
    const result = {};
    for (const employee of employees) {
      const mine = cards.filter(item => item.employeeId === employee.id);
      const completed = mine.filter(item => item.clockOut && new Date(item.clockOut) >= new Date(item.clockIn));
      const totalHours = completed.reduce((sum, item) => sum + ((new Date(item.clockOut) - new Date(item.clockIn)) / 3600000), 0);
      const eligibleShifts = shifts.filter(item => item.employeeId === employee.id && new Date(`${item.date}T${item.startTime}`) <= now && new Date(`${item.date}T${item.startTime}`) >= windowStart);
      const attended = eligibleShifts.map(shift => {
        const start = new Date(`${shift.date}T${shift.startTime}`);
        const card = mine.find(item => Math.abs(new Date(item.clockIn) - start) <= 12 * 3600000);
        return card ? { card, start } : null;
      }).filter(Boolean);
      const onTime = attended.filter(item => new Date(item.card.clockIn) <= new Date(item.start.getTime() + 5 * 60000)).length;
      const sickDays = pto.filter(item => item.employeeId === employee.id).reduce((sum, item) => {
        const start = new Date(`${item.startDate}T12:00:00`), end = new Date(`${item.endDate}T12:00:00`);
        return sum + (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ? 0 : Math.max(1, Math.floor((end - start) / 86400000) + 1));
      }, 0);
      result[employee.id] = {
        windowDays: 28,
        averageWeeklyHours: completed.length ? Math.round((totalHours / 4) * 10) / 10 : null,
        sickDaysUsed: sickDays,
        attendanceRate: eligibleShifts.length ? Math.round((attended.length / eligibleShifts.length) * 100) : null,
        onTimeRate: attended.length ? Math.round((onTime / attended.length) * 100) : null,
        completedTimecards: completed.length,
        eligibleShifts: eligibleShifts.length
      };
    }
    return result;
  }

  async createEmployee(input, actor, organizationId) {
    if (!input.locationId || !input.name || !input.role) throw new Error("locationId, name, and role are required");
    await this.requireLocation(organizationId, input.locationId);
    const pin = String(input.pin || "").trim();
    if (!/^\d{4,6}$/.test(pin)) throw new Error("Clock PIN must be 4 to 6 digits");
    const db = await this.database.read();
    if ([...(db.staff || []), ...(db.employees || [])].some(item => item.organizationId === organizationId && item.locationId === input.locationId && String(item.pin || "") === pin)) throw new Error("That clock PIN is already in use at this location");
    const employee = models.employee({
      organizationId,
      locationId: input.locationId,
      name: String(input.name).trim(),
      email: String(input.email || "").trim().toLowerCase(),
      phone: String(input.phone || "").trim(),
      role: String(input.role).trim(),
      department: String(input.department || "Service").trim(),
      hourlyRate: Math.max(0, Number(input.hourlyRate || 0)),
      employmentStatus: input.employmentStatus || "active",
      skills: Array.isArray(input.skills) ? input.skills : String(input.skills || "").split(",").map(v => v.trim()).filter(Boolean),
      certifications: Array.isArray(input.certifications) ? input.certifications : [],
      preferredHours: Math.max(0, Number(input.preferredHours || 0)),
      birthday: String(input.birthday || "").trim(),
      pin,
      createdAt: new Date().toISOString()
    });
    await this.database.create("staff", employee);
    await this.record(organizationId, actor, `Created employee ${employee.name}`);
    this.realtimeHub.publish("workforce-foundation:employee-created", employee);
    return employee;
  }

  async updateEmployee(id, patch, actor, organizationId) {
    let collection = "staff";
    let existing = await this.database.get(collection, id);
    if (!existing) { collection = "employees"; existing = await this.database.get(collection, id); }
    if (!existing || existing.organizationId !== organizationId) return null;
    const allowed = ["name","email","phone","role","department","hourlyRate","employmentStatus","skills","certifications","preferredHours","birthday","pin"];
    const clean = Object.fromEntries(Object.entries(patch || {}).filter(([key]) => allowed.includes(key)));
    if (clean.hourlyRate !== undefined) clean.hourlyRate = Math.max(0, Number(clean.hourlyRate || 0));
    if (clean.pin !== undefined) {
      clean.pin = String(clean.pin || "").trim();
      if (!/^\d{4,6}$/.test(clean.pin)) throw new Error("Clock PIN must be 4 to 6 digits");
      const db = await this.database.read();
      if ([...(db.staff || []), ...(db.employees || [])].some(item => item.id !== id && item.organizationId === organizationId && item.locationId === existing.locationId && String(item.pin || "") === clean.pin)) throw new Error("That clock PIN is already in use at this location");
    }
    const nextStatus = clean.employmentStatus;
    if (nextStatus !== undefined && !["active", "terminated"].includes(nextStatus)) throw new Error("Employment status must be active or terminated");
    if (nextStatus === "terminated") {
      const reason = String(patch.terminationReason || "").trim();
      if (!reason) throw new Error("A reason is required to end employment");
      clean.terminationReason = reason.slice(0, 300);
      clean.terminatedAt = new Date().toISOString();
      clean.terminatedBy = actor;
    }
    if (nextStatus === "active" && (existing.employmentStatus || existing.status) === "terminated") {
      clean.reactivatedAt = new Date().toISOString();
      clean.reactivatedBy = actor;
    }
    const updated = await this.database.update(collection, id, clean);
    await this.record(organizationId, actor, `${nextStatus === "terminated" ? "Ended employment for" : nextStatus === "active" ? "Reactivated" : "Updated employee"} ${updated.name}`);
    this.realtimeHub.publish("workforce-foundation:employee-updated", updated);
    return updated;
  }

  async saveAvailability(input, actor, organizationId) {
    if (!input.employeeId || !Number.isInteger(Number(input.dayOfWeek))) throw new Error("employeeId and dayOfWeek are required");
    const employee = await this.database.get("staff", input.employeeId) || await this.database.get("employees", input.employeeId);
    if (!employee || employee.organizationId !== organizationId) return null;
    const entry = await this.database.mutate(db => {
      db.employeeAvailability ||= [];
      const dayOfWeek = Number(input.dayOfWeek);
      const existing = db.employeeAvailability.find(item => item.employeeId === input.employeeId && item.dayOfWeek === dayOfWeek);
      const value = {
        id: existing?.id || `avail_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        employeeId: input.employeeId,
        dayOfWeek,
        startTime: input.startTime || "09:00",
        endTime: input.endTime || "17:00",
        available: input.available !== false,
        preferred: Boolean(input.preferred),
        updatedAt: new Date().toISOString()
      };
      if (existing) Object.assign(existing, value); else db.employeeAvailability.push(value);
      return value;
    });
    await this.record(organizationId, actor, `Updated availability for ${employee.name}`);
    this.realtimeHub.publish("workforce-foundation:availability-updated", entry);
    return entry;
  }

  async requestPto(input, actor, organizationId) {
    if (!input.employeeId || !input.startDate || !input.endDate) throw new Error("employeeId, startDate, and endDate are required");
    if (new Date(input.endDate) < new Date(input.startDate)) throw new Error("endDate must be on or after startDate");
    const employee = await this.database.get("staff", input.employeeId) || await this.database.get("employees", input.employeeId);
    if (!employee || employee.organizationId !== organizationId) return null;
    const request = models.ptoRequest({ employeeId: input.employeeId, startDate: input.startDate, endDate: input.endDate, reason: String(input.reason || ""), status: "pending", createdAt: new Date().toISOString() });
    await this.database.create("ptoRequests", request);
    await this.record(organizationId, actor, `PTO requested for ${employee.name}`);
    this.realtimeHub.publish("workforce-foundation:pto-created", request);
    return request;
  }

  async decidePto(id, status, managerComment, actor, organizationId) {
    if (!VALID_PTO.has(status) || !["approved", "denied"].includes(status)) throw new Error("status must be approved or denied");
    const comment = String(managerComment || "").trim();
    if (comment.length > 300) throw new Error("Manager comment must be 300 characters or fewer");
    const existing = await this.database.get("ptoRequests", id);
    if (!existing) return null;
    const db = await this.database.read();
    const employee = [...(db.staff || []), ...(db.employees || [])].find(item => item.id === existing.employeeId);
    if (!employee || employee.organizationId !== organizationId) return null;
    if (existing.status !== "pending") throw new Error("Only pending PTO requests can be approved or denied");
    const updated = await this.database.update("ptoRequests", id, {
      status,
      managerComment: comment,
      decidedBy: actor,
      decidedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await this.record(organizationId, actor, `${status} PTO for ${employee.name}`);
    this.realtimeHub.publish("workforce-foundation:pto-updated", updated);
    this.realtimeHub.publish("employee-portal:pto-updated", updated);
    return updated;
  }

  async createShiftTemplate(input, actor, organizationId) {
    if (!input.locationId || !input.name || !input.role || !input.startTime || !input.endTime) throw new Error("locationId, name, role, startTime, and endTime are required");
    await this.requireLocation(organizationId, input.locationId);
    const template = models.shiftTemplate({ organizationId, locationId: input.locationId, name: String(input.name), department: input.department || "Service", role: String(input.role), startTime: input.startTime, endTime: input.endTime, requiredEmployees: Math.max(1, Number(input.requiredEmployees || 1)), days: Array.isArray(input.days) ? input.days : [], createdAt: new Date().toISOString() });
    await this.database.create("shiftTemplates", template);
    await this.record(organizationId, actor, `Created shift template ${template.name}`);
    this.realtimeHub.publish("workforce-foundation:template-created", template);
    return template;
  }

  async record(organizationId, actor, action) {
    return this.auditService.record({ organizationId, actor, action, category: "workforce-foundation" });
  }
}

module.exports = WorkforceFoundationService;
