(function(){
  "use strict";

  const overlay=document.getElementById("authOverlay");
  if(!overlay||!document.body)return;

  const inertMarker="bcAuthIsolationInert";
  const hiddenMarker="bcAuthIsolationHidden";
  const ignoredTags=new Set(["SCRIPT","STYLE","TEMPLATE"]);

  function backgroundSurfaces(){
    return [...document.body.children].filter(element=>element!==overlay&&!ignoredTags.has(element.tagName));
  }

  function lockSurface(surface){
    if(!surface.hasAttribute("inert")){
      surface.setAttribute("inert","");
      surface.dataset[inertMarker]="true";
    }
    if(surface.getAttribute("aria-hidden")!=="true"){
      surface.setAttribute("aria-hidden","true");
      surface.dataset[hiddenMarker]="true";
    }
  }

  function unlockSurface(surface){
    if(surface.dataset[inertMarker]==="true"){
      surface.removeAttribute("inert");
      delete surface.dataset[inertMarker];
    }
    if(surface.dataset[hiddenMarker]==="true"){
      surface.removeAttribute("aria-hidden");
      delete surface.dataset[hiddenMarker];
    }
  }

  function reconcile(){
    const locked=document.body.classList.contains("auth-locked")||overlay.classList.contains("open");
    backgroundSurfaces().forEach(locked?lockSurface:unlockSurface);
  }

  new MutationObserver(reconcile).observe(document.body,{
    childList:true,
    attributes:true,
    attributeFilter:["class"]
  });
  new MutationObserver(reconcile).observe(overlay,{
    attributes:true,
    attributeFilter:["class","aria-hidden","inert"]
  });

  reconcile();
  window.BlueCurrentAuthModalIsolation={reconcile};
})();
