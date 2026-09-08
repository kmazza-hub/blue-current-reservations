(function () {
  "use strict";

  function createBlueCurrentEnterpriseValuePlanCenterModule(eventBus, appState) {
    const root=document.getElementById("enterpriseValuePlanCenter");
    if(!root||!window.BlueCurrentEnterpriseValuePlanEngine)return null;
    const engine=new window.BlueCurrentEnterpriseValuePlanEngine({eventBus,appState});
    const byId=id=>document.getElementById(id);
    const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const money=value=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value||0));
    const fmt=(value,unit)=>unit==="currency"?money(value):unit==="percent"?`${Math.round(Number(value||0))}%`:String(Math.round(Number(value||0)));

    function render(snapshot=engine.refresh({reason:"render"})){
      byId("enterpriseValuePlanScore").textContent=`${snapshot.score}%`;
      byId("enterpriseValuePlanStatus").textContent=snapshot.status.replaceAll("-"," ");
      byId("enterpriseValuePlanStatus").dataset.tone=snapshot.status;
      byId("enterpriseValuePlanSummary").textContent=snapshot.summary;
      byId("enterpriseValueRevenueTarget").textContent=money(snapshot.metrics.annualRevenueTarget);
      byId("enterpriseValueRevenueActual").textContent=money(snapshot.metrics.realizedRevenue);
      byId("enterpriseValueRpiTarget").textContent=String(snapshot.metrics.portfolioRpiTarget);
      byId("enterpriseValueRpiActual").textContent=String(snapshot.metrics.currentPortfolioRpi);
      byId("enterpriseValueAdoptionTarget").textContent=`${snapshot.metrics.adoptionTarget}%`;
      byId("enterpriseValueAdoptionActual").textContent=`${snapshot.metrics.currentAdoption}%`;
      byId("enterpriseValueOpenInitiatives").textContent=String(snapshot.metrics.openInitiatives);
      byId("enterpriseValueTargets").innerHTML=snapshot.targets.map(item=>`<article><div><small>${esc(item.unit)}</small><strong>${esc(item.name)}</strong><span>${fmt(item.actual,item.unit)} actual · ${fmt(item.target,item.unit)} target</span></div><div class="enterprise-target-progress"><i style="width:${Math.min(100,item.target?item.actual/item.target*100:0)}%"></i></div><b>${esc(item.owner)}</b><button type="button" data-enterprise-target="${esc(item.id)}">Edit target</button></article>`).join("");
      byId("enterpriseValueInitiatives").innerHTML=snapshot.initiatives.map(item=>`<article data-priority="${esc(item.priority)}" data-status="${esc(item.status)}"><div><small>${esc(item.quarter)} · ${esc(item.priority)} priority</small><strong>${esc(item.title)}</strong><span>${esc(item.milestone)}</span></div><div class="enterprise-initiative-meta"><b>${esc(item.owner)}</b><span>${money(item.projectedValue)} projected</span></div><select data-enterprise-initiative-status="${esc(item.id)}"><option value="planned"${item.status==='planned'?' selected':''}>Planned</option><option value="in-progress"${item.status==='in-progress'?' selected':''}>In progress</option><option value="complete"${item.status==='complete'?' selected':''}>Complete</option><option value="blocked"${item.status==='blocked'?' selected':''}>Blocked</option></select><button type="button" data-enterprise-initiative-owner="${esc(item.id)}">Owner</button></article>`).join("");
      byId("enterpriseValueQuarters").innerHTML=snapshot.quarters.map(item=>`<article><div><small>${esc(item.quarter)}</small><strong>${esc(item.focus)}</strong><span>${item.complete}/${item.total} complete</span></div><b>${money(item.projectedValue)}</b></article>`).join("");
      byId("enterpriseValueVariance").innerHTML=`<article><small>Revenue gap</small><strong>${money(snapshot.variance.revenueGap)}</strong><span>${snapshot.variance.revenueProgress}% of target realized</span></article><article><small>RPI gap</small><strong>${snapshot.variance.rpiGap}</strong><span>Points to annual target</span></article><article><small>Adoption gap</small><strong>${snapshot.variance.adoptionGap}%</strong><span>Points to annual target</span></article><article><small>Accuracy gap</small><strong>${snapshot.variance.accuracyGap}%</strong><span>Points to annual target</span></article>`;
      byId("enterpriseValueBlockers").innerHTML=snapshot.blockers.length?snapshot.blockers.map(text=>`<article data-tone="blocker"><strong>Blocker</strong><span>${esc(text)}</span></article>`).join(""):`<article data-tone="clear"><strong>Clear</strong><span>No annual-plan blockers are currently active.</span></article>`;
      byId("enterpriseValueActions").innerHTML=snapshot.nextActions.length?snapshot.nextActions.map((item,index)=>`<li><span>${index+1}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.action)}</small></div></li>`).join(""):`<li><span>✓</span><div><strong>Annual plan is current</strong><small>Continue measuring progress and refreshing executive commitments.</small></div></li>`;
    }

    function message(text,tone=""){const node=byId("enterpriseValuePlanMessage");node.textContent=text;node.dataset.tone=tone;}
    root.addEventListener("click",event=>{
      const target=event.target.closest("[data-enterprise-target]");
      if(target){const id=target.dataset.enterpriseTarget;const current=(appState.get("enterpriseValueTargets")||[]).find(item=>item.id===id);const value=window.prompt("Target value:",String(current?.target||0));if(value===null)return;const owner=window.prompt("Target owner:",current?.owner||"Unassigned");render(engine.updateTarget(id,{target:Number(value)||0,owner:owner||"Unassigned"}));message("Annual target updated.","success");return;}
      const ownerBtn=event.target.closest("[data-enterprise-initiative-owner]");
      if(ownerBtn){const id=ownerBtn.dataset.enterpriseInitiativeOwner;const current=(appState.get("enterpriseValueInitiatives")||[]).find(item=>item.id===id);const owner=window.prompt("Initiative owner:",current?.owner||"Unassigned");if(owner===null)return;render(engine.updateInitiative(id,{owner:owner||"Unassigned"}));message("Initiative owner updated.","success");}
    });
    root.addEventListener("change",event=>{const select=event.target.closest("[data-enterprise-initiative-status]");if(!select)return;render(engine.updateInitiative(select.dataset.enterpriseInitiativeStatus,{status:select.value}));message("Initiative status updated.","success");});
    byId("enterpriseValuePlanRefresh")?.addEventListener("click",()=>{render(engine.refresh({reason:"manual-review"}));message("Annual value plan recalculated.","success");});
    byId("enterpriseValuePlanAdd")?.addEventListener("click",()=>{const title=window.prompt("New annual value initiative:");if(!title)return;render(engine.addInitiative(title.trim()));message("Value initiative added.","success");});
    byId("enterpriseValuePlanExport")?.addEventListener("click",()=>{const blob=new Blob([JSON.stringify(engine.exportManifest(),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`blue-current-enterprise-value-plan-${Date.now()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);message("Annual operating plan downloaded.","success");});
    eventBus.on("enterprise-value-plan:updated",snapshot=>snapshot&&render(snapshot));
    setTimeout(()=>render(engine.refresh({reason:"startup-settled"})),1050);
    return{engine,refresh:()=>render(engine.refresh({reason:"module-refresh"})),getState:()=>appState.get("enterpriseValuePlan")};
  }

  window.createBlueCurrentEnterpriseValuePlanCenterModule=createBlueCurrentEnterpriseValuePlanCenterModule;
})();
