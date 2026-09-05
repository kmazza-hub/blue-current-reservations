(() => {
  "use strict";
  const VERSION="100.3.17",KEY="blueCurrent.frontline.location.v100",FALLBACK="loc_marina";
  const clean=value=>String(value||"").trim().slice(0,80);
  const requested=()=>{try{return clean(new URLSearchParams(location.search).get("location"));}catch{return "";}};
  const authorized=()=>{const rows=window.appState?.get?.("authorizedLocationIds");return Array.isArray(rows)?rows.map(clean).filter(Boolean):[];};
  const stored=()=>{try{return clean(localStorage.getItem(KEY));}catch{return "";}};
  const remember=value=>{try{localStorage.setItem(KEY,value);}catch{}return value;};
  function resolve(){
    const allowed=authorized(),candidate=requested()||stored();
    if(allowed.length){
      if(candidate&&allowed.includes(candidate))return remember(candidate);
      if(allowed.includes(FALLBACK))return remember(FALLBACK);
      return remember(allowed[0]);
    }
    return candidate||FALLBACK;
  }
  function select(value){
    const next=clean(value),allowed=authorized();
    if(!next)throw new Error("Location is required");
    if(allowed.length&&!allowed.includes(next))throw new Error("Location is not authorized for this user");
    remember(next);window.appState?.update?.({activeLocationId:next});
    window.dispatchEvent(new CustomEvent("bluecurrent:frontline-location-changed",{detail:{locationId:next}}));
    return next;
  }
  const reference=Object.freeze({toString:resolve,toJSON:resolve,[Symbol.toPrimitive]:resolve});
  window.BlueCurrentFrontlineLocation={version:VERSION,get:resolve,select,authorized,reference,key:KEY,fallback:FALLBACK};
  window.addEventListener("bluecurrent:auth-session-state",()=>window.appState?.update?.({activeLocationId:resolve()}));
})();
