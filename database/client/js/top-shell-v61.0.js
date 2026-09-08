(function(){
"use strict";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
ready(()=>{
  const product=document.querySelector(".bc-product-mode-bar");
  const shift=document.getElementById("bcShiftFocusBar");
  if(!product||!shift)return;

  const shell=document.createElement("section");
  shell.id="bcOperatorUtilityBar";
  shell.className="bc-operator-utility container";
  shell.innerHTML=`
    <div class="bc-operator-utility-copy">
      <small>BLUE CURRENT · SHIFT MODE</small>
      <strong>Restaurant operations first.</strong>
      <span>Primary work stays visible. Insights and advanced controls stay one click away.</span>
    </div>
    <div class="bc-operator-utility-actions"></div>`;

  const actions=shell.querySelector(".bc-operator-utility-actions");
  ["bcFocusMode","bcInsightsToggle","bcAdvancedToggle"].forEach(id=>{
    const b=document.getElementById(id);
    if(b)actions.appendChild(b);
  });

  product.insertAdjacentElement("beforebegin",shell);
  product.classList.add("bc-shell-merged-source");
  shift.classList.add("bc-shell-merged-source");

  // Remove the generic purpose pill from the control shell area if one was injected.
  [product,shift].forEach(node=>node.querySelectorAll(":scope > .bc-purpose-chip").forEach(x=>x.remove()));
});
})();