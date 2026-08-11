(function(){
"use strict";
const KEY="bcRushModeV6550";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
function q(id){return document.getElementById(id);}
function openJob(job){return window.BlueCurrentWorkflows?.open?.(job);}
ready(()=>{
  const utility=q("bcOperatorUtilityBar");
  if(!utility)return;

  let rush=localStorage.getItem(KEY)!=="off";
  const actions=utility.querySelector(".bc-operator-utility-actions");
  if(actions&&!q("bcRushModeToggle")){
    const b=document.createElement("button");
    b.id="bcRushModeToggle";b.type="button";b.className="button button-primary button-small";
    actions.prepend(b);
  }

  const toggle=q("bcRushModeToggle");
  function apply(){
    document.documentElement.classList.toggle("bc-rush-mode",rush);
    toggle.textContent=rush?"Rush Mode ✓":"Use Rush Mode";
    toggle.setAttribute("aria-pressed",String(rush));
    localStorage.setItem(KEY,rush?"on":"off");
  }
  toggle?.addEventListener("click",()=>{rush=!rush;apply();});
  apply();

  // Persistent one-tap rush actions.
  if(!q("bcRushDock")){
    const dock=document.createElement("nav");
    dock.id="bcRushDock";dock.className="bc-rush-dock";
    dock.setAttribute("aria-label","Rush-hour actions");
    dock.innerHTML=`
      <button type="button" data-rush-job="walkin"><strong>Walk-in</strong><span>Add guest</span></button>
      <button type="button" data-rush-job="addReservation"><strong>Reservation</strong><span>Add booking</span></button>
      <button type="button" data-rush-job="guests"><strong>Find guest</strong><span>Search</span></button>
      <button type="button" data-rush-job="service"><strong>Service</strong><span>Run floor</span></button>
      <button type="button" data-rush-job="kitchen"><strong>Kitchen</strong><span>Pressure</span></button>
      <button type="button" data-rush-job="staff"><strong>Staff</strong><span>Coverage</span></button>`;
    document.body.appendChild(dock);
    dock.querySelectorAll("[data-rush-job]").forEach(button=>button.addEventListener("click",()=>openJob(button.dataset.rushJob)));
  }

  // Host: make active rush controls easier to hit, hide secondary/admin clutter in Rush Mode.
  const host=q("host-stand");
  if(host){
    const quickIds=["addWalkIn","hostSearchGuest","hostAddReservation"];
    quickIds.forEach(id=>q(id)?.classList.add("bc-rush-primary-action"));

    // Promote current waiting/arrival queues and floor map.
    ["hostFloorMap","waitlistQueue","arrivalQueue"].forEach(id=>q(id)?.classList.add("bc-rush-core"));

    // Any nested advanced section under Host is hidden during Rush Mode unless directly opened.
    host.querySelectorAll(".bc-deep-tool,.bc-advanced-surface").forEach(x=>x.classList.add("bc-rush-hide"));
  }

  // Service: make ready-food and high-risk filters one-tap shortcuts.
  const svc=q("service-coordination");
  if(svc){
    svc.querySelectorAll("[data-svc-filter]").forEach(btn=>{
      const f=btn.dataset.svcFilter;
      if(["high","critical","ready"].includes(f))btn.classList.add("bc-rush-filter");
    });
  }

  // Kitchen: highest-impact action card always first.
  const actionsList=q("ktActions");
  function sortKitchen(){
    if(!actionsList)return;
    const cards=Array.from(actionsList.children);
    const rank={critical:0,high:1,medium:2,low:3};
    cards.sort((a,b)=>(rank[(a.dataset.priority||"medium").toLowerCase()]??2)-(rank[(b.dataset.priority||"medium").toLowerCase()]??2));
    cards.forEach(c=>actionsList.appendChild(c));
  }
  sortKitchen();
  if(actionsList)new MutationObserver(sortKitchen).observe(actionsList,{childList:true});

  // Staff: bring recommendations up and allow fast first action.
  const recs=q("workforceRecommendations");
  if(recs){
    recs.closest(".wf-panel")?.classList.add("bc-rush-staff-actions");
  }

  // Keyboard shortcuts for common jobs; don't fire while typing.
  document.addEventListener("keydown",event=>{
    const tag=document.activeElement?.tagName;
    if(["INPUT","TEXTAREA","SELECT"].includes(tag))return;
    if(!event.altKey)return;
    const map={"1":"walkin","2":"addReservation","3":"guests","4":"service","5":"kitchen","6":"staff"};
    const job=map[event.key];
    if(job){event.preventDefault();openJob(job);}
  });

  // Expose rush QA state.
  window.BlueCurrentRush={
    version:"65.50.0",
    open:openJob,
    enabled:()=>rush
  };
  document.documentElement.dataset.bcRushVersion="65.50.0";
});
})();