(function () {
  "use strict";

  class BlueCurrentOperationalDigitalTwinEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("OperationalDigitalTwinEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.snapshotValue = null;
      this.history = [];
      this.maxHistory = 24;
      this.unsubscribers = [];
      this.refreshTimer = null;
      this.bind();
    }

    bind() {
      const refresh = () => this.scheduleRefresh();
      ["table:status-changed", "occupancy:updated", "context:captured", "reservation:created", "orchestration:workflow-list-updated"].forEach(name => {
        this.unsubscribers.push(this.eventBus.on(name, refresh));
      });
      this.unsubscribers.push(this.eventBus.on("state:reset", refresh));
    }

    scheduleRefresh() {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => this.refresh({ reason: "operational-event" }), 80);
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const context = state.operationalContext || {};
      const tables = this.buildTables(state.tables || []);
      const zones = this.buildZones(tables);
      const kitchen = this.buildKitchen(context, state);
      const staff = this.buildStaff(context, state);
      const forecast = this.buildForecast({ context, tables, kitchen, staff, state });
      const health = this.scoreHealth({ context, tables, kitchen, staff });

      const snapshot = {
        id: `twin-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        reason,
        locationId: state.selectedLocationId || "current-location",
        servicePeriod: context.servicePeriod || "dinner",
        health,
        tables,
        zones,
        kitchen,
        staff,
        forecast,
        summary: {
          occupiedTables: tables.filter(table => ["seated", "dining"].includes(table.status)).length,
          turningTables: tables.filter(table => table.status === "reset").length,
          availableTables: tables.filter(table => table.status === "available").length,
          reservedTables: tables.filter(table => table.status === "reserved").length,
          guestsInService: tables.reduce((sum, table) => sum + (["seated", "dining"].includes(table.status) ? table.partySize : 0), 0),
          pressureScore: Number(context.pressureScore || 0),
          activeWorkflows: Array.isArray(state.activeOrchestrationWorkflows) ? state.activeOrchestrationWorkflows.filter(item => item.status === "in-progress").length : 0
        }
      };

      this.snapshotValue = snapshot;
      this.history.unshift({ capturedAt: snapshot.capturedAt, health: snapshot.health, summary: snapshot.summary });
      this.history = this.history.slice(0, this.maxHistory);
      this.appState.update({ operationalDigitalTwin: snapshot, operationalDigitalTwinHistory: this.history.slice(0, 12) });
      this.eventBus.emit("digital-twin:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    snapshot() {
      return structuredClone(this.snapshotValue || this.refresh({ reason: "initial" }));
    }

    buildTables(sourceTables) {
      const fallback = Array.from({ length: 20 }, (_, index) => ({
        tableNumber: index + 1,
        capacity: [2, 4, 4, 6][index % 4],
        status: index < 11 ? "dining" : index < 14 ? "reserved" : index < 17 ? "reset" : "available"
      }));
      const tables = sourceTables.length ? sourceTables : fallback;
      return tables.map((table, index) => {
        const status = table.status || "available";
        const capacity = Number(table.capacity || table.seats || 4);
        const partySize = Number(table.guest?.partySize || (["seated", "dining"].includes(status) ? Math.max(1, capacity - (index % 2)) : 0));
        const elapsedMinutes = status === "dining" ? 28 + (index * 7) % 64 : status === "seated" ? 8 + (index * 3) % 18 : 0;
        const risk = status === "dining" && elapsedMinutes > 76 ? "high" : status === "dining" && elapsedMinutes > 58 ? "watch" : "normal";
        return {
          id: `table-${table.tableNumber || index + 1}`,
          tableNumber: Number(table.tableNumber || index + 1),
          capacity,
          partySize,
          status,
          zone: this.zoneFor(index),
          elapsedMinutes,
          predictedTurnMinutes: status === "dining" ? Math.max(4, 86 - elapsedMinutes) : status === "reset" ? 6 + (index % 5) : null,
          risk,
          vip: Boolean(table.guest?.vip),
          guestName: table.guest?.guestName || null
        };
      });
    }

    zoneFor(index) {
      return ["Main dining", "Bar", "Patio", "Private dining"][index % 4];
    }

    buildZones(tables) {
      return ["Main dining", "Bar", "Patio", "Private dining"].map(name => {
        const zoneTables = tables.filter(table => table.zone === name);
        const occupied = zoneTables.filter(table => ["seated", "dining"].includes(table.status)).length;
        return {
          name,
          tables: zoneTables.length,
          occupied,
          occupancyPercent: zoneTables.length ? Math.round(occupied / zoneTables.length * 100) : 0,
          atRisk: zoneTables.filter(table => table.risk !== "normal").length
        };
      });
    }

    buildKitchen(context, state) {
      const base = Number(context.kitchenLoad ?? state.kitchenLoad ?? 72);
      const stations = [
        { name: "Grill", offset: 7 },
        { name: "Sauté", offset: 12 },
        { name: "Garde manger", offset: -14 },
        { name: "Expo", offset: 3 }
      ].map((station, index) => {
        const load = Math.max(18, Math.min(99, base + station.offset + ((index * 3) % 5)));
        return {
          name: station.name,
          load,
          ticketMinutes: Math.round(7 + load * 0.13),
          status: load >= 90 ? "critical" : load >= 78 ? "watch" : "stable"
        };
      });
      return {
        load: Math.round(stations.reduce((sum, station) => sum + station.load, 0) / stations.length),
        stations,
        constrainedStation: [...stations].sort((a, b) => b.load - a.load)[0].name
      };
    }

    buildStaff(context, state) {
      const occupancy = Number(context.occupancyPercent ?? state.occupancyPercent ?? 0);
      const labor = Number(context.laborPercent ?? state.laborPercent ?? 18);
      const roles = [
        { role: "Servers", scheduled: 8, active: occupancy > 70 ? 8 : 7 },
        { role: "Bartenders", scheduled: 3, active: 3 },
        { role: "Hosts", scheduled: 3, active: 2 },
        { role: "Kitchen", scheduled: 10, active: labor > 21 ? 9 : 10 }
      ].map(item => ({ ...item, utilization: Math.min(99, Math.round((occupancy * .72) + (item.active / item.scheduled * 24))) }));
      return {
        laborPercent: labor,
        scheduled: roles.reduce((sum, role) => sum + role.scheduled, 0),
        active: roles.reduce((sum, role) => sum + role.active, 0),
        roles,
        pressureRole: [...roles].sort((a, b) => b.utilization - a.utilization)[0].role
      };
    }

    buildForecast({ context, tables, kitchen, staff, state }) {
      const waitlist = Number(context.waitlistCount ?? state.waitlistCount ?? 0);
      const turns = tables.filter(table => table.predictedTurnMinutes !== null && table.predictedTurnMinutes <= 30).length;
      const reservations = Array.isArray(state.reservations) ? state.reservations.length : 0;
      const expectedArrivals = Math.max(2, Math.min(18, Math.round(reservations * .08 + waitlist * .6)));
      const pressureDelta = expectedArrivals * 2 - turns * 3 + Math.max(0, kitchen.load - 78) * .35;
      return {
        horizonMinutes: 30,
        expectedArrivals,
        expectedTurns: turns,
        projectedKitchenLoad: Math.max(20, Math.min(99, Math.round(kitchen.load + pressureDelta * .45))),
        projectedOccupancy: Math.max(0, Math.min(100, Math.round(Number(context.occupancyPercent || state.occupancyPercent || 0) + pressureDelta))),
        likelyConstraint: kitchen.load >= 84 ? `${kitchen.constrainedStation} station` : staff.pressureRole,
        narrative: pressureDelta > 8 ? "Pressure is likely to rise without intervention." : pressureDelta < -5 ? "Capacity should improve over the next 30 minutes." : "The operation is projected to remain near its current pressure band."
      };
    }

    scoreHealth({ context, tables, kitchen, staff }) {
      const atRisk = tables.filter(table => table.risk !== "normal").length;
      const pressure = Number(context.pressureScore || 0);
      const score = Math.max(0, Math.min(100, Math.round(100 - pressure * .42 - atRisk * 4 - Math.max(0, kitchen.load - 76) * .55 - Math.max(0, staff.laborPercent - 20) * 2)));
      return { score, band: score >= 78 ? "healthy" : score >= 58 ? "watch" : score >= 38 ? "strained" : "critical" };
    }

    destroy() {
      clearTimeout(this.refreshTimer);
      this.unsubscribers.forEach(unsubscribe => unsubscribe());
    }
  }

  window.BlueCurrentOperationalDigitalTwinEngine = BlueCurrentOperationalDigitalTwinEngine;
})();
