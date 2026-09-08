"use strict";

class TimeClockService {
  constructor(database, auditService, realtimeHub) {
    this.database = database;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
  }

  round(value, precision = 2) { const factor = 10 ** precision; return Math.round(Number(value || 0) * factor) / factor; }
  hoursBetween(start, end) { return Math.max(0, (new Date(end) - new Date(start)) / 3600000); }

  async snapshot(organizationId, locationId = "loc_marina") {
    const db = await this.database.read();
    const now = new Date();
    const employees = (db.employees || []).filter(item => item.organizationId === organizationId && item.locationId === locationId && item.status !== "inactive");
    const cards = (db.employeeTimecards || []).filter(item => item.organizationId === organizationId && item.locationId === locationId);
    const breaks = (db.employeeBreaks || []).filter(item => item.organizationId === organizationId && item.locationId === locationId);
    const policy = (db.timeClockPolicies || []).find(item => item.organizationId === organizationId && item.locationId === locationId) || { dailyOvertimeHours: 8, weeklyOvertimeHours: 40, breakReminderMinutes: 300 };

    const enrich = (card, endTime) => {
      const employee = employees.find(item => item.id === card.employeeId) || {};
      const cardBreaks = breaks.filter(item => item.timecardId === card.id);
      const activeBreak = cardBreaks.find(item => item.status === "active" && !item.end);
      const completedBreakHours = cardBreaks.filter(item => item.end && !item.paid).reduce((sum, item) => sum + this.hoursBetween(item.start, item.end), 0);
      const currentBreakHours = activeBreak && !activeBreak.paid ? this.hoursBetween(activeBreak.start, endTime) : 0;
      const workedHours = this.round(this.hoursBetween(card.clockIn, endTime) - completedBreakHours - currentBreakHours);
      const projectedWeeklyHours = this.round(Number(employee.weeklyHours || 0) + workedHours);
      return { ...card, employeeName: employee.name || card.employeeId, role: employee.role || "Team member", department: employee.department || "Operations", hourlyRate: Number(employee.hourlyRate || 0), onBreak: Boolean(activeBreak), activeBreakId: activeBreak ? activeBreak.id : null, workedHours, laborCost: this.round(workedHours * Number(employee.hourlyRate || 0)), projectedWeeklyHours, overtimeRisk: projectedWeeklyHours >= Number(policy.weeklyOvertimeHours || 40) - 1 };
    };

    const active = cards.filter(item => item.status === "active" && !item.clockOut).map(item => enrich(item, now));
    const today = now.toISOString().slice(0, 10);
    const todaysCards = cards.filter(item => String(item.clockIn || "").slice(0, 10) === today);
    const completed = todaysCards.filter(item => item.clockOut).map(item => enrich(item, new Date(item.clockOut)));
    const laborHours = this.round([...active, ...completed].reduce((sum, item) => sum + item.workedHours, 0));
    const laborCost = this.round([...active, ...completed].reduce((sum, item) => sum + item.laborCost, 0));

    return {
      generatedAt: now.toISOString(), locationId,
      summary: { employeesWorking: active.length, onBreak: active.filter(item => item.onBreak).length, laborHours, laborCost, overtimeRisk: active.filter(item => item.overtimeRisk).length, missedPunches: cards.filter(item => item.status === "needs_review").length },
      employees, active, completed, timecards: todaysCards.slice().reverse(), policy,
      corrections: (db.timeClockCorrections || []).filter(item => item.organizationId === organizationId && item.locationId === locationId).slice(-20).reverse()
    };
  }

  async clockIn(input, actor, organizationId) {
    let result;
    await this.database.mutate(db => {
      const employee = (db.employees || []).find(item => item.id === input.employeeId && item.organizationId === organizationId);
      if (!employee) throw new Error("Employee not found");
      if (input.pin !== undefined && String(employee.pin) !== String(input.pin)) throw new Error("Invalid PIN");
      if ((db.employeeTimecards || []).some(item => item.employeeId === employee.id && item.status === "active" && !item.clockOut)) throw new Error("Employee is already clocked in");
      result = { id: `tc_${Date.now()}`, organizationId, locationId: input.locationId || employee.locationId, employeeId: employee.id, clockIn: new Date().toISOString(), clockOut: null, status: "active", source: input.source || "kiosk", createdAt: new Date().toISOString() };
      db.employeeTimecards ||= []; db.employeeTimecards.push(result); return result;
    });
    await this.auditService.record({ organizationId, actor, action: `Clocked in ${result.employeeId}`, category: "timeclock" });
    this.realtimeHub.publish("timeclock:clocked-in", result); return result;
  }

  async clockOut(input, actor, organizationId) {
    let result;
    await this.database.mutate(db => {
      const card = (db.employeeTimecards || []).find(item => item.employeeId === input.employeeId && item.organizationId === organizationId && item.status === "active" && !item.clockOut);
      if (!card) throw new Error("No active timecard");
      const activeBreak = (db.employeeBreaks || []).find(item => item.timecardId === card.id && item.status === "active" && !item.end);
      if (activeBreak) { activeBreak.end = new Date().toISOString(); activeBreak.status = "completed"; }
      card.clockOut = new Date().toISOString(); card.status = "completed"; card.updatedAt = new Date().toISOString(); result = card; return card;
    });
    await this.auditService.record({ organizationId, actor, action: `Clocked out ${result.employeeId}`, category: "timeclock" });
    this.realtimeHub.publish("timeclock:clocked-out", result); return result;
  }

  async startBreak(input, actor, organizationId) {
    let result;
    await this.database.mutate(db => {
      const card = (db.employeeTimecards || []).find(item => item.employeeId === input.employeeId && item.organizationId === organizationId && item.status === "active" && !item.clockOut);
      if (!card) throw new Error("No active timecard");
      if ((db.employeeBreaks || []).some(item => item.timecardId === card.id && item.status === "active" && !item.end)) throw new Error("Break already active");
      result = { id: `break_${Date.now()}`, organizationId, locationId: card.locationId, timecardId: card.id, employeeId: input.employeeId, start: new Date().toISOString(), end: null, paid: Boolean(input.paid), status: "active" };
      db.employeeBreaks ||= []; db.employeeBreaks.push(result); return result;
    });
    await this.auditService.record({ organizationId, actor, action: `Break started ${result.employeeId}`, category: "timeclock" });
    this.realtimeHub.publish("timeclock:break-started", result); return result;
  }

  async endBreak(input, actor, organizationId) {
    let result;
    await this.database.mutate(db => {
      const item = (db.employeeBreaks || []).find(entry => entry.employeeId === input.employeeId && entry.organizationId === organizationId && entry.status === "active" && !entry.end);
      if (!item) throw new Error("No active break");
      item.end = new Date().toISOString(); item.status = "completed"; result = item; return item;
    });
    await this.auditService.record({ organizationId, actor, action: `Break ended ${result.employeeId}`, category: "timeclock" });
    this.realtimeHub.publish("timeclock:break-ended", result); return result;
  }

  async correct(timecardId, input, actor, organizationId) {
    let result;
    await this.database.mutate(db => {
      const card = (db.employeeTimecards || []).find(item => item.id === timecardId && item.organizationId === organizationId);
      if (!card) throw new Error("Timecard not found");
      const before = { clockIn: card.clockIn, clockOut: card.clockOut, status: card.status };
      if (input.clockIn) card.clockIn = input.clockIn;
      if (input.clockOut !== undefined) card.clockOut = input.clockOut;
      if (input.status) card.status = input.status;
      card.updatedAt = new Date().toISOString();
      result = { id: `tcc_${Date.now()}`, organizationId, locationId: card.locationId, timecardId, employeeId: card.employeeId, before, after: { clockIn: card.clockIn, clockOut: card.clockOut, status: card.status }, reason: String(input.reason || "Manager correction"), actor, createdAt: new Date().toISOString() };
      db.timeClockCorrections ||= []; db.timeClockCorrections.push(result); return result;
    });
    await this.auditService.record({ organizationId, actor, action: `Timecard corrected ${timecardId}`, category: "timeclock" });
    this.realtimeHub.publish("timeclock:timecard-corrected", result); return result;
  }
}

module.exports = TimeClockService;
