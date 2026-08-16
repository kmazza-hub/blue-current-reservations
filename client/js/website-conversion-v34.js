(function(){"use strict";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
ready(()=>{
 if(!document.querySelector(".hero")||document.getElementById("bcConversionFloat"))return;
 const float=document.createElement("aside");
 float.id="bcConversionFloat";float.className="bc-conversion-float";
 float.innerHTML='<span>See Blue Current in your operation</span><a href="#pilot">Private walkthrough</a>';
 document.body.appendChild(float);
 const pilot=document.getElementById("pilot");
 const update=()=>{
   const y=window.scrollY||document.documentElement.scrollTop;
   const show=y>Math.max(520,window.innerHeight*.72);
   let nearPilot=false;
   if(pilot){const r=pilot.getBoundingClientRect();nearPilot=r.top<window.innerHeight*.92;}
   float.classList.toggle("is-visible",show&&!nearPilot);
 };
 window.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update);update();
 document.documentElement.dataset.bcWebsiteConversion="WEB-034";
});
})();