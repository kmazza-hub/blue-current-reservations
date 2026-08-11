(function(){
"use strict";
const STAFF_DETAIL_KEY="bcStaffDetail";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
ready(()=>{
  // ---------- STAFF ----------
  const staff=document.getElementById("workforce-intelligence");
  if(staff){
    const heading=staff.querySelector(".section-heading");
    const h2=heading?.querySelector("h2");
    const p=heading?.querySelector("p:last-child");
    if(h2)h2.textContent="Know if tonight is covered before the rush finds the gap.";
    if(p)p.textContent="See who is working, where coverage is thin, and which staffing decision needs attention now.";

    const scan=document.createElement("div");
    scan.className="bc-staff-scanline reveal";
    scan.innerHTML=`<div><small>STAFF · SHIFT COVERAGE</small><strong>Coverage first. Risk second. Labor detail only when you need it.</strong></div><a href="#service-coordination">Open service coordination</a>`;
    heading?.insertAdjacentElement("afterend",scan);

    const main=staff.querySelector(".wf-main");
    const bottom=staff.querySelector(".wf-bottom");
    const coverage=main?.querySelector(":scope > aside");
    const marketplace=bottom?.querySelector(":scope > article:last-child");
    const details=[coverage,marketplace].filter(Boolean);
    details.forEach(x=>x.classList.add("bc-staff-detail"));

    if(details.length){
      const dock=document.createElement("div");
      dock.className="bc-staff-detail-dock reveal";
      dock.innerHTML=`<div><small>STAFFING DETAIL</small><strong>Coverage matrix, open shifts, and decision history</strong><span>Useful for solving a gap—not necessary for every manager glance.</span></div><button type="button" class="button button-light button-small" id="bcStaffDetailToggle">Show staffing detail</button>`;
      bottom?.insertAdjacentElement("afterend",dock);
      let open=localStorage.getItem(STAFF_DETAIL_KEY)==="open";
      const button=dock.querySelector("button");
      const apply=()=>{
        staff.classList.toggle("bc-staff-detail-open",open);
        button.textContent=open?"Hide staffing detail":"Show staffing detail";
        button.setAttribute("aria-expanded",String(open));
        details.forEach(x=>x.setAttribute("aria-hidden",open?"false":"true"));
      };
      button.addEventListener("click",()=>{open=!open;localStorage.setItem(STAFF_DETAIL_KEY,open?"open":"closed");apply();});
      apply();
    }

    // Make callout risk the most obvious staffing KPI when populated.
    const risk=document.getElementById("workforceRisk")?.closest("article");
    risk?.classList.add("bc-staff-risk-kpi");
    const recs=document.getElementById("workforceRecommendations")?.closest(".wf-panel");
    recs?.classList.add("bc-staff-actions");
  }

  // ---------- KITCHEN ----------
  const kitchen=document.getElementById("kitchenThroughputCenter");
  if(kitchen){
    const header=kitchen.querySelector(":scope > header");
    const title=document.getElementById("ktTitle");
    if(title)title.textContent="Keep the line moving before ticket time becomes the problem.";

    const scan=document.createElement("div");
    scan.className="bc-kitchen-scanline";
    scan.innerHTML=`<div><small>KITCHEN · NOW</small><strong>Take the recommended move first. Use station pressure to understand why.</strong></div><a href="#service-coordination">See service impact</a>`;
    header?.insertAdjacentElement("afterend",scan);

    const grid=kitchen.querySelector(".kt-grid");
    if(grid){
      const sections=Array.from(grid.children);
      const stations=sections.find(x=>/Station pressure/i.test(x.querySelector("h3")?.textContent||""));
      const actions=sections.find(x=>/Recommended moves/i.test(x.querySelector("h3")?.textContent||""));
      if(actions&&stations){
        grid.insertBefore(actions,stations);
        actions.classList.add("bc-kitchen-actions");
        stations.classList.add("bc-kitchen-stations");
      }
    }

    const enhance=()=>{
      document.querySelectorAll("#ktActions article").forEach(article=>{
        const priority=(article.dataset.priority||"").toLowerCase();
        article.classList.toggle("bc-urgent",priority==="critical"||priority==="high");
        const button=article.querySelector("button:not(:disabled)");
        if(button&&button.textContent.trim()==="Approve")button.textContent="Approve move";
      });
      document.querySelectorAll("#ktStations article").forEach(article=>{
        if(article.querySelector(".bc-station-state"))return;
        const state=article.dataset.load||"healthy";
        const tag=document.createElement("em");tag.className="bc-station-state";tag.textContent=state==="critical"?"Critical":state==="watch"?"Watch":"Healthy";
        article.appendChild(tag);
      });
    };
    enhance();
    const observer=new MutationObserver(enhance);
    const actions=document.getElementById("ktActions"),stations=document.getElementById("ktStations");
    if(actions)observer.observe(actions,{childList:true,subtree:true});
    if(stations)observer.observe(stations,{childList:true,subtree:true});
  }

  // ---------- SERVICE ----------
  const service=document.getElementById("service-coordination");
  if(service){
    // Explicit accessible names for table filters/actions.
    service.querySelectorAll("[data-svc-filter]").forEach(button=>{
      button.setAttribute("aria-pressed",String(button.classList.contains("active")));
      button.addEventListener("click",()=>{
        service.querySelectorAll("[data-svc-filter]").forEach(x=>x.setAttribute("aria-pressed",String(x===button)));
      });
    });

    const enhanceService=()=>{
      document.querySelectorAll("#svcFlowBody [data-deliver], #svcExpoQueue [data-deliver]").forEach(button=>{
        button.textContent=button.textContent.includes("Run")?"Run food":"Deliver";
        button.setAttribute("aria-label",`${button.textContent}. Mark food delivered to the table.`);
      });
      const risk=Number(document.getElementById("svcRisk")?.textContent||0);
      document.getElementById("svcRisk")?.closest("article")?.classList.toggle("bc-service-risk",risk>0);
      const ready=Number(document.getElementById("svcReady")?.textContent||0);
      document.getElementById("svcReady")?.closest("article")?.classList.toggle("bc-service-ready",ready>0);
    };
    enhanceService();
    const svcObserver=new MutationObserver(enhanceService);
    ["svcFlowBody","svcExpoQueue","svcAlerts"].forEach(id=>{
      const node=document.getElementById(id);if(node)svcObserver.observe(node,{childList:true,subtree:true});
    });
  }
});
})();