(function () {
  "use strict";
  class BlueCurrentCommandActionInboxEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("CommandActionInboxEngine requires EventBus and AppState.");
      this.eventBus = eventBus; this.appState = appState; this.snapshotValue = null; this.timer = null;
      ["unified-command:updated", "guided-shift:updated", "operator-copilot:updated", "autonomous-policy:updated", "executive-workflow:updated", "post-launch-value:updated", "state:reset"].forEach(name => eventBus.on(name, () => this.schedule(name)));
    }
    schedule(reason) { clearTimeout(this.timer); this.timer = setTimeout(() => this.refresh({ reason }), 80); }
    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const items = this.collect(state).sort((a,b) => b.score - a.score);
      const snapshot = { id:`action-inbox-${Date.now()}`, capturedAt:new Date().toISOString(), reason, items, total:items.length, urgent:items.filter(i=>i.priority==="urgent").length, approvals:items.filter(i=>i.type==="approval").length, handoffs:items.filter(i=>i.type==="handoff").length, issues:items.filter(i=>i.type==="issue").length };
      this.snapshotValue = snapshot;
      const history = Array.isArray(state.commandActionInboxHistory) ? state.commandActionInboxHistory : [];
      this.appState.update({ commandActionInbox:snapshot, commandActionInboxHistory:[snapshot,...history].slice(0,50) });
      this.eventBus.emit("command-action-inbox:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }
    collect(state) {
      const resolved = new Set(state.commandActionInboxResolved || []); const items=[];
      const add = item => { if (item && !resolved.has(item.id)) items.push(item); };
      (state.operatorCopilot?.bundle?.actions || []).forEach((action, index) => add({ id:`approval-${action.id||index}`, type:"approval", priority:index===0?"urgent":"high", title:action.title||"Approve operating action", detail:action.instruction||"Review the recommended action.", owner:action.owner||"Manager", impact:Number(action.profitImpact||0), sourceId:action.sourceId||"operatorCopilotCenter", raw:action, score:1000-index*50+Number(action.profitImpact||0) }));
      (state.guidedShiftHandoffs || []).filter(h=>h.status!=="complete").forEach((handoff,index)=>add({ id:`handoff-${handoff.id||index}`, type:"handoff", priority:"high", title:`Handoff to ${handoff.owner||"next manager"}`, detail:handoff.note||"Review the shift handoff.", owner:handoff.owner||"Next manager", impact:0, sourceId:"guidedShiftCenter", raw:handoff, score:700-index }));
      (state.postLaunchValue?.issues || state.postLaunchIssues || []).filter(i=>i.status!=="resolved").forEach((issue,index)=>add({ id:`issue-${issue.id||index}`, type:"issue", priority:/blocking|critical/i.test(issue.severity||"")?"urgent":"watch", title:issue.title||"Resolve operating issue", detail:issue.detail||issue.description||"Review the open issue.", owner:issue.owner||"Operations", impact:Number(issue.valueAtRisk||0), sourceId:"postLaunchValueCenter", raw:issue, score:(/blocking|critical/i.test(issue.severity||"")?900:500)-index }));
      return items;
    }
    resolve(id, actor="Manager") { const state=this.appState.getState(); const resolved=Array.from(new Set([id,...(state.commandActionInboxResolved||[])])).slice(0,200); this.appState.update({commandActionInboxResolved:resolved}); this.eventBus.emit("command-action-inbox:item-resolved",{id,actor,resolvedAt:new Date().toISOString()}); return this.refresh({reason:"item-resolved"}); }
    approve(item, actor="Manager") { if (!item) return this.snapshot(); this.eventBus.emit("restaurant-performance:action-approved",{action:item.raw||item,performance:this.appState.get("restaurantPerformance"),approvedAt:new Date().toISOString(),source:"command-action-inbox",actor}); this.eventBus.emit("portfolio-intelligence:recommendation-approved",{recommendation:{...(item.raw||item),action:item.detail},approvedAt:new Date().toISOString(),source:"command-action-inbox",actor}); return this.resolve(item.id,actor); }
    snapshot(){return structuredClone(this.snapshotValue||this.refresh({reason:"initial"}));}
  }
  window.BlueCurrentCommandActionInboxEngine=BlueCurrentCommandActionInboxEngine;
})();
