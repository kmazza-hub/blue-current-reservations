"use strict";

class AiRestaurantBrainService {
  constructor(database, auditService, realtimeHub) {
    this.database = database;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
  }

  clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, Math.round(value)));
  }

  recommendationId(locationId, key) {
    return `air_${locationId}_${key}`;
  }

  async buildSignals(locationId) {
    const db = await this.database.read();
    const tables = (db.tables || []).filter(item => item.locationId === locationId);
    const activeTables = tables.filter(item => ["occupied", "seated", "dining"].includes(item.status));
    const waitlist = (db.waitlist || []).filter(item => item.locationId === locationId && !["seated", "cancelled"].includes(item.status));
    const reservations = (db.reservations || []).filter(item => item.locationId === locationId && !["cancelled", "completed"].includes(item.status));
    const tickets = (db.kitchenTickets || []).filter(item => item.locationId === locationId && !["served", "cancelled"].includes(item.status));
    const staff = (db.staff || []).filter(item => item.locationId === locationId && item.status !== "off");
    const flows = (db.serviceFlows || []).filter(item => item.locationId === locationId && !["closed", "completed"].includes(item.stage));
    const stations = (db.kitchenStations || []).filter(item => item.locationId === locationId);

    const now = Date.now();
    const ticketAge = ticket => Math.max(0, Math.floor((now - new Date(ticket.createdAt).getTime()) / 60000));
    const overdueTickets = tickets.filter(ticket => ticketAge(ticket) > Number(ticket.targetMinutes || 18));
    const readyTickets = tickets.filter(ticket => ticket.status === "ready");
    const avgTicketAge = tickets.length
      ? Math.round(tickets.reduce((sum, ticket) => sum + ticketAge(ticket), 0) / tickets.length)
      : 0;

    const stationLoads = stations.map(station => {
      const activeItems = tickets.flatMap(ticket => ticket.items || [])
        .filter(item => item.stationId === station.id && ["received", "cooking"].includes(item.status)).length;
      return {
        id: station.id,
        name: station.name,
        load: activeItems,
        capacity: Number(station.capacity || 1),
        utilization: Math.round(activeItems / Number(station.capacity || 1) * 100)
      };
    });

    const busiestStation = stationLoads.sort((a, b) => b.utilization - a.utilization)[0] || {
      name: "Kitchen", utilization: 0, load: 0, capacity: 1
    };

    const serverLoads = staff.filter(item => item.role === "server").map(server => {
      const assigned = activeTables.filter(table => table.serverId === server.id || table.serverName === server.name).length;
      const ready = readyTickets.filter(ticket => ticket.serverId === server.id || ticket.serverName === server.name).length;
      return { id: server.id, name: server.name, assigned, ready, score: assigned * 18 + ready * 22 };
    }).sort((a, b) => b.score - a.score);

    const riskFlows = flows.filter(flow => ["high", "critical"].includes(flow.risk));
    const occupancy = tables.length ? Math.round(activeTables.length / tables.length * 100) : 0;

    return {
      tables, activeTables, waitlist, reservations, tickets, staff, flows,
      overdueTickets, readyTickets, avgTicketAge, stationLoads,
      busiestStation, serverLoads, riskFlows, occupancy
    };
  }

  makeRecommendation({ id, category, title, action, explanation, confidence, impact, severity, signals, createdAt }) {
    return {
      id,
      category,
      title,
      action,
      explanation,
      confidence: this.clamp(confidence, 1, 99),
      impact,
      severity,
      signals,
      status: "active",
      createdAt: createdAt || new Date().toISOString(),
      expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString()
    };
  }

  generate(locationId, signals) {
    const output = [];

    if (signals.busiestStation.utilization >= 75) {
      output.push(this.makeRecommendation({
        id: this.recommendationId(locationId, "kitchen-pace"),
        category: "kitchen",
        title: `Protect ${signals.busiestStation.name} throughput`,
        action: signals.busiestStation.utilization >= 100
          ? "Hold new entrée fires for 4 minutes"
          : "Stagger the next two entrée fires",
        explanation: `${signals.busiestStation.name} is at ${signals.busiestStation.utilization}% modeled utilization with ${signals.overdueTickets.length} overdue ticket${signals.overdueTickets.length === 1 ? "" : "s"}.`,
        confidence: 76 + Math.min(20, Math.floor(signals.busiestStation.utilization / 8)),
        impact: { label: "Expected ticket-time improvement", value: `${Math.min(24, 8 + signals.overdueTickets.length * 4)}%` },
        severity: signals.busiestStation.utilization >= 100 ? "critical" : "high",
        signals: [
          { label: "Station utilization", value: `${signals.busiestStation.utilization}%` },
          { label: "Average ticket age", value: `${signals.avgTicketAge}m` },
          { label: "Overdue tickets", value: String(signals.overdueTickets.length) }
        ]
      }));
    }

    if (signals.readyTickets.length >= 2) {
      output.push(this.makeRecommendation({
        id: this.recommendationId(locationId, "expo-runner"),
        category: "staff",
        title: "Clear the expo queue",
        action: "Assign the next available server as food runner",
        explanation: `${signals.readyTickets.length} tickets are ready and waiting. Immediate pickup protects food quality and service pace.`,
        confidence: 87 + Math.min(10, signals.readyTickets.length),
        impact: { label: "Expected pickup-time improvement", value: `${Math.min(35, 12 + signals.readyTickets.length * 6)}%` },
        severity: signals.readyTickets.length >= 4 ? "critical" : "high",
        signals: [
          { label: "Ready tickets", value: String(signals.readyTickets.length) },
          { label: "Expo pressure", value: signals.readyTickets.length >= 4 ? "Critical" : "Elevated" },
          { label: "Service risk", value: String(signals.riskFlows.length) }
        ]
      }));
    }

    const busiestServer = signals.serverLoads[0];
    const lightestServer = [...signals.serverLoads].sort((a, b) => a.score - b.score)[0];
    if (busiestServer && lightestServer && busiestServer.id !== lightestServer.id && busiestServer.score - lightestServer.score >= 20) {
      output.push(this.makeRecommendation({
        id: this.recommendationId(locationId, "rebalance-server"),
        category: "staff",
        title: "Rebalance the next table",
        action: `Route the next eligible table from ${busiestServer.name} to ${lightestServer.name}`,
        explanation: `${busiestServer.name} carries the highest modeled workload while ${lightestServer.name} has available capacity.`,
        confidence: 82,
        impact: { label: "Expected workload improvement", value: "18%" },
        severity: "medium",
        signals: [
          { label: busiestServer.name, value: `${busiestServer.assigned} tables · ${busiestServer.ready} ready` },
          { label: lightestServer.name, value: `${lightestServer.assigned} tables · ${lightestServer.ready} ready` },
          { label: "Workload gap", value: String(busiestServer.score - lightestServer.score) }
        ]
      }));
    }

    if (signals.waitlist.length && (signals.busiestStation.utilization >= 85 || signals.riskFlows.length >= 2)) {
      output.push(this.makeRecommendation({
        id: this.recommendationId(locationId, "delay-seating"),
        category: "seating",
        title: "Pace the next seating",
        action: "Delay the next seating by 4 minutes",
        explanation: `Kitchen pressure and ${signals.riskFlows.length} at-risk service flow${signals.riskFlows.length === 1 ? "" : "s"} make immediate seating likely to increase guest delays.`,
        confidence: 90,
        impact: { label: "Expected guest-wait reduction", value: "16%" },
        severity: "high",
        signals: [
          { label: "Waitlist parties", value: String(signals.waitlist.length) },
          { label: "Kitchen utilization", value: `${signals.busiestStation.utilization}%` },
          { label: "At-risk tables", value: String(signals.riskFlows.length) }
        ]
      }));
    }

    const vip = signals.reservations.find(item => item.vip || item.isVip || String(item.notes || "").toLowerCase().includes("vip"));
    if (vip) {
      output.push(this.makeRecommendation({
        id: this.recommendationId(locationId, "vip-touch"),
        category: "guest_experience",
        title: "Prepare the VIP arrival",
        action: `Assign a manager touchpoint for ${vip.guestName || vip.name || "the upcoming VIP party"}`,
        explanation: "A proactive manager greeting and table readiness check can protect the highest-value guest experience.",
        confidence: 92,
        impact: { label: "Guest-experience protection", value: "High" },
        severity: "medium",
        signals: [
          { label: "Reservation", value: vip.guestName || vip.name || "VIP party" },
          { label: "Party size", value: String(vip.partySize || vip.guests || "—") },
          { label: "Status", value: vip.status || "confirmed" }
        ]
      }));
    }

    if (!output.length) {
      output.push(this.makeRecommendation({
        id: this.recommendationId(locationId, "maintain"),
        category: "operations",
        title: "Maintain current operating plan",
        action: "Continue current seating and production pace",
        explanation: "No material bottleneck is currently above the intervention threshold.",
        confidence: 88,
        impact: { label: "Operating condition", value: "Stable" },
        severity: "low",
        signals: [
          { label: "Occupancy", value: `${signals.occupancy}%` },
          { label: "Average ticket age", value: `${signals.avgTicketAge}m` },
          { label: "At-risk tables", value: String(signals.riskFlows.length) }
        ]
      }));
    }

    return output;
  }

  health(signals) {
    const kitchen = this.clamp(100 - signals.overdueTickets.length * 9 - Math.max(0, signals.avgTicketAge - 12) * 2, 35, 100);
    const service = this.clamp(100 - signals.riskFlows.length * 11, 35, 100);
    const staffGap = signals.serverLoads.length > 1
      ? Math.max(...signals.serverLoads.map(item => item.score)) - Math.min(...signals.serverLoads.map(item => item.score))
      : 0;
    const staff = this.clamp(100 - Math.floor(staffGap / 2), 40, 100);
    const reservations = this.clamp(98 - Math.max(0, signals.waitlist.length - 3) * 4, 55, 100);
    const diningRoom = this.clamp(100 - Math.max(0, signals.occupancy - 92), 60, 100);
    const overall = Math.round(kitchen * .28 + service * .27 + staff * .18 + reservations * .12 + diningRoom * .15);
    return { overall, kitchen, service, staff, reservations, diningRoom };
  }

  async snapshot(locationId) {
    const signals = await this.buildSignals(locationId);
    const generated = this.generate(locationId, signals);
    const db = await this.database.read();
    const stored = (db.aiRecommendations || []).filter(item => item.locationId === locationId);
    const decisions = (db.aiDecisionHistory || []).filter(item => item.locationId === locationId).slice(-25).reverse();

    const statusById = new Map(stored.map(item => [item.id, item]));
    const recommendations = generated.map(item => {
      const previous = statusById.get(item.id);
      return {
        ...item,
        organizationId: previous?.organizationId,
        locationId,
        status: previous?.status || "active",
        decisionNote: previous?.decisionNote || "",
        decidedAt: previous?.decidedAt || null
      };
    }).filter(item => item.status === "active" || item.status === "snoozed");

    return {
      generatedAt: new Date().toISOString(),
      recommendations,
      health: this.health(signals),
      signals: {
        occupancy: signals.occupancy,
        activeTables: signals.activeTables.length,
        waitlist: signals.waitlist.length,
        activeTickets: signals.tickets.length,
        overdueTickets: signals.overdueTickets.length,
        readyTickets: signals.readyTickets.length,
        averageTicketAge: signals.avgTicketAge,
        busiestStation: signals.busiestStation,
        atRiskTables: signals.riskFlows.length
      },
      decisions
    };
  }

  async decide(recommendationId, input, actor, organizationId) {
    const status = ["accepted", "rejected", "snoozed"].includes(input.status) ? input.status : "rejected";
    const locationId = input.locationId;
    const record = {
      id: `aid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      recommendationId,
      organizationId,
      locationId,
      status,
      decisionNote: String(input.note || ""),
      actor,
      createdAt: new Date().toISOString(),
      expectedImpact: input.expectedImpact || null
    };

    await this.database.mutate(db => {
      db.aiRecommendations ||= [];
      db.aiDecisionHistory ||= [];
      const existing = db.aiRecommendations.find(item => item.id === recommendationId);
      if (existing) Object.assign(existing, { status, decisionNote: record.decisionNote, decidedAt: record.createdAt });
      else db.aiRecommendations.push({
        id: recommendationId, organizationId, locationId, status,
        decisionNote: record.decisionNote, decidedAt: record.createdAt
      });
      db.aiDecisionHistory.push(record);
      return record;
    });

    await this.auditService.record({
      organizationId,
      actor,
      action: `AI recommendation ${status}: ${recommendationId}`,
      category: "ai_decision"
    });

    this.realtimeHub.publish("ai:recommendation-decided", record);
    return record;
  }

  async reset(locationId, actor, organizationId) {
    await this.database.mutate(db => {
      db.aiRecommendations = (db.aiRecommendations || []).filter(item => item.locationId !== locationId);
      return true;
    });
    await this.auditService.record({
      organizationId, actor, action: "AI recommendations regenerated", category: "ai_decision"
    });
    this.realtimeHub.publish("ai:recommendations-refreshed", { locationId, organizationId });
    return this.snapshot(locationId);
  }
}

module.exports = AiRestaurantBrainService;
