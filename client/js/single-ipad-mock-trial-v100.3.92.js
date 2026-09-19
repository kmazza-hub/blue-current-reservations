(() => {
  "use strict";
  const VERSION="100.3.89";
  const root=()=>document.getElementById("guest-journey-live");
  const play=()=>document.getElementById("guestJourneyPlay");

  function exposeAndRun(){
    const journey=root();
    const trigger=play();
    if(!journey||!trigger) return false;
    journey.hidden=false;
    journey.removeAttribute("inert");
    journey.setAttribute("aria-hidden","false");
    journey.classList.add("bc-workspace-visible","bc-single-ipad-rehearsal-open");
    journey.style.setProperty("display","block","important");
    trigger.disabled=false;
    trigger.click();
    journey.scrollIntoView({behavior:"smooth",block:"start"});
    window.setTimeout(()=>trigger.focus({preventScroll:true}),350);
    return true;
  }

  function enhance(){
    const journey=root();
    if(journey){
      journey.dataset.bcSandboxMode="single-ipad";
      journey.dataset.bcPersistentWrites="false";
      if(!document.getElementById("bcSingleIpadSandboxNotice")){
        const notice=document.createElement("p");
        notice.id="bcSingleIpadSandboxNotice";
        notice.className="bc-single-ipad-sandbox-notice";
        notice.innerHTML="<strong>Single-iPad sandbox</strong><span>This rehearsal changes presentation state only. No reservation, table, guest, or restaurant record is saved.</span>";
        const controls=journey.querySelector(".guest-journey-live-actions,.guest-journey-actions");
        (controls?.parentElement||journey).insertBefore(notice,controls||journey.firstChild);
      }
      const trigger=play();
      if(trigger){
        trigger.dataset.bcMockTrial="safe";
        trigger.setAttribute("aria-describedby","bcSingleIpadSandboxNotice");
      }
    }

    const readiness=document.getElementById("prodRunReadiness");
    const actions=readiness?.closest(".production-actions");
    if(actions&&!document.getElementById("bcSingleIpadRehearsalOpen")){
      const launch=document.createElement("button");
      launch.type="button";
      launch.id="bcSingleIpadRehearsalOpen";
      launch.className="button button-primary bc-touch-control";
      launch.textContent="Run single-iPad rehearsal";
      launch.setAttribute("aria-describedby","bcSingleIpadRehearsalSafety");
      launch.addEventListener("click",exposeAndRun);
      actions.appendChild(launch);
      const safety=document.createElement("small");
      safety.id="bcSingleIpadRehearsalSafety";
      safety.textContent="Safe simulation · no restaurant records are saved";
      actions.insertAdjacentElement("afterend",safety);
    }

    document.querySelectorAll("button").forEach((button)=>{
      if(button.textContent.trim().toLowerCase()==="got it"){
        button.classList.add("bc-min-target-v100-3-89");
        button.style.setProperty("min-height","44px","important");
        button.style.setProperty("height","44px","important");
      }
    });
  }

  const observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",enhance,{once:true});
  else enhance();

  window.__bcSingleIpadMockTrialV100_3_89={
    version:VERSION,
    mode:"presentation-only",
    persistentWrites:false,
    run:exposeAndRun,
    snapshot(){
      const journey=root();
      return {
        version:VERSION,
        initialized:typeof window.createBlueCurrentGuestJourneyModule==="function",
        sandbox:journey?.dataset.bcSandboxMode==="single-ipad",
        persistentWrites:false,
        visible:!!journey&&getComputedStyle(journey).display!=="none",
        guest:document.getElementById("guestJourneyGuest")?.textContent?.trim()||"",
        stage:document.getElementById("guestJourneyCurrentStage")?.textContent?.trim()||"",
        progress:document.getElementById("guestJourneyProgress")?.textContent?.trim()||""
      };
    }
  };
  window.dispatchEvent(new CustomEvent("bc:single-ipad-mock-ready",{detail:{version:VERSION,persistentWrites:false}}));
})();