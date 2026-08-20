(function(){
"use strict";
const STORAGE_KEY="blueCurrentAdvancedSurfaces";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
ready(function(){
  const main=document.getElementById("main");
  const command=document.getElementById("command-center");
  if(!main||!command)return;

  // Everything intentionally inserted before the Restaurant Command Center is retained as
  // an advanced/internal surface, but no longer dominates the default operator experience.
  const advanced=[];
  for(const child of Array.from(main.children)){
    if(child===command)break;
    if(child.tagName==="SECTION"){
      // V100.2.0: the Hospitality OS shell is application chrome, not a legacy
      // product/certification surface. Legacy product-mode classification must
      // never own, hide, or restyle it.
      if(child.id==="blueCurrentCommand" || child.classList.contains("bc-os-shell")) continue;
      child.classList.add("bc-advanced-surface");
      advanced.push(child);
    }
  }

  const query=new URLSearchParams(location.search);
  let expanded=query.get("advanced")==="1" || localStorage.getItem(STORAGE_KEY)==="open";

  const bar=document.createElement("section");
  bar.className="bc-product-mode-bar container";
  bar.setAttribute("aria-label","Product experience controls");
  bar.innerHTML=`<div class="bc-product-mode-copy"><small>BLUE CURRENT · PRODUCT MODE</small><strong>Restaurant operations first.</strong><span>${advanced.length} advanced certification, pilot, and release-control surfaces remain available when needed.</span></div><button class="button button-light button-small" id="bcAdvancedToggle" type="button"></button>`;
  main.insertBefore(bar,command);

  function apply(){
    document.documentElement.classList.toggle("bc-advanced-open",expanded);
    const button=document.getElementById("bcAdvancedToggle");
    if(button){
      button.textContent=expanded?"Hide advanced controls":"Show advanced controls";
      button.setAttribute("aria-expanded",String(expanded));
    }
    advanced.forEach(x=>x.setAttribute("aria-hidden",expanded?"false":"true"));
  }
  document.getElementById("bcAdvancedToggle")?.addEventListener("click",()=>{
    expanded=!expanded;
    localStorage.setItem(STORAGE_KEY,expanded?"open":"closed");
    apply();
    if(expanded) advanced[0]?.scrollIntoView({behavior:"smooth",block:"start"});
  });
  apply();

  // Remove stale version language from the visible product shell.
  document.querySelectorAll("[data-bc-runtime-version]").forEach(x=>x.textContent="V59.50");

  // Make the active primary navigation state follow the operator's current workspace.
  const navLinks=Array.from(document.querySelectorAll(".desktop-nav a[href^='#']"));
  const targets=navLinks.map(a=>document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if("IntersectionObserver" in window){
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      navLinks.forEach(a=>a.removeAttribute("aria-current"));
      document.querySelector(`.desktop-nav a[href="#${CSS.escape(visible.target.id)}"]`)?.setAttribute("aria-current","page");
    },{rootMargin:"-20% 0px -65% 0px",threshold:[0,.1,.25]});
    targets.forEach(t=>observer.observe(t));
  }
});
})();