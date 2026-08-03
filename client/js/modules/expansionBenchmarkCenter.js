(function () {
  "use strict";

  function createBlueCurrentExpansionBenchmarkCenterModule(eventBus, appState) {
    const root = document.getElementById("expansionBenchmarkCenter");
    if (!root || !window.BlueCurrentExpansionBenchmarkEngine) return null;
    const engine = new window.BlueCurrentExpansionBenchmarkEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const money = value => new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(Number(value||0));

    function render(snapshot = engine.refresh({ reason:"render" })) {
      byId("expansionBenchmarkScore").textContent = `${snapshot.score}%`;
      byId("expansionBenchmarkGate").textContent = snapshot.gate.replaceAll("-"," ");
      byId("expansionBenchmarkGate").dataset.tone = snapshot.gate;
      byId("expansionBenchmarkSummary").textContent = snapshot.summary;
      byId("expansionAverageRpi").textContent = String(snapshot.benchmarks.averageRpi);
      byId("expansionAverageAdoption").textContent = `${snapshot.benchmarks.averageAdoption}%`;
      byId("expansionRealizedRevenue").textContent = money(snapshot.benchmarks.totalRealizedRevenue);
      byId("expansionScalingReady").textContent = `${snapshot.counts.scalingReady}/${snapshot.counts.benchmarkLocations}`;
      byId("expansionRepeatableWins").textContent = String(snapshot.counts.repeatableWins);
      byId("expansionOpportunity").textContent = money(snapshot.benchmarks.opportunity);

      byId("expansionLocationBenchmarks").innerHTML = snapshot.locations.map((item,index)=>`<article data-readiness="${esc(item.readiness)}"><span class="expansion-rank">${index+1}</span><div><strong>${esc(item.name)}</strong><small>${esc(item.owner)} · ${esc(item.primaryConstraint)}</small></div><div class="expansion-location-metrics"><b>${item.rpi} RPI</b><b>${item.adoption}% adoption</b><b>${money(item.realizedRevenue)}</b></div><em>${esc(item.readiness.replaceAll("-"," "))}</em></article>`).join("");
      byId("expansionPlaybooks").innerHTML = snapshot.playbooks.map(item=>`<article><div><small>${esc(item.domain)} · ${item.confidence}% confidence</small><strong>${esc(item.title)}</strong><span>${esc(item.evidence)}</span></div><b>${esc(item.expectedImpact)}</b></article>`).join("");
      byId("expansionPlan").innerHTML = snapshot.expansionPlan.length ? snapshot.expansionPlan.map(item=>`<article data-status="${esc(item.status)}"><div><small>${esc(item.wave)}</small><strong>${esc(item.locationName)}</strong><span>${esc(item.owner)} · target RPI ${item.targetRpi} · target adoption ${item.targetAdoption}%</span></div><select data-expansion-status="${esc(item.id)}"><option value="planned"${item.status==='planned'?' selected':''}>Planned</option><option value="preparing"${item.status==='preparing'?' selected':''}>Preparing</option><option value="active"${item.status==='active'?' selected':''}>Active</option><option value="complete"${item.status==='complete'?' selected':''}>Complete</option><option value="hold"${item.status==='hold'?' selected':''}>Hold</option></select><button type="button" data-expansion-owner="${esc(item.id)}">Owner</button><button type="button" data-expansion-approve="${esc(item.id)}">${item.approved?'Approved':'Approve'}</button></article>`).join("") : `<article><div><strong>No expansion locations planned</strong><span>Add locations after the current rollout reaches stable evidence thresholds.</span></div></article>`;
      byId("expansionActions").innerHTML = snapshot.nextActions.length ? snapshot.nextActions.map((item,index)=>`<li><span>${index+1}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.action)}</small></div></li>`).join("") : `<li><span>✓</span><div><strong>Expansion controls are current</strong><small>Continue measuring value and preserving repeatable playbooks.</small></div></li>`;
      byId("expansionRisks").innerHTML = [...snapshot.blockers.map(text=>({tone:"blocker",label:"Blocker",text})),...snapshot.watchItems.map(text=>({tone:"watch",label:"Watch",text}))].map(item=>`<article data-tone="${item.tone}"><strong>${item.label}</strong><span>${esc(item.text)}</span></article>`).join("") || `<article data-tone="clear"><strong>Clear</strong><span>No expansion blockers or watch items are currently active.</span></article>`;
    }

    function status(message,tone="") { const node=byId("expansionBenchmarkMessage"); node.textContent=message; node.dataset.tone=tone; }

    root.addEventListener("click", event => {
      const ownerButton=event.target.closest("[data-expansion-owner]");
      if (ownerButton) {
        const current=(appState.get("expansionPlan")||[]).find(item=>item.id===ownerButton.dataset.expansionOwner);
        const owner=window.prompt("Expansion owner:",current?.owner||"Unassigned");
        if (owner===null) return;
        render(engine.updatePlan(ownerButton.dataset.expansionOwner,{owner:owner||"Unassigned"})); status("Expansion owner updated.","success"); return;
      }
      const approveButton=event.target.closest("[data-expansion-approve]");
      if (approveButton) {
        const current=(appState.get("expansionPlan")||[]).find(item=>item.id===approveButton.dataset.expansionApprove);
        render(engine.updatePlan(approveButton.dataset.expansionApprove,{approved:!current?.approved})); status("Expansion approval updated.","success");
      }
    });

    root.addEventListener("change", event => {
      const select=event.target.closest("[data-expansion-status]");
      if (!select) return;
      render(engine.updatePlan(select.dataset.expansionStatus,{status:select.value})); status("Expansion status updated.","success");
    });

    byId("expansionBenchmarkRefresh")?.addEventListener("click",()=>{render(engine.refresh({reason:"manual-review"}));status("Expansion benchmark recalculated.","success");});
    byId("expansionBenchmarkExport")?.addEventListener("click",()=>{const blob=new Blob([JSON.stringify(engine.exportManifest(),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`blue-current-expansion-benchmark-${Date.now()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);status("Expansion evidence package downloaded.","success");});

    eventBus.on("expansion-benchmark:updated",snapshot=>snapshot&&render(snapshot));
    setTimeout(()=>render(engine.refresh({reason:"startup-settled"})),820);
    return { engine, refresh:()=>render(engine.refresh({reason:"module-refresh"})), getState:()=>appState.get("expansionBenchmark") };
  }

  window.createBlueCurrentExpansionBenchmarkCenterModule=createBlueCurrentExpansionBenchmarkCenterModule;
})();
