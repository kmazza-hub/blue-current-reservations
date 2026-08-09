(function(){"use strict";
function createBlueCurrentPilotDeploymentPackageCenterModule(eventBus,appState){
  const root=document.getElementById("pilotDeploymentPackage");
  if(!root||!window.BlueCurrentPilotDeploymentPackageEngine)return null;
  const e=new window.BlueCurrentPilotDeploymentPackageEngine({eventBus,appState}),$=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("pdpStatus").textContent=s.status||"—";
    $("pdpReady").textContent=`${locs.filter(x=>x.deploymentReady).length}/${locs.length}`;
    $("pdpGenerated").textContent=locs.filter(x=>x.package).length;
    $("pdpCertified").textContent=locs.filter(x=>x.certification?.status==="PILOT_DEPLOYMENT_CERTIFIED").length;
    $("pdpHeadline").textContent=s.headline||"Pilot deployment package unavailable.";
    $("pdpLocations").innerHTML=locs.map(x=>`<article data-pdp-location="${esc(x.locationId)}"><div><strong>${esc(x.locationName)}</strong><span>${esc(x.deploymentState)} · ${x.passed}/${x.total} checklist items · executive accuracy ${esc(x.executiveAccuracyState||"unknown")}</span></div><p>${x.configSummary.tables} tables · ${x.configSummary.sections} sections · ${x.configSummary.memberships} memberships · ${x.configSummary.connectors} connectors</p><div class="v432-list">${x.checks.map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.id)}</strong><span>${esc(c.actual)}</span></article>`).join("")}</div><div class="v4316-actions">${!x.package?'<button type="button" data-pdp-generate="true">Generate deployment package</button>':""}${x.deploymentReady&&x.certification?.status!=="PILOT_DEPLOYMENT_CERTIFIED"?'<button type="button" data-pdp-certify="true">Certify deployment package</button>':""}</div></article>`).join("")||"<article><strong>No in-scope restaurants.</strong></article>";
    const p=s.procedures||{};
    $("pdpProcedures").innerHTML=Object.entries(p).map(([k,v])=>`<article><strong>${esc(k.replaceAll(/([A-Z])/g," $1"))}</strong>${Object.entries(v).map(([a,b])=>`<p><b>${esc(a)}</b> · ${esc(b)}</p>`).join("")}</article>`).join("");
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("pdpHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const card=ev.target.closest("[data-pdp-location]");if(!card)return;
    try{
      if(ev.target.closest("[data-pdp-generate]")){
        await e.generate(card.dataset.pdpLocation,{
          releaseVersion:$("pdpReleaseVersion").value,
          environment:$("pdpEnvironment").value,
          supportOwner:$("pdpSupportOwner").value,
          escalationOwner:$("pdpEscalationOwner").value,
          deploymentWindow:$("pdpWindow").value,
          evidence:$("pdpEvidence").value
        });
      }else if(ev.target.closest("[data-pdp-certify]")){
        await e.certify(card.dataset.pdpLocation,{
          evidence:$("pdpCertificationEvidence").value,
          note:$("pdpCertificationNote").value
        });
      }
      await load();
    }catch(err){$("pdpHeadline").textContent=err.message;}
  });
  $("pdpRefresh")?.addEventListener("click",load);
  ["pilot-deployment:package-generated","pilot-deployment:certified","management-executive-accuracy:certified","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentPilotDeploymentPackageCenterModule=createBlueCurrentPilotDeploymentPackageCenterModule;
})();