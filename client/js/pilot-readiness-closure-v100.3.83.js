(function(){
"use strict";

const gates={
  restaurantConfigurationReady:{title:"Restaurant configuration",action:"Complete the restaurant setup",detail:"Confirm the pilot location, floor, operating settings, and protected pilot controls are complete."},
  locationCertificationCurrent:{title:"Location certification",action:"Certify the current setup",detail:"Run configuration certification after the restaurant setup is complete. Any later configuration change requires recertification."},
  workflowBindingCurrent:{title:"Workflow binding",action:"Bind the pilot workflow",detail:"Bind the certified location and current data workflow before rehearsal evidence is collected."},
  serviceSimulationCurrent:{title:"Service simulation",action:"Run the full rehearsal",detail:"Complete the current launch-to-recovery service simulation against the certified workflow binding."},
  operatorAcceptanceCurrent:{title:"Physical-iPad acceptance",action:"Record operator acceptance",detail:"Complete the required hosted-pilot workflow on a physical iPad, record each observation, and provide human acceptance."},
  noActiveLaunchHolds:{title:"Launch holds",action:"Review the active hold",detail:"A human must resolve the reason for every active launch hold and record a meaningful release statement."},
  providerWriteBackLockedOff:{title:"Provider write-back safety",action:"Restore the safety lock",detail:"External-provider write-back must remain disabled for the controlled pilot."},
  autonomousProductionChangesLockedOff:{title:"Autonomous-change safety",action:"Restore the safety lock",detail:"Autonomous production changes must remain disabled for the controlled pilot."}
};

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}

function installStyles(){
  if(document.getElementById("bcReadinessClosureStyles"))return;
  const style=document.createElement("style");
  style.id="bcReadinessClosureStyles";
  style.textContent=`
    .bc-readiness-closure{margin:16px 0 0;padding:18px;border:1px solid rgba(131,197,187,.28);border-radius:18px;background:#0b2732;color:#fff}
    .bc-readiness-closure>header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}
    .bc-readiness-closure small{display:block;color:#83c5bb;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    .bc-readiness-closure h3{margin:4px 0 0;color:#fff;font-size:22px;line-height:1.15}
    .bc-readiness-closure-count{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;border-radius:999px;background:#f7e7c6;color:#4a3210;font-weight:950}
    .bc-readiness-closure-note{margin:0 0 14px;color:#d4e8e9;line-height:1.45}
    .bc-readiness-gates{display:grid;gap:10px}
    .bc-readiness-gate{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px;border:1px solid rgba(131,197,187,.25);border-radius:14px;background:#123d4b}
    .bc-readiness-gate strong{display:block;color:#fff;font-size:17px}.bc-readiness-gate span{display:block;margin-top:4px;color:#c9dfe1;line-height:1.35}
    .bc-readiness-gate button{min-height:44px;min-width:132px;padding:0 15px;border:2px solid #83c5bb;border-radius:12px;background:#f7fbfc;color:#0b5360;font-weight:900;cursor:pointer}
    .bc-readiness-gate-detail{grid-column:1/-1;margin:0;padding:12px;border-radius:10px;background:#071d26;color:#e8f5f5;line-height:1.45}
    .bc-readiness-clear{padding:14px;border-radius:12px;background:#123d4b;color:#bdf3d6;font-weight:850}
    @media(max-width:720px){.bc-readiness-gate{grid-template-columns:1fr}.bc-readiness-gate button{width:100%}}
  `;
  document.head.appendChild(style);
}

function ensureRoot(){
  let root=document.getElementById("bcReadinessClosure");
  if(root)return root;
  const anchor=document.querySelector("#bcPilotCommandCard .bc-pilot-command-grid");
  if(!anchor)return null;
  root=document.createElement("section");
  root.id="bcReadinessClosure";
  root.className="bc-readiness-closure";
  root.setAttribute("aria-labelledby","bcReadinessClosureTitle");
  root.innerHTML='<header><div><small>PILOT READINESS CLOSURE</small><h3 id="bcReadinessClosureTitle">Open evidence gates</h3></div><span class="bc-readiness-closure-count" id="bcReadinessClosureCount" aria-label="Open readiness gates">0</span></header><p class="bc-readiness-closure-note" id="bcReadinessClosureNote">These are controlled evidence gates—not software errors. Blue Current will not manufacture readiness.</p><div class="bc-readiness-gates" id="bcReadinessClosureList"></div>';
  anchor.insertAdjacentElement("afterend",root);
  root.addEventListener("click",event=>{
    const button=event.target.closest("[data-bc-readiness-explain]");if(!button)return;
    const row=button.closest(".bc-readiness-gate"),detail=row?.querySelector(".bc-readiness-gate-detail");if(!detail)return;
    const open=detail.hidden;detail.hidden=!open;button.textContent=open?"Hide requirement":"Show requirement";button.setAttribute("aria-expanded",open?"true":"false");
  });
  return root;
}

function render(readiness={}){
  installStyles();
  const root=ensureRoot();if(!root)return;
  const blocking=Array.isArray(readiness.blocking)?readiness.blocking:[];
  const count=document.getElementById("bcReadinessClosureCount"),list=document.getElementById("bcReadinessClosureList"),title=document.getElementById("bcReadinessClosureTitle"),note=document.getElementById("bcReadinessClosureNote");
  if(count){count.textContent=String(blocking.length);count.setAttribute("aria-label",`${blocking.length} open readiness gate${blocking.length===1?"":"s"}`);}
  if(title)title.textContent=blocking.length?`${blocking.length} gate${blocking.length===1?"":"s"} before controlled launch`:"Certified readiness gates complete";
  if(note)note.textContent=blocking.length?"Complete these in order. Evidence stays human-controlled, and every safety lock remains enforced.":"All certified readiness evidence is current. Final launch approval remains a human decision.";
  if(!list)return;
  if(!blocking.length){list.innerHTML='<div class="bc-readiness-clear">READY FOR HUMAN LAUNCH REVIEW</div>';return;}
  list.innerHTML=blocking.map((key,index)=>{const gate=gates[key]||{title:key.replace(/([a-z])([A-Z])/g,"$1 $2"),action:"Review this gate",detail:"Review the certified readiness evidence required for this gate."};return `<article class="bc-readiness-gate" data-bc-readiness-key="${escapeHtml(key)}"><div><small>STEP ${index+1}</small><strong>${escapeHtml(gate.title)}</strong><span>${escapeHtml(gate.action)}</span></div><button type="button" data-bc-readiness-explain="${escapeHtml(key)}" aria-expanded="false">Show requirement</button><p class="bc-readiness-gate-detail" hidden>${escapeHtml(gate.detail)}</p></article>`;}).join("");
}

window.BlueCurrentPilotReadinessClosure={version:"100.3.83",render,gates:Object.freeze({...gates})};
window.addEventListener("bluecurrent:pilot-readiness-detail",event=>render(event.detail||{}));
})();
