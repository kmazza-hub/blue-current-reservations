(function(){"use strict";
class BlueCurrentPilotDecisionTelemetryEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4136:pilot-telemetry";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 capture(owner,note){
  const session=this.latest("bluecurrent:v4133:decision-runtime"),rehearsal=this.latest("bluecurrent:v4134:intervention-rehearsals"),cert=this.latest("bluecurrent:v4135:pilot-certifications"),state=window.BlueCurrentAppState?.getState?.()||window.blueCurrent?.state?.getState?.()||{};
  const signals={occupancy:Number(state.occupancyPercent||0),guestWait:Number(state.guestWaitMinutes||state.waitTimeMinutes||0),kitchenPressure:Number(state.kitchenPressure||0),labor:Number(state.laborPercent||state.laborPercentage||0),serviceQuality:Number(state.serviceQualityScore||0)};
  const checks=[
   {name:"Certified pilot evidence",pass:!!cert&&Number(cert.score||0)>=80,detail:cert?.id||"No pilot certificate"},
   {name:"Decision session active",pass:!!session&&session.status!=="blocked",detail:session?.id||"No session"},
   {name:"Intervention rehearsed",pass:!!rehearsal&&rehearsal.status!=="blocked",detail:rehearsal?.id||"No rehearsal"},
   {name:"Human observer assigned",pass:!!String(owner||"").trim(),detail:String(owner||"Unassigned")},
   {name:"Observation note captured",pass:!!String(note||"").trim(),detail:String(note||"No note")}
  ];
  const score=Math.round(checks.filter(x=>x.pass).length/checks.length*100);
  const result={id:`V41-TEL-${Date.now()}`,owner:String(owner||"Pilot observer").trim(),note:String(note||"").trim(),score,status:score===100?"observed":score>=80?"controlled":"incomplete",signals,sessionId:session?.id||null,rehearsalId:rehearsal?.id||null,certificateId:cert?.id||null,checks,capturedAt:new Date().toISOString()};
  const h=this.read(this.key,[]);h.unshift(result);localStorage.setItem(this.key,JSON.stringify(h.slice(0,100)));this.eventBus?.emit?.("v41:pilot-telemetry-captured",result);return result;
 }
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentPilotDecisionTelemetryEngine=BlueCurrentPilotDecisionTelemetryEngine;})();