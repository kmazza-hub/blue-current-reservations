(function () {
  "use strict";

  function createBlueCurrentPerformanceGovernanceCenterModule(eventBus, appState) {
    const root=document.getElementById("performanceGovernanceCenter");
    if (!root || !window.BlueCurrentPerformanceGovernanceEngine) return null;
    const engine=new window.BlueCurrentPerformanceGovernanceEngine({eventBus,appState});
    const byId=id=>document.getElementById(id);
    const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const money=value=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value||0));
    const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?"Unscheduled":d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});};

    function render(snapshot=engine.refresh({reason:"render"})) {
      byId("governanceScore").textContent=`${snapshot.score}%`;
      byId("governanceStatus").textContent=snapshot.status.replaceAll("-"," ");
      byId("governanceStatus").dataset.tone=snapshot.status;
      byId("governanceSummary").textContent=snapshot.summary;
      byId("governancePortfolioRpi").textContent=String(snapshot.metrics.portfolioRpi);
      byId("governanceRealizedRevenue").textContent=money(snapshot.metrics.realizedRevenue);
      byId("governanceAdoption").textContent=`${snapshot.metrics.adoption}%`;
      byId("governanceAccuracy").textContent=`${snapshot.metrics.forecastAccuracy}%`;
      byId("governanceCalibration").textContent=`${snapshot.metrics.calibration}%`;
      byId("governanceOpenCommitments").textContent=String(snapshot.metrics.openCommitments);

      byId("governanceCadence").innerHTML=snapshot.cadence.map(item=>`<article data-status="${esc(item.status)}"><div><small>${esc(item.frequency)}</small><strong>${esc(item.name)}</strong><span>${esc(item.focus)}</span></div><div class="governance-cadence-meta"><b>${esc(item.owner)}</b><span>Next ${date(item.nextReview)}</span></div><button type="button" data-governance-owner="${esc(item.id)}">Owner</button><button type="button" data-governance-date="${esc(item.id)}">Review date</button></article>`).join("");
      byId("governanceCommitments").innerHTML=snapshot.commitments.length?snapshot.commitments.map(item=>`<article data-priority="${esc(item.priority)}" data-status="${esc(item.status)}"><div><small>${esc(item.priority)} priority</small><strong>${esc(item.title)}</strong><span>${esc(item.evidence)}</span></div><div class="governance-commitment-meta"><b>${esc(item.owner)}</b><span>Due ${date(item.dueDate)}</span></div><select data-governance-commitment-status="${esc(item.id)}"><option value="open"${item.status==='open'?' selected':''}>Open</option><option value="in-progress"${item.status==='in-progress'?' selected':''}>In progress</option><option value="complete"${item.status==='complete'?' selected':''}>Complete</option><option value="blocked"${item.status==='blocked'?' selected':''}>Blocked</option></select><button type="button" data-governance-commitment-owner="${esc(item.id)}">Owner</button></article>`).join(""):`<article><div><strong>No open commitments</strong><span>Add a measurable operating commitment for the next review cycle.</span></div></article>`;
      byId("governanceAccountability").innerHTML=snapshot.accountability.map(item=>`<article data-coverage="${esc(item.coverage)}"><div><strong>${esc(item.owner)}</strong><span>${item.reviews} review${item.reviews===1?'':'s'} · ${item.commitments} commitment${item.commitments===1?'':'s'}</span></div><b>${item.open} open</b></article>`).join("");
      byId("governanceRisks").innerHTML=[...snapshot.blockers.map(text=>({tone:"blocker",label:"Blocker",text})),...snapshot.watchItems.map(text=>({tone:"watch",label:"Watch",text}))].map(item=>`<article data-tone="${item.tone}"><strong>${item.label}</strong><span>${esc(item.text)}</span></article>`).join("")||`<article data-tone="clear"><strong>Clear</strong><span>No governance blockers or watch conditions are currently active.</span></article>`;
      byId("governanceActions").innerHTML=snapshot.nextActions.length?snapshot.nextActions.map((item,index)=>`<li><span>${index+1}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.action)}</small></div></li>`).join(""):`<li><span>✓</span><div><strong>Operating cadence is current</strong><small>Continue running the scheduled reviews and measuring commitment completion.</small></div></li>`;
    }

    function message(text,tone="") { const node=byId("governanceMessage"); node.textContent=text; node.dataset.tone=tone; }

    root.addEventListener("click",event=>{
      const ownerButton=event.target.closest("[data-governance-owner]");
      if(ownerButton){const current=(appState.get("performanceGovernanceCadence")||[]).find(item=>item.id===ownerButton.dataset.governanceOwner);const owner=window.prompt("Review owner:",current?.owner||"Unassigned");if(owner===null)return;render(engine.updateCadence(ownerButton.dataset.governanceOwner,{owner:owner||"Unassigned"}));message("Review ownership updated.","success");return;}
      const dateButton=event.target.closest("[data-governance-date]");
      if(dateButton){const value=window.prompt("Next review date (YYYY-MM-DD):",new Date().toISOString().slice(0,10));if(!value)return;const parsed=new Date(`${value}T12:00:00`);if(Number.isNaN(parsed.getTime())){message("Enter a valid review date.","error");return;}render(engine.updateCadence(dateButton.dataset.governanceDate,{nextReview:parsed.toISOString()}));message("Review date updated.","success");return;}
      const commitmentOwner=event.target.closest("[data-governance-commitment-owner]");
      if(commitmentOwner){const current=(appState.get("performanceGovernanceCommitments")||[]).find(item=>item.id===commitmentOwner.dataset.governanceCommitmentOwner);const owner=window.prompt("Commitment owner:",current?.owner||"Unassigned");if(owner===null)return;render(engine.updateCommitment(commitmentOwner.dataset.governanceCommitmentOwner,{owner:owner||"Unassigned"}));message("Commitment owner updated.","success");}
    });

    root.addEventListener("change",event=>{const select=event.target.closest("[data-governance-commitment-status]");if(!select)return;render(engine.updateCommitment(select.dataset.governanceCommitmentStatus,{status:select.value}));message("Commitment status updated.","success");});
    byId("governanceRefresh")?.addEventListener("click",()=>{render(engine.refresh({reason:"manual-review"}));message("Governance score recalculated.","success");});
    byId("governanceAddCommitment")?.addEventListener("click",()=>{const title=window.prompt("New operating commitment:");if(!title)return;render(engine.addCommitment(title.trim()));message("Operating commitment added.","success");});
    byId("governanceExport")?.addEventListener("click",()=>{const blob=new Blob([JSON.stringify(engine.exportManifest(),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`blue-current-performance-governance-${Date.now()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);message("Governance evidence package downloaded.","success");});
    eventBus.on("performance-governance:updated",snapshot=>snapshot&&render(snapshot));
    setTimeout(()=>render(engine.refresh({reason:"startup-settled"})),900);
    return {engine,refresh:()=>render(engine.refresh({reason:"module-refresh"})),getState:()=>appState.get("performanceGovernance")};
  }

  window.createBlueCurrentPerformanceGovernanceCenterModule=createBlueCurrentPerformanceGovernanceCenterModule;
})();
