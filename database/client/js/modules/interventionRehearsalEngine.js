(function(){"use strict";
class BlueCurrentInterventionRehearsalEngine{
 constructor(eventBus,appState){this.eventBus=eventBus;this.appState=appState;this.key="bluecurrent:v4134:intervention-rehearsals";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 state(){try{return this.appState?.getState?.()||{};}catch{return {};}}
 run(owner){
  const session=this.latest("bluecurrent:v4133:decision-runtime"),optimization=this.latest("bluecurrent:v4130:predictive-optimizations"),plan=this.latest("bluecurrent:v418:multi-step-plans"),state=this.state();
  const wait=Number(state.guestWaitMinutes??state.guestWait??0),kitchen=Number(state.kitchenPressure??0),labor=Number(state.laborPercent??state.laborPercentage??0);
  const strategy=session?.strategy||optimization?.recommended||null;
  const steps=[
   {name:"Confirm live operating evidence",pass:!!session&&session.status!=="blocked",detail:session?.id||"No runtime session"},
   {name:"Rehearse preferred strategy",pass:!!strategy,detail:strategy?.name||"No selected strategy"},
   {name:"Review human approvals",pass:!!plan||!!session,detail:plan?.id||session?.id||"No approval path"},
   {name:"Validate kitchen constraint",pass:kitchen<95,detail:`Kitchen pressure ${kitchen}%`},
   {name:"Validate labor constraint",pass:labor<45,detail:`Labor ${labor}%`},
   {name:"Preserve guest recovery path",pass:wait<45,detail:`Guest wait ${wait} min`}
  ];
  const passed=steps.filter(x=>x.pass).length,score=Math.round(passed/steps.length*100),risks=steps.filter(x=>!x.pass).length;
  const result={id:`V41-REHEARSE-${Date.now()}`,owner:String(owner||"Rehearsal owner").trim(),score,status:score===100?"rehearsed":score>=80?"conditional":"blocked",risks,strategy,inputs:{wait,kitchen,labor},steps,createdAt:new Date().toISOString(),mode:"isolated-simulation"};
  const h=this.read(this.key,[]);h.unshift(result);localStorage.setItem(this.key,JSON.stringify(h.slice(0,30)));this.eventBus?.emit?.("intervention-rehearsal:completed",result);return result;
 }
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentInterventionRehearsalEngine=BlueCurrentInterventionRehearsalEngine;})();