(function(){
  "use strict";
  if(new URLSearchParams(location.search).get("pilotAcceptance")!=="1")return;

  const steps=[
    ["launch","Launch and sign in","clarity"],
    ["reservation","Create a reservation","usefulness"],
    ["arrival","Mark the guest arrived","responseQuality"],
    ["waitlist","Add and review a walk-in","workflowFriction"],
    ["seating","Choose a table and seat","exceptionHandling"],
    ["floor","Confirm Floor table truth","serviceFit"],
    ["service","Open Service and return","trust"],
    ["kitchen","Open Kitchen and return","clarity"],
    ["staff","Open Staff and return","workflowFriction"],
    ["interruption-recovery","Background Safari, resume, and confirm truth","trust"]
  ];
  const token=()=>localStorage.getItem("blueCurrentV3230Token")||"";
  const api=async(path,options={})=>{
    const response=await fetch(path,{...options,headers:{Authorization:`Bearer ${token()}`,"Content-Type":"application/json",...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);
    return data;
  };
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const saved=JSON.parse(localStorage.getItem("blueCurrentV100346AcceptanceDevice")||"{}");
  let binding=null,current=null,active=0;

  const style=document.createElement("style");
  style.textContent=`
    .bc-pa{position:fixed;inset:0;z-index:2147483646;background:#061f29;color:#f5fbfc;font:600 18px/1.35 system-ui,-apple-system,sans-serif;overflow:auto;padding:calc(18px + env(safe-area-inset-top)) 18px calc(24px + env(safe-area-inset-bottom))}
    .bc-pa[hidden]{display:none}.bc-pa-return{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:2147483646;min-height:52px;padding:12px 18px;border:0;border-radius:999px;background:#087e65;color:#fff;font:800 16px system-ui;box-shadow:0 8px 30px #0008}
    .bc-pa *{box-sizing:border-box}.bc-pa__shell{max-width:820px;margin:auto}.bc-pa header{display:flex;gap:14px;align-items:center;justify-content:space-between}.bc-pa h1{font-size:clamp(25px,5vw,38px);margin:0}.bc-pa button,.bc-pa input,.bc-pa select,.bc-pa textarea{font:inherit;min-height:48px;border-radius:12px;border:1px solid #52727c}.bc-pa button{padding:11px 17px;background:#123b47;color:#fff;font-weight:800}.bc-pa button[data-outcome="CLEAR"]{background:#087e65}.bc-pa button[data-outcome="FRICTION"]{background:#9a6812}.bc-pa button[data-outcome="BLOCKED"]{background:#a63838}.bc-pa button:disabled{opacity:.45}.bc-pa__card{background:#0b2b35;border:1px solid #31515a;border-radius:18px;padding:18px;margin-top:16px}.bc-pa__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.bc-pa label{display:grid;gap:6px;font-size:14px;color:#c6d9de}.bc-pa input,.bc-pa select,.bc-pa textarea{width:100%;padding:10px;background:#fff;color:#10252b}.bc-pa textarea{min-height:92px}.bc-pa__steps{display:flex;gap:7px;overflow:auto;padding:14px 0}.bc-pa__dot{min-width:44px;padding:8px}.bc-pa__dot[data-complete="true"]{background:#087e65}.bc-pa__actions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.bc-pa__status{min-height:28px;color:#9de4d4}.bc-pa__error{color:#ffb1a9}.bc-pa__accept{background:#087e65!important;width:100%}@media(max-width:620px){.bc-pa{padding-left:12px;padding-right:12px}.bc-pa__grid{grid-template-columns:1fr}.bc-pa__actions{grid-template-columns:1fr}.bc-pa header{align-items:flex-start}.bc-pa h1{font-size:26px}}
  `;
  document.head.appendChild(style);
  const root=document.createElement("main");root.className="bc-pa";root.setAttribute("aria-label","Physical iPad acceptance walkthrough");
  root.innerHTML=`<div class="bc-pa__shell"><header><div><small>V100.3.46 · PHYSICAL IPAD</small><h1>Pilot walkthrough</h1></div><div><button id="bcPaOpenApp">Open Blue Current</button> <button id="bcPaExit">Exit</button></div></header><p id="bcPaStatus" class="bc-pa__status">Loading pilot readiness…</p><section class="bc-pa__card bc-pa__grid" id="bcPaDevice">
    <label>Operator name<input id="bcPaOperator" value="${esc(saved.operatorName||"")}" autocomplete="name"></label>
    <label>Device ID<input id="bcPaDeviceId" value="${esc(saved.deviceId||"pilot-ipad-1")}"></label>
    <label>Device model<input id="bcPaModel" value="${esc(saved.deviceModel||"iPad")}"></label>
    <label>iPadOS version<input id="bcPaOs" value="${esc(saved.osVersion||"")}" placeholder="Example: iPadOS 20"></label>
    <label>Network<input id="bcPaNetwork" value="${esc(saved.network||"")}" placeholder="Restaurant Wi-Fi name"></label>
    <label>Environment<select id="bcPaEnvironment"><option value="LAN">LAN walkthrough</option><option value="HOSTED_PILOT">Hosted pilot</option></select></label>
  </section><nav class="bc-pa__steps" id="bcPaSteps" aria-label="Walkthrough steps"></nav><section class="bc-pa__card" id="bcPaWork"></section><section class="bc-pa__card" id="bcPaSummary"></section></div>`;
  document.body.appendChild(root);
  const returnButton=document.createElement("button");returnButton.className="bc-pa-return";returnButton.textContent="Return to walkthrough";returnButton.hidden=true;document.body.appendChild(returnButton);
  const $=id=>document.getElementById(id);
  const status=(message,error=false)=>{$("bcPaStatus").textContent=message;$("bcPaStatus").classList.toggle("bc-pa__error",error);};
  function observations(){return current?.assessment?.observations||[];}
  function matching(step){return observations().filter(row=>row.workflowStep===step&&row.environment===$("bcPaEnvironment").value).at(-1);}
  function draw(){
    $("bcPaSteps").innerHTML=steps.map(([id],index)=>`<button class="bc-pa__dot" data-step="${index}" data-complete="${Boolean(matching(id))}" aria-label="Step ${index+1}">${index+1}</button>`).join("");
    const [id,label,dimension]=steps[active],row=matching(id);
    $("bcPaWork").innerHTML=`<small>STEP ${active+1} OF ${steps.length} · ${esc(dimension)}</small><h2>${esc(label)}</h2><p>Complete this job in Blue Current, return here, then record exactly what happened.</p><label>Observation note<textarea id="bcPaNote" placeholder="What happened on the physical iPad?">${esc(row?.note||"")}</textarea></label><div class="bc-pa__actions"><button data-outcome="CLEAR">Clear</button><button data-outcome="FRICTION">Friction</button><button data-outcome="BLOCKED">Blocked</button></div>`;
    const a=current?.assessment||{};
    $("bcPaSummary").innerHTML=`<h2>Evidence status</h2><p>${observations().length} observations · ${a.blockerCount||0} blockers</p><p>${a.missingWorkflowSteps?.length?`${a.missingWorkflowSteps.length} workflow steps remain.`:"Every workflow step has evidence."}</p><p>${a.missingHostedWorkflowSteps?.length?`${a.missingHostedWorkflowSteps.length} hosted steps remain before final acceptance.`:"Hosted evidence is complete."}</p>${a.ready&&!current.current?`<label>Human acceptance statement<textarea id="bcPaStatement" placeholder="Name the operator and confirm the hosted physical workflow is approved."></textarea></label><button class="bc-pa__accept" id="bcPaAccept">Record final acceptance</button>`:current.current?"<p><strong>OPERATOR ACCEPTED</strong></p>":""}`;
  }
  function device(){return{operatorName:$("bcPaOperator").value.trim(),deviceId:$("bcPaDeviceId").value.trim(),deviceModel:$("bcPaModel").value.trim(),osVersion:$("bcPaOs").value.trim(),network:$("bcPaNetwork").value.trim()};}
  async function refresh(){current=await api("/api/pilot/operator-acceptance");draw();status(current.current?"Physical operator acceptance is current.":"Walkthrough ready. Complete one step at a time.");}
  root.addEventListener("click",async event=>{
    const step=event.target.closest("[data-step]");if(step){active=Number(step.dataset.step);draw();return;}
    const outcome=event.target.closest("[data-outcome]");if(outcome){
      try{
        const info=device(),[workflowStep,,dimension]=steps[active],note=$("bcPaNote").value.trim();
        localStorage.setItem("blueCurrentV100346AcceptanceDevice",JSON.stringify(info));
        await api("/api/pilot/operator-acceptance/observe",{method:"POST",body:JSON.stringify({...info,locationId:binding.binding.locationId,dimension,workflowStep,evidenceType:"PHYSICAL_IPAD",environment:$("bcPaEnvironment").value,outcome:outcome.dataset.outcome,score:outcome.dataset.outcome==="CLEAR"?5:outcome.dataset.outcome==="FRICTION"?3:1,note,capturedAt:new Date().toISOString(),blocker:outcome.dataset.outcome==="BLOCKED"})});
        if(active<steps.length-1)active+=1;await refresh();
      }catch(error){status(error.message,true);}
      return;
    }
    if(event.target.id==="bcPaAccept")try{await api("/api/pilot/operator-acceptance/accept",{method:"POST",body:JSON.stringify({statement:$("bcPaStatement").value.trim(),physicalDeviceConfirmed:true,hostedEnvironmentConfirmed:true})});await refresh();}catch(error){status(error.message,true);}
    if(event.target.id==="bcPaOpenApp"){root.hidden=true;returnButton.hidden=false;}
    if(event.target.id==="bcPaExit"){const url=new URL(location.href);url.searchParams.delete("pilotAcceptance");location.href=url.toString();}
  });
  returnButton.addEventListener("click",()=>{returnButton.hidden=true;root.hidden=false;});
  $("bcPaEnvironment").addEventListener("change",draw);
  Promise.all([api("/api/pilot/workflow-binding"),api("/api/pilot/operator-acceptance")]).then(([b,c])=>{binding=b;current=c;if(!binding.ready)throw new Error("Pilot workflow binding is not ready. Complete pilot configuration first.");draw();status("Walkthrough ready. Complete one step at a time.");}).catch(error=>status(error.message,true));
})();
