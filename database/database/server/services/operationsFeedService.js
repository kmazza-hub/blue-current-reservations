"use strict";

class OperationsFeedService {
  constructor(database) { this.database = database; }

  normalizeCategory(value = "operations") {
    const category = String(value || "operations").toLowerCase();
    if (category.includes("pto") || category.includes("staff") || category.includes("workforce") || category.includes("employee")) return "staffing";
    if (category.includes("reservation") || category.includes("guest")) return "guests";
    if (category.includes("inventory") || category.includes("purchase") || category.includes("delivery")) return "inventory";
    if (category.includes("maintenance") || category.includes("equipment")) return "maintenance";
    if (category.includes("handoff") || category.includes("shift")) return "handoffs";
    return "operations";
  }

  async record({ organizationId, locationId, category, type, title, detail, actor, occurredAt }) {
    const event = {
      id: `opevent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      organizationId,
      locationId,
      category: this.normalizeCategory(category),
      type: type || "update",
      title: String(title || "Operating update").slice(0, 180),
      detail: String(detail || "").slice(0, 360),
      actor: actor || "Blue Current",
      occurredAt: occurredAt || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    return this.database.create("operationsEvents", event);
  }

  async list(organizationId, locationId, category = "all", limit = 40) {
    const db = await this.database.read();
    const stored = (db.operationsEvents || []).filter(item => item.organizationId === organizationId && item.locationId === locationId);
    const audit = (db.auditLogs || [])
      .filter(item => item.organizationId === organizationId)
      .map(item => ({
        id: `audit_${item.id}`,
        organizationId,
        locationId,
        category: this.normalizeCategory(item.category),
        type: "audit",
        title: item.action || "Operating activity",
        detail: item.detail || "",
        actor: item.actor || "Manager",
        occurredAt: item.createdAt || item.timestamp || new Date().toISOString()
      }));
    const handoffs = (db.shiftHandoffs || [])
      .filter(item => item.organizationId === organizationId && item.locationId === locationId)
      .map(item => ({
        id: `handofffeed_${item.id}`,
        organizationId,
        locationId,
        category: "handoffs",
        type: "handoff",
        title: `${this.titleCase(item.shift)} shift handoff posted`,
        detail: item.summary,
        actor: item.authorName || "Manager",
        occurredAt: item.createdAt
      }));
    const combined = [...stored, ...audit, ...handoffs];
    const unique = [...new Map(combined.map(item => [item.id, item])).values()]
      .filter(item => category === "all" || item.category === category)
      .sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0))
      .slice(0, Math.max(1, Math.min(100, Number(limit) || 40)));
    return { events: unique, categories: ["all", "operations", "staffing", "guests", "inventory", "maintenance", "handoffs"], generatedAt: new Date().toISOString() };
  }

  titleCase(value) { return String(value || "").replace(/(^|\s)\S/g, letter => letter.toUpperCase()); }
}

module.exports = OperationsFeedService;
