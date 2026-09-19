(() => {
  "use strict";
  const VERSION="100.3.87";
  const root=()=>document.getElementById("guest-journey-live");

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
        const controls=journey.querySelector(".v4316-actions,.guest-journey-actions");
        (controls?.parentElement||journey).insertBefore(notice,controls||journey.firstChild);
      }
      const play=document.getElementById("guestJourneyPlay");
      if(play){
        play.dataset.bcMockTrial="safe";
        play.setAttribute("aria-describedby","bcSingleIpadSandboxNotice");
      }
    }

    document.querySelectorAll("button").forEach((button)=>{
      if(button.textContent.trim().toLowerCase()==="got it"){
        button.classList.add("bc-min-target-v100-3-87");
        button.style.minHeight="44px";
      }
    });
  }

  const observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",enhance,{once:true});
  else enhance();

  window.__bcSingleIpadMockTrialV100_3_87={
    version:VERSION,
    mode:"presentation-only",
    persistentWrites:false,
    snapshot(){
      const journey=root();
      return {
        version:VERSION,
        sandbox:journey?.dataset.bcSandboxMode==="single-ipad",
        persistentWrites:false,
        guest:document.getElementById("guestJourneyGuest")?.textContent?.trim()||"",
        stage:document.getElementById("guestJourneyCurrentStage")?.textContent?.trim()||"",
        progress:document.getElementById("guestJourneyProgress")?.textContent?.trim()||""
      };
    }
  };
  window.dispatchEvent(new CustomEvent("bc:single-ipad-mock-ready",{detail:{version:VERSION,persistentWrites:false}}));
})();