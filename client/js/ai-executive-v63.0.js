(function(){
"use strict";
const AI_DETAIL_KEY="bcAiAdvanced";
const EXEC_DETAIL_KEY="bcExecutiveDetail";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
function text(id){return document.getElementById(id)?.textContent?.replace(/\s+/g," ").trim()||"—";}
ready(()=>{
  // ---------- AI BRAIN ----------
  const brain=document.getElementById("restaurantAiBrainV341");
  if(brain){
    const heading=brain.querySelector(":scope > .restaurant-ai-brain-v341-heading");
    const kpis=brain.querySelector(":scope > .restaurant-ai-brain-v341-kpis");
    const layout=brain.querySelector(":scope > .restaurant-ai-brain-v341-layout");
    const lower=brain.querySelector(":scope > .restaurant-ai-brain-v341-lower");

    // Decision-first scanline.
    if(layout&&!brain.querySelector(".bc-ai-scanline")){
      const scan=document.createElement("div");
      scan.className="bc-ai-scanline";
      scan.innerHTML=`<div><small>AI BRAIN · DECISION MODE</small><strong>Recommendation first. Evidence second. Advanced intelligence only when needed.</strong></div><button type="button" class="button button-light button-small" id="bcAiAdvancedToggle">Show advanced intelligence</button>`;
      kpis?.insertAdjacentElement("afterend",scan);
    }

    // Keep top-level AI Brain experience visible; collapse the enormous nested platform underneath it.
    const advanced=Array.from(brain.children).filter(node=>
      node.tagName==="SECTION" &&
      node.id &&
      ![""].includes(node.id)
    );
    advanced.forEach(node=>node.classList.add("bc-ai-advanced-surface"));

    // Evidence/history remain available but secondary.
    lower?.classList.add("bc-ai-evidence-memory");

    let open=localStorage.getItem(AI_DETAIL_KEY)==="open";
    const toggle=document.getElementById("bcAiAdvancedToggle");
    const apply=()=>{
      brain.classList.toggle("bc-ai-advanced-open",open);
      if(toggle){
        toggle.textContent=open?"Hide advanced intelligence":"Show advanced intelligence";
        toggle.setAttribute("aria-expanded",String(open));
      }
      advanced.forEach(x=>x.setAttribute("aria-hidden",open?"false":"true"));
    };
    toggle?.addEventListener("click",()=>{open=!open;localStorage.setItem(AI_DETAIL_KEY,open?"open":"closed");apply();});
    apply();

    // Make current priority visually and semantically first.
    const priority=brain.querySelector(".restaurant-ai-brain-v341-priority");
    priority?.classList.add("bc-ai-decision-card");
    const query=brain.querySelector(".restaurant-ai-brain-v341-query");
    query?.classList.add("bc-ai-question-card");

    // Add explicit confidence/risk semantics as values change.
    const enhance=()=>{
      const risks=Number(text("restaurantAiBrainV341Risks"))||0;
      document.getElementById("restaurantAiBrainV341Risks")?.closest("article")?.classList.toggle("bc-ai-risk-kpi",risks>0);
      const actions=Number(text("restaurantAiBrainV341Actions"))||0;
      document.getElementById("restaurantAiBrainV341Actions")?.closest("article")?.classList.toggle("bc-ai-action-kpi",actions>0);
    };
    enhance();
    const scoreRoot=document.querySelector(".restaurant-ai-brain-v341-kpis");
    if(scoreRoot)new MutationObserver(enhance).observe(scoreRoot,{subtree:true,childList:true,characterData:true});
  }

  // ---------- EXECUTIVE ----------
  const executive=document.getElementById("executive-command-center");
  if(executive){
    const shell=executive.querySelector(".exec-shell");
    const kpis=executive.querySelector(".exec-kpis");
    const grid=executive.querySelector(".exec-grid");

    if(kpis&&!executive.querySelector(".bc-exec-scanline")){
      const scan=document.createElement("div");
      scan.className="bc-exec-scanline";
      scan.innerHTML=`<div><small>EXECUTIVE · PORTFOLIO NOW</small><strong>Risk first. Brief second. Location detail when leadership needs to intervene.</strong></div><button type="button" class="button button-light button-small" id="bcExecutiveDetailToggle">Show portfolio detail</button>`;
      kpis.insertAdjacentElement("beforebegin",scan);
    }

    const alerts=executive.querySelector(".exec-alerts");
    const summary=executive.querySelector(".exec-summary");
    const locations=executive.querySelector(".exec-locations");
    const detail=executive.querySelector(".exec-detail");
    const demand=executive.querySelector(".exec-demand");
    const guests=executive.querySelector(".exec-guest-moments");

    // Reorder: alerts + brief before charts/detail.
    if(grid){
      [alerts,summary,locations,detail,demand,guests].filter(Boolean).forEach(x=>grid.appendChild(x));
    }
    alerts?.classList.add("bc-exec-priority");
    summary?.classList.add("bc-exec-priority");

    const deeper=[locations,detail,demand,guests].filter(Boolean);
    deeper.forEach(x=>x.classList.add("bc-exec-detail"));

    let open=localStorage.getItem(EXEC_DETAIL_KEY)==="open";
    const toggle=document.getElementById("bcExecutiveDetailToggle");
    const apply=()=>{
      executive.classList.toggle("bc-exec-detail-open",open);
      if(toggle){
        toggle.textContent=open?"Hide portfolio detail":"Show portfolio detail";
        toggle.setAttribute("aria-expanded",String(open));
      }
      deeper.forEach(x=>x.setAttribute("aria-hidden",open?"false":"true"));
    };
    toggle?.addEventListener("click",()=>{open=!open;localStorage.setItem(EXEC_DETAIL_KEY,open?"open":"closed");apply();});
    apply();

    // Make static executive controls fully functional.
    document.getElementById("execGuestIntelligence")?.addEventListener("click",()=>{
      const target=document.getElementById("guest-intelligence");
      if(!target)return;
      const hidden=target.closest(".bc-deep-tool");
      hidden?.classList.add("bc-nav-open");
      target.scrollIntoView({behavior:"smooth",block:"start"});
    });

    document.getElementById("execDownloadBriefing")?.addEventListener("click",()=>{
      const rows=[
        "BLUE CURRENT — EXECUTIVE BRIEFING",
        `Range: ${text("execRangeLabel")}`,
        "",
        `Expected guests: ${text("execGuests")}`,
        `Reservations: ${text("execReservations")}`,
        `Calls answered: ${text("execCalls")}`,
        `Estimated revenue influenced: ${text("execRevenue")}`,
        "",
        "WHAT LEADERSHIP SHOULD KNOW",
        text("execSummaryText"),
        "",
        `Selected location: ${text("execLocationName")}`,
        `Status: ${text("execLocationStatus")}`,
        `Occupancy: ${text("execLocationOccupancy")}`,
        `Reservations: ${text("execLocationReservations")}`,
        `Calls: ${text("execLocationCalls")}`,
        `Waitlist: ${text("execLocationWaitlist")}`,
        text("execLocationNarrative")
      ];
      const blob=new Blob([rows.join("\n")],{type:"text/plain;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download=`blue-current-executive-briefing-${new Date().toISOString().slice(0,10)}.txt`;
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
    });

    // Add accessible labels to location cards and range controls.
    executive.querySelectorAll(".location-performance-row").forEach(row=>{
      row.setAttribute("role","button");row.setAttribute("tabindex","0");
      const activate=()=>row.click();
      row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();activate();}});
    });
    executive.querySelectorAll(".exec-range button").forEach(b=>b.setAttribute("aria-pressed",String(b.classList.contains("active"))));
    executive.querySelector(".exec-range")?.addEventListener("click",e=>{
      const b=e.target.closest("button");if(!b)return;
      executive.querySelectorAll(".exec-range button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
    });
  }
});
})();