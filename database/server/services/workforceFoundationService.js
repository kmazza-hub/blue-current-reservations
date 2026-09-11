"use strict";

const models = require("../../shared/models");

const VALID_PTO = new Set(["pending", "approved", "denied", "cancelled"]);

class WorkforceFoundationService {
  constructor(database, auditService, realtimeHub) {
    this.database = database;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
  }

  async snapshot(organizationId, locationId) {
    const db = await this.database.read();
    const staff = (db.staff || []).filter(item => item.organizationId === organizationId && item.locationId === locationId);
    const portalEmployees = (db.employees || []).filter(item => item.organizationId === organizationId && item.locationId === locationId);
    const employees = [...staff, ...portalEmployees.filter(item => !staff.some(existing => existing.id === item.id))];
    const employeeIds = new Set(employees.map(item => item.id));
    return {
      employees,
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

  async createEmployee(input, actor, organizationId) {
    if (!input.locationId || !input.name || !input.role) throw new Error("locationId, name, and role are required");
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
      createdAt: new Date().toISOString()
    });
    await this.database.create("staff", employee);
    await this.record(organizationId, actor, `Created employee ${employee.name}`);
    this.realtimeHub.publish("workforce-foundation:employee-created", employee);
    return employee;
  }

  async updateEmployee(id, patch, actor, organizationId) {
    const allowed = ["name","email","phone","role","department","hourlyRate","employmentStatus","skills","certifications","preferredHours"];
    const clean = Object.fromEntries(Object.entries(patch || {}).filter(([key]) => allowed.includes(key)));
    if (clean.hourlyRate !== undefined) clean.hourlyRate = Math.max(0, Number(clean.hourlyRate || 0));
    const updated = await this.database.update("staff", id, clean);
    if (!updated || updated.organizationId !== organizationId) return null;
    await this.record(organizationId, actor, `Updated employee ${updated.name}`);
    this.realtimeHub.publish("workforce-foundation:employee-updated", updated);
    return updated;
  }

  async saveAvailability(input, actor, organizationId) {
    if (!input.employeeId || !Number.isInteger(Number(input.dayOfWeek))) throw new Error("employeeId and dayOfWeek are required");
    const employee = await this.database.get("staff", input.employeeId);
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
    const employee = await this.database.get("staff", input.employeeId);
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
