"use strict";

class CommandCenterService {
  constructor(database, operationsFeedService = null) { this.database = database; this.operationsFeedService = operationsFeedService; }

  normalizeList(value, limit = 6) {
    const values = Array.isArray(value) ? value : String(value || "").split(",");
    return values.map(item => String(item || "").trim()).filter(Boolean).slice(0, limit);
  }

  async createHandoff(organizationId, locationId, user, payload = {}) {
    const summary = String(payload.summary || "").trim();
    if (summary.length < 10) throw new Error("Shift summary must contain at least 10 characters.");
    const allowedShifts = new Set(["opening", "lunch", "dinner", "closing"]);
    const shift = allowedShifts.has(payload.shift) ? payload.shift : "closing";
    const now = new Date().toISOString();
    const handoff = {
      id: `handoff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      organizationId, locationId, shift, summary: summary.slice(0, 1200),
      highlights: this.normalizeList(payload.highlights),
      needsAttention: this.normalizeList(payload.needsAttention, 4),
      authorId: user?.id || null,
      authorName: user?.name || user?.displayName || user?.email || "Manager",
      createdAt: now, updatedAt: now, acknowledgements: []
    };
    await this.database.create("shiftHandoffs", handoff);
    if (this.operationsFeedService) await this.operationsFeedService.record({ organizationId, locationId, category: "handoffs", type: "handoff", title: `${shift.charAt(0).toUpperCase()+shift.slice(1)} shift handoff posted`, detail: summary, actor: handoff.authorName, occurredAt: now });
    return handoff;
  }

  async acknowledgeHandoff(organizationId, handoffId, user) {
    const updated = await this.database.mutate(database => {
      database.shiftHandoffs ||= [];
      const handoff = database.shiftHandoffs.find(item => item.id === handoffId && item.organizationId === organizationId);
      if (!handoff) return null;
      handoff.acknowledgements ||= [];
      const userId = user?.id || user?.email || "manager";
      const existing = handoff.acknowledgements.find(item => item.userId === userId);
      if (!existing) handoff.acknowledgements.push({ userId, name: user?.name || user?.displayName || user?.email || "Manager", acknowledgedAt: new Date().toISOString() });
      handoff.updatedAt = new Date().toISOString();
      return handoff;
    });
    if (updated && this.operationsFeedService) await this.operationsFeedService.record({ organizationId, locationId: updated.locationId, category: "handoffs", type: "acknowledgement", title: "Shift handoff acknowledged", detail: `${user?.name || user?.email || "Manager"} acknowledged the ${updated.shift} handoff.`, actor: user?.name || user?.email || "Manager" });
    return updated;
  }

  async snapshot(organizationId, locationId) {
    const db = await this.database.read();
    const location = (db.locations || []).find(item => item.id === locationId && item.organizationId === organizationId);
    if (!location) return null;

    const now = new Date();
    const localDay = new Intl.DateTimeFormat("en-CA", { timeZone: location.timezone || "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const isToday = value => {
      if (!value) return false;
      try { return new Intl.DateTimeFormat("en-CA", { timeZone: location.timezone || "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)) === localDay; }
      catch { return false; }
    };

    const reservations = (db.reservations || []).filter(item => item.locationId === locationId && !["cancelled", "no_show"].includes(item.status));
    const todaysReservations = reservations.filter(item => isToday(item.reservationTime));
    const todaysCovers = todaysReservations.reduce((sum, item) => sum + Number(item.partySize || 0), 0);
    const employees = [...(db.staff || []), ...(db.employees || [])].filter(item => item.locationId === locationId);
    const scheduled = employees.filter(item => ["active", "scheduled", "working"].includes(item.status || item.employmentStatus || "active")).length;
    const employeeIds = new Set(employees.map(item => item.id));
    const pendingPto = (db.ptoRequests || []).filter(item => employeeIds.has(item.employeeId) && item.status === "pending").length;
    const inventory = (db.inventoryItems || []).filter(item => item.locationId === locationId);
    const lowInventory = inventory.filter(item => Number(item.onHand || 0) <= Number(item.par || 0) * 0.6).sort((a,b) => (a.onHand/a.par)-(b.onHand/b.par));
    const openMaintenance = (db.maintenanceTickets || []).filter(item => item.locationId === locationId && !["closed", "completed"].includes(item.status));
    const latestHandoff = (db.shiftHandoffs || [])
      .filter(item => item.organizationId === organizationId && item.locationId === locationId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;

    const historicalRevenue = Number(location.commandCenterBaseline?.lastYearRevenue || 18432);
    const lastWeekRevenue = Number(location.commandCenterBaseline?.lastWeekRevenue || 17980);
    const forecastRevenue = Math.round(Math.max(historicalRevenue * 1.074, lastWeekRevenue * 1.08));
    const projectedLabor = Number(location.commandCenterBaseline?.projectedLabor || 26.1);
    const attentionCount = lowInventory.slice(0, 2).length + openMaintenance.length + pendingPto;
    const handoffAgeHours = latestHandoff ? Math.max(0, (now - new Date(latestHandoff.createdAt || now)) / 36e5) : null;
    const readinessComponents = [
      { key: "staffing", label: "Staffing", score: Math.max(55, Math.min(100, 92 - pendingPto * 6 + (scheduled >= 8 ? 6 : scheduled >= 4 ? 0 : -12))), weight: 24, detail: scheduled ? `${scheduled} active team members · ${pendingPto} PTO pending` : "No active staffing signal is available", impact: pendingPto ? "Manager review needed" : "Coverage signal stable" },
      { key: "reservations", label: "Reservations", score: todaysReservations.length >= 10 ? 96 : todaysReservations.length >= 4 ? 88 : todaysReservations.length ? 78 : 72, weight: 18, detail: `${todaysReservations.length} bookings · ${todaysCovers} covers`, impact: todaysReservations.length ? "Demand visible" : "Confirm walk-in plan" },
      { key: "inventory", label: "Inventory", score: Math.max(45, 100 - lowInventory.length * 14), weight: 20, detail: lowInventory.length ? `${lowInventory.length} item${lowInventory.length === 1 ? "" : "s"} below operating threshold` : "No low-stock items detected", impact: lowInventory.length ? "Replenishment needed" : "Pars protected" },
      { key: "equipment", label: "Equipment", score: Math.max(40, 100 - openMaintenance.length * 18), weight: 14, detail: openMaintenance.length ? `${openMaintenance.length} open maintenance item${openMaintenance.length === 1 ? "" : "s"}` : "No open maintenance items", impact: openMaintenance.length ? "Service risk present" : "Systems clear" },
      { key: "labor", label: "Labor", score: Math.max(50, Math.min(100, Math.round(100 - Math.max(0, projectedLabor - 24) * 4))), weight: 16, detail: `${projectedLabor.toFixed(1)}% projected labor`, impact: projectedLabor > 28 ? "Above target" : "Within target" },
      { key: "handoff", label: "Shift handoff", score: latestHandoff ? (handoffAgeHours <= 16 ? 100 : handoffAgeHours <= 30 ? 84 : 70) : 62, weight: 8, detail: latestHandoff ? `${latestHandoff.shift} note posted ${Math.round(handoffAgeHours)}h ago` : "No recent handoff is available", impact: latestHandoff ? "Context transferred" : "Post shift context" }
    ];
    const readiness = Math.max(55, Math.min(98, Math.round(readinessComponents.reduce((sum, item) => sum + item.score * item.weight, 0) / readinessComponents.reduce((sum, item) => sum + item.weight, 0))));
    const weakestComponent = [...readinessComponents].sort((a, b) => a.score - b.score)[0];
    const strongestComponent = [...readinessComponents].sort((a, b) => b.score - a.score)[0];

    const recommendationParts = [];
    if (lowInventory[0]) recommendationParts.push(`${lowInventory[0].name} is below its operating par; confirm replenishment before dinner.`);
    if (pendingPto) recommendationParts.push(`${pendingPto} PTO request${pendingPto === 1 ? " is" : "s are"} awaiting a manager decision.`);
    if (todaysReservations.length > 0) recommendationParts.push(`${todaysReservations.length} reservations representing ${todaysCovers} covers are currently booked.`);
    if (!recommendationParts.length) recommendationParts.push("Core operating signals are stable. Review staffing and prep before service begins.");

    return {
      location: { id: location.id, name: location.name, timezone: location.timezone || "America/New_York", latitude: 40.1784, longitude: -74.0218 },
      readiness: {
        score: readiness,
        status: readiness >= 90 ? "Ready for service" : readiness >= 75 ? "Review before service" : "Action required",
        attentionCount,
        components: readinessComponents,
        strongest: strongestComponent?.label || null,
        weakest: weakestComponent?.label || null,
        summary: `${strongestComponent?.label || "Core operations"} is the strongest signal. ${weakestComponent?.label || "One area"} offers the clearest opportunity to improve readiness.`,
        nextAction: weakestComponent?.key === "inventory" && lowInventory[0] ? `Confirm replenishment for ${lowInventory[0].name} before the next service period.`
          : weakestComponent?.key === "equipment" && openMaintenance[0] ? `Assign or escalate ${openMaintenance[0].title || "the leading maintenance item"}.`
          : weakestComponent?.key === "staffing" && pendingPto ? `Resolve ${pendingPto} pending PTO request${pendingPto === 1 ? "" : "s"} and verify coverage.`
          : weakestComponent?.key === "handoff" ? "Post a concise shift handoff so the next manager starts with current context."
          : weakestComponent?.key === "reservations" ? "Review reservations and establish the expected walk-in and section plan."
          : "Review labor deployment against forecast demand before service."
      },
      business: { lastYearRevenue: historicalRevenue, lastWeekRevenue, forecastRevenue, forecastChange: Number(((forecastRevenue / historicalRevenue - 1) * 100).toFixed(1)), lastYearGuests: 624, averageCheck: 29.54, historicalLabor: 24.8 },
      operation: { reservations: todaysReservations.length, covers: todaysCovers, scheduled, pendingPto, projectedLabor },
      attention: [
        ...lowInventory.slice(0, 2).map(item => ({ type: "inventory", priority: "high", title: `${item.name} inventory is low`, detail: `${item.onHand} ${item.unit || "units"} on hand · par ${item.par}` })),
        ...openMaintenance.slice(0, 2).map(item => ({ type: "equipment", priority: "high", title: item.title || "Open maintenance item", detail: item.description || item.status })),
        ...(pendingPto ? [{ type: "workforce", priority: "normal", title: `${pendingPto} PTO request${pendingPto === 1 ? "" : "s"} pending`, detail: "Manager decision required" }] : [])
      ].slice(0, 4),
      handoff: latestHandoff ? {
        id: latestHandoff.id, shift: latestHandoff.shift, summary: latestHandoff.summary,
        highlights: latestHandoff.highlights || [], needsAttention: latestHandoff.needsAttention || [],
        authorName: latestHandoff.authorName || "Manager", createdAt: latestHandoff.createdAt,
        acknowledgements: latestHandoff.acknowledgements || []
      } : null,
      recommendation: { text: recommendationParts.join(" "), confidence: lowInventory.length || todaysReservations.length ? "High" : "Medium" },
      generatedAt: now.toISOString(),
      dataMode: "live-operational-with-pilot-financial-baseline"
    };
  }
}

module.exports = CommandCenterService;
