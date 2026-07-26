(() => {
"use strict";
const ids={
weather:"weatherCondition",
temp:"weatherTemperature",
impact:"weatherImpact",
forecast:"forecastRevenue",
res:"operationReservations",
labor:"operationLabor"
};
const $=id=>document.getElementById(id);

function score(){
  let value=100;
  const labor=parseFloat(($("operationLabor")?.textContent||"28").replace("%",""));
  const reservations=parseInt(($("operationReservations")?.textContent||"0"),10);
  const weather=($("weatherCondition")?.textContent||"").toLowerCase();
  const pto=parseInt(($("operationPto")?.textContent||"0"),10);

  if(labor>30) value-=8;
  else if(labor>28) value-=4;

  if(weather.includes("storm")||weather.includes("rain")) value-=6;
  if(pto>2) value-=5;
  if(reservations>120) value+=3;

  value=Math.max(0,Math.min(100,value));

  const scoreEl=document.getElementById("managerReadinessScore");
  const label=document.getElementById("managerReadinessLabel");
  if(scoreEl) scoreEl.textContent=value+"%";
  if(label){
    label.textContent=
      value>=95?"Excellent":
      value>=85?"Strong":
      value>=70?"Watch List":"Needs Attention";
  }
}

function init(){
  score();
  if(window.MutationObserver){
    const obs=new MutationObserver(()=>score());
    ["operationLabor","operationReservations","operationPto","weatherCondition"].forEach(id=>{
      const el=$(id);
      if(el) obs.observe(el,{childList:true,subtree:true,characterData:true});
    });
  }
}
document.readyState==="loading"
?document.addEventListener("DOMContentLoaded",init,{once:true})
:init();
})();
