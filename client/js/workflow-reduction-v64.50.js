(function(){
"use strict";
const ROUTES={
  floor:{target:"host-stand",view:"floor",label:"Manage floor"},
  walkin:{target:"host-stand",view:"waitlist",action:"bcWalkInQuickAdd",label:"Add walk-in"},
  reservations:{target:"host-stand",view:"reservations",label:"Reservations"},
  addReservation:{target:"host-stand",view:"reservations",action:"bcReservationQuickAdd",label:"Add reservation"},
  guests:{target:"host-stand",view:"guests",focus:"bcGuestSearchInput",label:"Find guest"},
  staff:{target:"workforce-intelligence",label:"Staffing"},
  kitchen:{target:"kitchenThroughputCenter",label:"Kitchen pressure"},
  service:{target:"service-coordination",label:"Service coordination"},
  ai:{target:"restaurantAiBrainV341",focus:"restaurantAiBrainV341Prompt",label:"Ask Blue Current"},
  executive:{target:"executive-command-center",label:"Leadership decision"}
};
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
function reveal(target){
  window.BlueCurrentUsability?.revealTargetById?.(target.id);
  let n=target;
  while(n&&n!==document.body){
    if(n.classList?.contains("bc-deep-tool"))n.classList.add("bc-nav-open");
    if(n.classList?.contains("bc-ai-advanced-surface")){
      document.getElementById("restaurantAiBrainV341")?.classList.add("bc-ai-advanced-open");
      n.classList.add("bc-ai-nav-open");
    }
    n=n.parentElement;
  }
}
function activateHostView(view){
  if(!view)return;
  const button=document.querySelector(`#host-stand [data-host-view="${CSS.escape(view)}"]`);
  button?.click();
}
function openWorkflow(key,{silent=false}={}){
  const route=ROUTES[key];if(!route)return false;
  const target=document.getElementById(route.target);if(!target)return false;
  reveal(target);
  activateHostView(route.view);
  target.scrollIntoView({behavior:"smooth",block:"start"});
  history.replaceState(null,"",`#${route.target}`);
  setTimeout(()=>{
    if(route.action)document.getElementById(route.action)?.click();
    if(route.focus)document.getElementById(route.focus)?.focus();
  },260);
  if(!silent)window.BlueCurrentFeedback?.toast?.(`${route.label} opened.`,"info",1800);
  return true;
}
ready(()=>{
  window.BlueCurrentWorkflows={version:"64.50.0",routes:{...ROUTES},open:openWorkflow};

  // Remove any stale duplicate jump nav generated before this script ran.
  document.getElementById("bcPrimaryJump")?.remove();

  // One compact "Quick jobs" control lives in the operator utility bar.
  const utility=document.getElementById("bcOperatorUtilityBar");
  const actions=utility?.querySelector(".bc-operator-utility-actions");
  if(actions&&!document.getElementById("bcQuickJobsButton")){
    const wrap=document.createElement("div");
    wrap.className="bc-quick-jobs";
    wrap.innerHTML=`
      <button type="button" class="button button-primary button-small" id="bcQuickJobsButton" aria-expanded="false" aria-controls="bcQuickJobsMenu">Quick jobs</button>
      <div class="bc-quick-jobs-menu" id="bcQuickJobsMenu" hidden>
        <small>ONE JOB · ONE HOME</small>
        <button type="button" data-bc-job="walkin"><strong>Add walk-in</strong><span>Floor / Waitlist</span></button>
        <button type="button" data-bc-job="addReservation"><strong>Add reservation</strong><span>Reservations</span></button>
        <button type="button" data-bc-job="guests"><strong>Find guest</strong><span>Guest search</span></button>
        <button type="button" data-bc-job="staff"><strong>Solve staffing</strong><span>Staff</span></button>
        <button type="button" data-bc-job="kitchen"><strong>Fix kitchen pressure</strong><span>Kitchen</span></button>
        <button type="button" data-bc-job="service"><strong>Run service</strong><span>Service coordination</span></button>
        <button type="button" data-bc-job="ai"><strong>Ask Blue Current</strong><span>AI Brain</span></button>
        <button type="button" data-bc-job="executive"><strong>Leadership decision</strong><span>Executive</span></button>
      </div>`;
    actions.prepend(wrap);

    const trigger=wrap.querySelector("#bcQuickJobsButton");
    const menu=wrap.querySelector("#bcQuickJobsMenu");
    const close=()=>{menu.hidden=true;trigger.setAttribute("aria-expanded","false");};
    const open=()=>{menu.hidden=false;trigger.setAttribute("aria-expanded","true");menu.querySelector("button")?.focus();};

    trigger.addEventListener("click",()=>menu.hidden?open():close());
    wrap.querySelectorAll("[data-bc-job]").forEach(button=>{
      button.addEventListener("click",()=>{
        const key=button.dataset.bcJob;
        close();openWorkflow(key);
      });
    });
    document.addEventListener("click",event=>{if(!wrap.contains(event.target))close();});
    wrap.addEventListener("keydown",event=>{
      if(event.key==="Escape"){close();trigger.focus();}
    });
  }

  // Canonicalize common cross-workspace CTA buttons where the intent is unambiguous.
  const canonical=[
    ["#execGuestIntelligence","guests"],
    ["#bcReservationQuickAdd","addReservation"],
    ["#bcWalkInQuickAdd","walkin"]
  ];
  canonical.forEach(([selector,key])=>{
    const button=document.querySelector(selector);
    if(button)button.dataset.bcCanonicalJob=key;
  });

  // Make repeated concept links visibly secondary when the job already has a canonical home.
  document.querySelectorAll("#command-center button").forEach(button=>{
    const t=button.textContent.replace(/\s+/g," ").trim().toLowerCase();
    if(["view analytics","view breakdown","view more activity"].includes(t))button.classList.add("bc-deeper-action");
  });

  // Explain canonical job ownership non-visually for QA/training.
  document.documentElement.dataset.bcWorkflowVersion="64.50.0";
});
})();