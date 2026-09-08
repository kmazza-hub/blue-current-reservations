(function () {
  "use strict";
  function createBlueCurrentWorkforceFoundationModule(eventBus, appState, cloudFoundationModule) {
    const api = cloudFoundationModule?.api || new window.BlueCurrentCloudApi("");
    const byId = id => document.getElementById(id);
    let state = { employees: [], availability: [], ptoRequests: [], shiftTemplates: [], summary: {} };
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const esc = value => String(value ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    const title = value => String(value || "time off").replace(/\b\w/g, char => char.toUpperCase());

    function ptoCard(request) {
      const employee = state.employees.find(item => item.id === request.employeeId);
      const requestType = title(request.requestType || "time off");
      const submitted = request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "Unknown";
      const comment = request.managerComment ? `<small><b>Manager:</b> ${esc(request.managerComment)}</small>` : "";
      const controls = request.status === "pending" ? `<div class="wff-pto-decision"><label for="wff-comment-${esc(request.id)}">Manager comment <span>(optional)</span></label><textarea id="wff-comment-${esc(request.id)}" data-pto-comment="${esc(request.id)}" maxlength="300" placeholder="Add context for the employee"></textarea><div class="wff-pto-actions"><button class="button button-primary" data-pto="${esc(request.id)}" data-status="approved">Approve</button><button class="button button-light" data-pto="${esc(request.id)}" data-status="denied">Deny</button></div><div class="wff-pto-feedback" data-pto-feedback="${esc(request.id)}" role="status"></div></div>` : comment;
      return `<article class="wff-pto-card"><div><strong>${esc(employee?.name || request.employeeId)}</strong><span>${esc(requestType)} · ${esc(request.startDate)} → ${esc(request.endDate)}</span><small>Submitted ${esc(submitted)}</small><small>${esc(request.reason || "No employee note")}</small></div><div><b class="status-${esc(request.status)}">${esc(request.status)}</b>${controls}</div></article>`;
    }

    function render() {
      const summary = state.summary || {};
      [["wffEmployees",summary.activeEmployees],["wffPending",summary.pendingPto],["wffRoles",summary.roles],["wffTemplates",summary.templates]].forEach(([id,value]) => { if(byId(id)) byId(id).textContent=value ?? "—"; });
      if (byId("wffEmployeeSelect")) byId("wffEmployeeSelect").innerHTML = state.employees.map(e => `<option value="${e.id}">${esc(e.name)} · ${esc(e.role)}</option>`).join("");
      if (byId("wffEmployeeList")) byId("wffEmployeeList").innerHTML = state.employees.map(e => `<article><div><strong>${esc(e.name)}</strong><span>${esc(e.role)} · ${esc(e.department || "Service")}</span></div><div><b>$${Number(e.hourlyRate||0).toFixed(2)}/hr</b><small>${esc(e.employmentStatus || e.status || "active")}</small></div></article>`).join("") || "<p>No employees yet.</p>";
      if (byId("wffPtoList")) byId("wffPtoList").innerHTML = state.ptoRequests.slice().sort((a,b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1) || String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).map(ptoCard).join("") || "<p>No PTO requests.</p>";
      if (byId("wffTemplateList")) byId("wffTemplateList").innerHTML = state.shiftTemplates.map(t => `<article><strong>${esc(t.name)}</strong><span>${esc(t.role)} · ${esc(t.startTime)}–${esc(t.endTime)}</span><b>${Number(t.requiredEmployees||1)} needed</b></article>`).join("") || "<p>No templates yet.</p>";
      if (byId("wffAvailabilityList")) byId("wffAvailabilityList").innerHTML = state.availability.slice().sort((a,b)=>a.dayOfWeek-b.dayOfWeek).map(a => {const e=state.employees.find(x=>x.id===a.employeeId); return `<article><strong>${esc(e?.name||a.employeeId)}</strong><span>${days[a.dayOfWeek]} ${esc(a.startTime)}–${esc(a.endTime)}</span><b>${a.preferred ? "Preferred" : "Available"}</b></article>`;}).join("") || "<p>No availability saved.</p>";
    }
    async function load(){ if(!api.token) return; state=await api.workforceFoundation(); render(); }
    async function run(action){ try { await action(); await load(); } catch(error){ alert(error.message || "Workforce action failed"); } }
    byId("wffAddEmployee")?.addEventListener("click",()=>run(()=>api.createWorkforceEmployee({locationId:"loc_marina",name:byId("wffName").value,role:byId("wffRole").value,department:byId("wffDepartment").value,hourlyRate:byId("wffRate").value,preferredHours:byId("wffPreferredHours").value})));
    byId("wffSaveAvailability")?.addEventListener("click",()=>run(()=>api.saveEmployeeAvailability({employeeId:byId("wffEmployeeSelect").value,dayOfWeek:Number(byId("wffDay").value),startTime:byId("wffStart").value,endTime:byId("wffEnd").value,preferred:byId("wffPreferred").checked})));
    byId("wffRequestPto")?.addEventListener("click",()=>run(()=>api.createPtoRequest({employeeId:byId("wffEmployeeSelect").value,startDate:byId("wffPtoStart").value,endDate:byId("wffPtoEnd").value,reason:byId("wffPtoReason").value})));
    byId("wffAddTemplate")?.addEventListener("click",()=>run(()=>api.createShiftTemplate({locationId:"loc_marina",name:byId("wffTemplateName").value,role:byId("wffTemplateRole").value,department:byId("wffTemplateDepartment").value,startTime:byId("wffTemplateStart").value,endTime:byId("wffTemplateEnd").value,requiredEmployees:byId("wffTemplateCount").value})));
    byId("wffPtoList")?.addEventListener("click", async event => {
      const button = event.target.closest("[data-pto][data-status]");
      if (!button || button.disabled) return;
      const id = button.dataset.pto;
      const comment = byId(`wff-comment-${id}`)?.value || "";
      const feedback = document.querySelector(`[data-pto-feedback="${CSS.escape(id)}"]`);
      button.closest(".wff-pto-actions")?.querySelectorAll("button").forEach(item => item.disabled = true);
      if (feedback) feedback.textContent = `${button.dataset.status === "approved" ? "Approving" : "Denying"} request…`;
      try {
        await api.decidePtoRequest(id, button.dataset.status, comment);
        await load();
      } catch (error) {
        button.closest(".wff-pto-actions")?.querySelectorAll("button").forEach(item => item.disabled = false);
        if (feedback) feedback.textContent = error.message || "Unable to update PTO request.";
      }
    });
    byId("wffRefresh")?.addEventListener("click",load);
    eventBus.on?.("auth:signed-in",load); eventBus.on?.("auth:restored",load);
    ["workforce-foundation:employee-created","workforce-foundation:employee-updated","workforce-foundation:availability-updated","workforce-foundation:pto-created","workforce-foundation:pto-updated","employee-portal:pto-created","employee-portal:pto-updated","workforce-foundation:template-created"].forEach(type=>eventBus.on?.(type,load));
    load();
    return { reload: load, getState:()=>JSON.parse(JSON.stringify(state)) };
  }
  window.createBlueCurrentWorkforceFoundationModule = createBlueCurrentWorkforceFoundationModule;
})();
