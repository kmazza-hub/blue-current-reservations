(function(){
"use strict";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
ready(()=>{
  const body=document.body;
  if(!body?.matches('[data-web-launch-face="37"]'))return;

  // Keep public-facing branding consistent everywhere it is rendered.
  document.querySelectorAll(".brand-copy small").forEach(el=>{
    if(/hospitality os/i.test(el.textContent||"")) el.textContent="Hospitality OS";
  });

  // Prevent empty or malformed public links from behaving like finished CTAs.
  document.querySelectorAll('header a, footer a, .hero a, #pilot a').forEach(link=>{
    const href=(link.getAttribute("href")||"").trim();
    if(!href){
      link.setAttribute("aria-disabled","true");
      link.setAttribute("tabindex","-1");
    }
  });

  // Public launch diagnostics remain non-visual but available for QA.
  const required=[
    "experience","service-speed","operating-current","profit-current",
    "intelligence-current","blue-current-standard","pilot"
  ];
  const missing=required.filter(id=>!document.getElementById(id));
  document.documentElement.dataset.bcLaunchFace="WEB-037";
  document.documentElement.dataset.bcLaunchFaceMissing=String(missing.length);

  window.BlueCurrentPublicFace={
    version:"WEB-037",
    category:"Hospitality Operating System",
    requiredSections:required.slice(),
    missingSections:missing.slice(),
    ready:missing.length===0
  };
});
})();