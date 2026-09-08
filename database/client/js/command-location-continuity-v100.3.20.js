(() => {
  "use strict";
  const VERSION="100.3.20";
  const byId=id=>document.getElementById(id);
  const clean=value=>String(value||"").trim();
  let observer=null,syncing=false;

  function authority(){return window.BlueCurrentFrontlineLocation||null;}
  function allowed(){return authority()?.authorized?.()||[];}
  function locations(){const rows=window.appState?.get?.("cloudLocations");return Array.isArray(rows)?rows:[];}
  function locationLabel(id){const row=locations().find(item=>String(item?.id||item?.locationId)===String(id));return clean(row?.name||row?.displayName||id)||"Active restaurant";}
  function ensureOption(select,id){
    let option=Array.from(select.options).find(item=>item.value===id);
    if(!option){option=document.createElement("option");option.value=id;option.textContent=locationLabel(id);select.appendChild(option);}
    return option;
  }
  function renderIdentity(id){
    document.documentElement.dataset.bcActiveLocation=id;
    const foot=document.querySelector(".bc-os-rail-foot small");
    if(foot){foot.textContent=locationLabel(id);foot.title=`Active restaurant · ${locationLabel(id)}`;}
    const select=byId("bcCommandLocation");
    if(select)select.setAttribute("aria-label",`Active restaurant: ${locationLabel(id)}`);
  }
  function sync(){
    const select=byId("bcCommandLocation"),source=authority();if(!select||!source||syncing)return;
    syncing=true;observer?.disconnect();
    try{
      const authorized=allowed(),active=source.get();
      if(authorized.length){Array.from(select.options).forEach(option=>{if(!authorized.includes(option.value))option.remove();});}
      ensureOption(select,active);select.value=active;renderIdentity(active);
    }finally{observer?.observe(select,{childList:true});syncing=false;}
  }
  function report(message){
    const truth=byId("bcCommandTruth");if(truth)truth.textContent=message;
    window.dispatchEvent(new CustomEvent("bluecurrent:command-location-blocked",{detail:{message}}));
  }
  function navigateTo(id){
    const url=new URL(window.location.href);url.searchParams.set("location",id);
    window.location.assign(url.href);
  }
  function onChange(event){
    const select=event.target?.closest?.("#bcCommandLocation");if(!select)return;
    event.preventDefault();event.stopImmediatePropagation();
    const previous=authority()?.get?.()||"loc_marina",next=clean(select.value);
    try{
      if(next===previous){renderIdentity(previous);return;}
      authority().select(next);renderIdentity(next);navigateTo(next);
    }catch(error){select.value=previous;renderIdentity(previous);report(error?.message||"This restaurant is not authorized for the signed-in user.");}
  }
  function init(){
    const select=byId("bcCommandLocation");if(!select||!authority())return;
    observer=new MutationObserver(sync);observer.observe(select,{childList:true});
    document.addEventListener("change",onChange,true);
    window.addEventListener("bluecurrent:auth-session-state",()=>queueMicrotask(sync));
    window.addEventListener("bluecurrent:frontline-location-changed",event=>{const id=clean(event.detail?.locationId)||authority().get();renderIdentity(id);});
    sync();
    window.BlueCurrentCommandLocationContinuity={version:VERSION,sync,active:()=>authority().get(),allowed,locationLabel};
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();
