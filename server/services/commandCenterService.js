"use strict";

class CommandCenterService {
  constructor(database) { this.database = database; }

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

    const historicalRevenue = Number(location.commandCenterBaseline?.lastYearRevenue || 18432);
    const lastWeekRevenue = Number(location.commandCenterBaseline?.lastWeekRevenue || 17980);
    const forecastRevenue = Math.round(Math.max(historicalRevenue * 1.074, lastWeekRevenue * 1.08));
    const projectedLabor = Number(location.commandCenterBaseline?.projectedLabor || 26.1);
    const attentionCount = lowInventory.slice(0, 2).length + openMaintenance.length + pendingPto;
    const readiness = Math.max(55, Math.min(98, Math.round(96 - attentionCount * 4 - Math.max(0, projectedLabor - 28))));

    const recommendationParts = [];
    if (lowInventory[0]) recommendationParts.push(`${lowInventory[0].name} is below its operating par; confirm replenishment before dinner.`);
    if (pendingPto) recommendationParts.push(`${pendingPto} PTO request${pendingPto === 1 ? " is" : "s are"} awaiting a manager decision.`);
    if (todaysReservations.length > 0) recommendationParts.push(`${todaysReservations.length} reservations representing ${todaysCovers} covers are currently booked.`);
    if (!recommendationParts.length) recommendationParts.push("Core operating signals are stable. Review staffing and prep before service begins.");

    return {
      location: { id: location.id, name: location.name, timezone: location.timezone || "America/New_York", latitude: 40.1784, longitude: -74.0218 },
      readiness: { score: readiness, status: readiness >= 90 ? "Ready for service" : readiness >= 75 ? "Review before service" : "Action required", attentionCount },
      business: { lastYearRevenue: historicalRevenue, lastWeekRevenue, forecastRevenue, forecastChange: Number(((forecastRevenue / historicalRevenue - 1) * 100).toFixed(1)), lastYearGuests: 624, averageCheck: 29.54, historicalLabor: 24.8 },
      operation: { reservations: todaysReservations.length, covers: todaysCovers, scheduled, pendingPto, projectedLabor },
      attention: [
        ...lowInventory.slice(0, 2).map(item => ({ type: "inventory", priority: "high", title: `${item.name} inventory is low`, detail: `${item.onHand} ${item.unit || "units"} on hand · par ${item.par}` })),
        ...openMaintenance.slice(0, 2).map(item => ({ type: "equipment", priority: "high", title: item.title || "Open maintenance item", detail: item.description || item.status })),
        ...(pendingPto ? [{ type: "workforce", priority: "normal", title: `${pendingPto} PTO request${pendingPto === 1 ? "" : "s"} pending`, detail: "Manager decision required" }] : [])
      ].slice(0, 4),
      recommendation: { text: recommendationParts.join(" "), confidence: lowInventory.length || todaysReservations.length ? "High" : "Medium" },
      generatedAt: now.toISOString(),
      dataMode: "live-operational-with-pilot-financial-baseline"
    };
  }
}

module.exports = CommandCenterService;
