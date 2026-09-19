(function(){
"use strict";

const gates=[
  {key:"restaurantConfigurationReady",title:"Restaurant configuration",action:"Complete the restaurant setup",detail:"Confirm the pilot location, floor, operating settings, and protected pilot controls are complete.",evidence:"configurationUpdatedAt",evidenceLabel:"Configuration updated"},
  {key:"locationCertificationCurrent",title:"Location certification",action:"Certify the current setup",detail:"Run configuration certification after setup is complete. Any later configuration change requires recertification.",evidence:"locationCertificationId",evidenceLabel:"Certification"},
  {key:"workflowBindingCurrent",title:"Workflow binding",action:"Bind the pilot workflow",detail:"Bind the certified location and current data workflow before rehearsal evidence is collected.",evidence:"workflowBindingId",evidenceLabel:"Workflow binding"},
  {key:"serviceSimulationCurrent",title:"Service simulation",action:"Run the full rehearsal",detail:"Complete the current launch-to-recovery service simulation against the certified workflow binding.",evidence:"simulationRunId",evidenceLabel:"Simulation"},
  {key:"operatorAcceptanceCurrent",title:"Physical-iPad acceptance",action:"Record operator acceptance",detail:"Complete the hosted-pilot workflow on the physical iPad, record observations, and provide human acceptance.",evidence:"operatorAcceptanceId",evidenceLabel:"Acceptance"}
];

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function formatEvidence(gate,value){
  if(!value)return "No current evidence";
  if(gate.evidence==="configurationUpdatedAt"){
    const date=new Date(value);
    if(!Number.isNaN(date.getTime()))return date.toLocaleString();
  }
  return String(value);
}

function installStyles(){
  if(document.getElementById("bcReadinessEvidenceStyles"))return;
  const style=document.createElement("style");
  style.id="bcReadinessEvidenceStyles";
  style.textContent=`
    .bc-readiness-summary{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;margin:0 0 14px;padding:13px;border-radius:13px;background:#071d26;border:1px solid rgba(131,197,187,.28)}
    .bc-readiness-summary strong{display:inline-flex;align-items:center;justify-content:center;min-width:74px;min-height:44px;border-radius:999px;background:#f7e7c6;color:#4a3210;font-weight:950}.bc-readiness-summary[data-decision="GO"] strong{background:#bdf3d6;color:#0b5134}
    .bc-readiness-summary span{color:#e8f5f5;line-height:1.4}.bc-readiness-gate-status{display:inline-flex!important;width:max-content;margin:0 0 5px!important;padding:4px 8px;border-radius:999px;background:#f7e7c6;color:#4a3210!important;font-size:12px;font-weight:950;letter-spacing:.06em}.bc-readiness-gate[data-status="verified"] .bc-readiness-gate-status{background:#bdf3d6;color:#0b5134!important}
    .bc-readiness-evidence{grid-column:1/-1;display:grid;grid-template-columns:auto 1fr;gap:8px;margin:0;padding:10px 12px;border-radius:10px;background:#0a2d38;color:#d7eaeb}.bc-readiness-evidence dt{font-weight:900}.bc-readiness-evidence dd{margin:0;overflow-wrap:anywhere}
    @media(max-width:720px){.bc-readiness-summary{grid-template-columns:1fr}.bc-readiness-summary strong{justify-self:start}.bc-readiness-evidence{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function render(readiness={}){
  const root=document.getElementById("bcReadinessClosure"),list=document.getElementById("bcReadinessClosureList");
  if(!root||!list)return;
  installStyles();
  const checks=readiness.checks&&typeof readiness.checks==="object"?readiness.checks:{};
  const evidence=readiness.evidence&&typeof readiness.evidence==="object"?readiness.evidence:{};
  const open=gates.filter(gate=>checks[gate.key]!==true);
  const decision=readiness.goEligible===true&&open.length===0?"GO":"HOLD";
  let summary=root.querySelector(".bc-readiness-summary");
  if(!summary){summary=document.createElement("div");summary.className="bc-readiness-summary";root.querySelector(".bc-readiness-closure-note")?.insertAdjacentElement("afterend",summary);}
  summary.dataset.decision=decision;
  const summaryCopy=decision==="GO"
    ?"All five operational gates have current server evidence. Human launch approval is still required."
    :open.length
      ?`${open.length} of 5 operational gates remain open. Next: ${open[0].action}.`
      :"All five operational gates are verified, but a certified safety check or launch hold still blocks approval.";
  summary.innerHTML=`<strong>${decision}</strong><span>${escapeHtml(summaryCopy)}</span>`;
  list.innerHTML=gates.map((gate,index)=>{
    const verified=checks[gate.key]===true;
    return `<article class="bc-readiness-gate" data-bc-readiness-key="${escapeHtml(gate.key)}" data-status="${verified?"verified":"open"}"><div><span class="bc-readiness-gate-status">${verified?"VERIFIED":"OPEN"}</span><small>STEP ${index+1}</small><strong>${escapeHtml(gate.title)}</strong><span>${escapeHtml(verified?"Current certified evidence is present.":gate.action)}</span></div><button type="button" data-bc-readiness-explain="${escapeHtml(gate.key)}" aria-expanded="false">Show requirement</button><p class="bc-readiness-gate-detail" hidden>${escapeHtml(gate.detail)}</p><dl class="bc-readiness-evidence"><dt>${escapeHtml(gate.evidenceLabel)}</dt><dd>${escapeHtml(formatEvidence(gate,evidence[gate.evidence]))}</dd></dl></article>`;
  }).join("");
}

window.BlueCurrentPilotReadinessEvidence={version:"100.3.94",render,gates:Object.freeze(gates.map(gate=>Object.freeze({...gate})))};
window.addEventListener("bluecurrent:pilot-readiness-detail",event=>render(event.detail||{}));
})();
