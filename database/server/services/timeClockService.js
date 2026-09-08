"use strict";

const crypto = require("crypto");

class TimeClockService {
  constructor(database, auditService, realtimeHub) {
    this.database = database;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
  }

  round(value, precision = 2) { const factor = 10 ** precision; return Math.round(Number(value || 0) * factor) / factor; }
  recordId(prefix) { return `${prefix}_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`; }
  hoursBetween(start, end) { return Math.max(0, (new Date(end) - new Date(start)) / 3600000); }
  overlapHours(start, end, windowStart, windowEnd) {
    const from = Math.max(new Date(start).getTime(), new Date(windowStart).getTime());
    const to = Math.min(new Date(end).getTime(), new Date(windowEnd).getTime());
    return Number.isFinite(from) && Number.isFinite(to) ? Math.max(0, (to - from) / 3600000) : 0;
  }

  async snapshot(organizationId, locationId) {
    const db = await this.database.read();
    const location = (db.locations || []).find(item => item.id === locationId && item.organizationId === organizationId);
    if (Array.isArray(db.locations) && !location) { const error = new Error("Location is not available to this organization."); error.statusCode = 404; throw error; }
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const employees = (db.employees || []).filter(item => item.organizationId === organizationId && item.locationId === locationId && item.status !== "inactive");
    const cards = (db.employeeTimecards || []).filter(item => item.organizationId === organizationId && item.locationId === locationId);
    const breaks = (db.employeeBreaks || []).filter(item => item.organizationId === organizationId && item.locationId === locationId);
    const policy = (db.timeClockPolicies || []).find(item => item.organizationId === organizationId && item.locationId === locationId) || { dailyOvertimeHours: 8, weeklyOvertimeHours: 40, breakReminderMinutes: 300 };

    const enrich = (card, endTime) => {
      const employee = employees.find(item => item.id === card.employeeId) || {};
      const cardBreaks = breaks.filter(item => item.timecardId === card.id);
      const activeBreak = cardBreaks.find(item => item.status === "active" && !item.end);
      // V100.3.14 — "Today" is the overlap with the current local service day.
      // Old open punches stay visible as review exceptions without inflating live
      // labor hours, cost, or overtime exposure across multiple calendar days.
      const completedBreakHours = cardBreaks.filter(item => item.end && !item.paid).reduce((sum, item) => sum + this.overlapHours(item.start, item.end, todayStart, endTime), 0);
      const currentBreakHours = activeBreak && !activeBreak.paid ? this.overlapHours(activeBreak.start, endTime, todayStart, endTime) : 0;
      const workedHours = this.round(Math.max(0, this.overlapHours(card.clockIn, endTime, todayStart, endTime) - completedBreakHours - currentBreakHours));
      const requiresReview = !card.clockOut && new Date(card.clockIn).getTime() < todayStart.getTime();
      const projectedWeeklyHours = this.round(Number(employee.weeklyHours || 0) + workedHours);
      return { ...card, employeeName: employee.name || card.employeeId, role: employee.role || "Team member", department: employee.department || "Operations", hourlyRate: Number(employee.hourlyRate || 0), onBreak: Boolean(activeBreak), activeBreakId: activeBreak ? activeBreak.id : null, workedHours, laborCost: this.round(workedHours * Number(employee.hourlyRate || 0)), projectedWeeklyHours, overtimeRisk: !requiresReview && projectedWeeklyHours >= Number(policy.weeklyOvertimeHours || 40) - 1, requiresReview, reviewReason: requiresReview ? "Open punch began before today" : null };
    };

    const openCards = cards.filter(item => item.status === "active" && !item.clockOut).map(item => enrich(item, now));
    // V100.3.15 — an unresolved prior-day punch is a review record, not proof
    // that the employee is working now. Keep it available for correction while
    // excluding it from live staffing, coverage, attendance, and labor totals.
    const review = openCards.filter(item => item.requiresReview);
    const active = openCards.filter(item => !item.requiresReview);
    const todaysCards = cards.filter(item => new Date(item.clockIn).getTime() <= now.getTime() && (!item.clockOut || new Date(item.clockOut).getTime() >= todayStart.getTime()));
    const completed = todaysCards.filter(item => item.clockOut).map(item => enrich(item, new Date(item.clockOut)));
    const laborHours = this.round([...active, ...completed].reduce((sum, item) => sum + item.workedHours, 0));
    const laborCost = this.round([...active, ...completed].reduce((sum, item) => sum + item.laborCost, 0));

    return {
      generatedAt: now.toISOString(), locationId,
      summary: { employeesWorking: active.length, onBreak: active.filter(item => item.onBreak).length, laborHours, laborCost, overtimeRisk: active.filter(item => item.overtimeRisk).length, missedPunches: cards.filter(item => item.status === "needs_review").length + review.length },
      employees, active, review, completed, timecards: todaysCards.map(card => openCards.find(item => item.id === card.id) || card).reverse(), policy,
      corrections: (db.timeClockCorrections || []).filter(item => item.organizationId === organizationId && item.locationId === locationId).slice(-20).reverse()
    };
  }

  async clockIn(input, actor, organizationId) {
    let result;
    await this.database.mutate(db => {
      const employee = (db.employees || []).find(item => item.id === input.employeeId && item.organizationId === organizationId);
      if (!employee) throw new Error("Employee not found");
      if (!input.locationId || input.locationId !== employee.locationId) throw new Error("Employee and location do not match");
      if (input.pin !== undefined && String(employee.pin) !== String(input.pin)) throw new Error("Invalid PIN");
      if ((db.employeeTimecards || []).some(item => item.employeeId === employee.id && item.organizationId === organizationId && item.locationId === employee.locationId && item.status === "active" && !item.clockOut)) throw new Error("Employee is already clocked in");
      result = { id: this.recordId("tc"), organizationId, locationId: employee.locationId, employeeId: employee.id, clockIn: new Date().toISOString(), clockOut: null, status: "active", source: input.source || "kiosk", createdAt: new Date().toISOString() };
      db.employeeTimecards ||= []; db.employeeTimecards.push(result); return result;
    });
    await this.auditService.record({ organizationId, actor, action: `Clocked in ${result.employeeId}`, category: "timeclock" });
    this.realtimeHub.publish("timeclock:clocked-in", result); return result;
  }

  async clockOut(input, actor, organizationId) {
    let result;
    await this.database.mutate(db => {
      const employee = (db.employees || []).find(item => item.id === input.employeeId && item.organizationId === organizationId);
      if (!employee) throw new Error("Employee not found");
      const card = (db.employeeTimecards || []).find(item => item.employeeId === input.employeeId && item.organizationId === organizationId && item.locationId === employee.locationId && item.status === "active" && !item.clockOut);
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
      const employee = (db.employees || []).find(item => item.id === input.employeeId && item.organizationId === organizationId);
      if (!employee) throw new Error("Employee not found");
      const card = (db.employeeTimecards || []).find(item => item.employeeId === input.employeeId && item.organizationId === organizationId && item.locationId === employee.locationId && item.status === "active" && !item.clockOut);
      if (!card) throw new Error("No active timecard");
      if ((db.employeeBreaks || []).some(item => item.timecardId === card.id && item.status === "active" && !item.end)) throw new Error("Break already active");
      result = { id: this.recordId("break"), organizationId, locationId: card.locationId, timecardId: card.id, employeeId: input.employeeId, start: new Date().toISOString(), end: null, paid: Boolean(input.paid), status: "active" };
      db.employeeBreaks ||= []; db.employeeBreaks.push(result); return result;
    });
    await this.auditService.record({ organizationId, actor, action: `Break started ${result.employeeId}`, category: "timeclock" });
    this.realtimeHub.publish("timeclock:break-started", result); return result;
  }

  async endBreak(input, actor, organizationId) {
    let result;
    await this.database.mutate(db => {
      const employee = (db.employees || []).find(item => item.id === input.employeeId && item.organizationId === organizationId);
      if (!employee) throw new Error("Employee not found");
      const item = (db.employeeBreaks || []).find(entry => entry.employeeId === input.employeeId && entry.organizationId === organizationId && entry.locationId === employee.locationId && entry.status === "active" && !entry.end);
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
      if (input.clockOut !== undefined) card.clockOut = input.clockOut || null;
      if (input.status) card.status = input.status;

      const clockInAt = new Date(card.clockIn);
      const clockOutAt = card.clockOut ? new Date(card.clockOut) : null;
      if (!card.clockIn || Number.isNaN(clockInAt.getTime())) throw new Error("Valid clock-in time required");
      if (card.clockOut && Number.isNaN(clockOutAt.getTime())) throw new Error("Valid clock-out time required");
      if (clockOutAt && clockOutAt < clockInAt) throw new Error("Clock-out cannot be before clock-in");

      // V100.2.77 — recorded punch truth owns lifecycle status.
      // A clock-out cannot remain active; removing a clock-out must not imply the
      // employee is currently working. Incomplete corrected records require review.
      if (card.clockOut && card.status === "active") card.status = "completed";
      if (!card.clockOut && card.status === "completed") card.status = "needs_review";

      if (card.clockOut) {
        const activeBreaks = (db.employeeBreaks || []).filter(item => item.timecardId === card.id && item.status === "active" && !item.end);
        for (const activeBreak of activeBreaks) {
          const breakStartAt = new Date(activeBreak.start);
          if (Number.isNaN(breakStartAt.getTime()) || breakStartAt > clockOutAt) throw new Error("Clock-out cannot be before an active break start");
          activeBreak.end = card.clockOut;
          activeBreak.status = "completed";
        }
      }

      card.updatedAt = new Date().toISOString();
      result = { id: this.recordId("tcc"), organizationId, locationId: card.locationId, timecardId, employeeId: card.employeeId, before, after: { clockIn: card.clockIn, clockOut: card.clockOut, status: card.status }, reason: String(input.reason || "Manager correction"), actor, createdAt: new Date().toISOString() };
      db.timeClockCorrections ||= []; db.timeClockCorrections.push(result); return result;
    });
    await this.auditService.record({ organizationId, actor, action: `Timecard corrected ${timecardId}`, category: "timeclock" });
    this.realtimeHub.publish("timeclock:timecard-corrected", result); return result;
  }
}

module.exports = TimeClockService;
