(() => {
  "use strict";
  const KEYS={
    incidents:"blueCurrent.incidentResponse.v34.0.6",
    floor:"blueCurrent.liveFloorOperations.v35.0.3",
    kitchen:"blueCurrent.kitchenExpo.v35.0.8",
    handoff:"blueCurrent.serverHandoff.v35.1.0",
    outcomes:"blueCurrent.decisionOutcomeTracker.v34.0.12"
  };
  const byId=id=>document.getElementById(id);
  const CALIBRATION_KEY="blueCurrent.outcomeLearningCalibration.v34.0.13.6";
  const read=key=>{try{return JSON.parse(localStorage.getItem(key))||{}}catch{return{}}};
  const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
  let sourceTarget="liveShiftCommander";

  function collect(){
    const incidents=read(KEYS.incidents).incidents||[];
    const tables=read(KEYS.floor).tables||[];
    const tickets=read(KEYS.kitchen).tickets||[];
    const handoffs=read(KEYS.handoff).handoffs||[];
    const outcomes=read(KEYS.outcomes).outcomes||[];

    const open=Array.isArray(incidents)?incidents.filter(i=>i.status==="open"):[];
    const occupied=Array.isArray(tables)?tables.filter(t=>t.status==="occupied"):[];
    const attention=Array.isArray(tables)?tables.filter(t=>t.status==="attention"):[];
    const lateTickets=Array.isArray(tickets)?tickets.filter(t=>{
      const start=t.firedAt||t.createdAt;
      return start&&t.status!=="ready"&&(Date.now()-new Date(start).getTime())/60000>=Number(t.target||15);
    }):[];
    const activeTickets=Array.isArray(tickets)?tickets.filter(t=>t.status!=="ready"):[];
    const lateHandoffs=Array.isArray(handoffs)?handoffs.filter(h=>h.readyAt&&h.status!=="complete"&&(Date.now()-new Date(h.readyAt).getTime())/60000>=Number(h.qualityWindow||8)):[];
    const measured=Array.isArray(outcomes)?outcomes.filter(o=>o.status==="measured"):[];
    const accuracy=measured.length?clamp(Math.round(measured.reduce((sum,o)=>{
      if(!o.predictedValue)return sum+.75;
      const error=Math.abs(Number(o.observedValue||0)-Number(o.predictedValue))/Number(o.predictedValue);
      return sum+Math.max(0,1-error);
    },0)/measured.length*100),60,98):84;

    return{open,occupied,attention,lateTickets,activeTickets,lateHandoffs,accuracy};
  }

  function tone(score){return score>=75?"risk":score>=50?"watch":"stable"}

  function render(){
    const s=collect();

    const reservationBase=clamp(s.occupied.length*8+s.open.length*5);
    const reservation30=clamp(reservationBase+8);
    const reservation60=clamp(reservationBase+18);
    const reservation120=clamp(reservationBase-5);

    const kitchenScore=clamp(s.activeTickets.length*6+s.lateTickets.length*28+s.occupied.length*3);
    const laborCurrent=Math.max(4,Math.ceil(s.occupied.length/2));
    const laborRecommended=Math.max(laborCurrent,Math.ceil((s.occupied.length+s.attention.length+s.lateHandoffs.length)/2));
    const laborDifference=laborRecommended-laborCurrent;
    const laborScore=clamp(Math.max(0,laborDifference)*28+s.lateHandoffs.length*16+s.attention.length*8);

    const revenueHour=Math.round((s.occupied.length*160)+(reservation60*18));
    const revenueRisk=Math.round(s.lateTickets.length*180+s.attention.length*140+s.lateHandoffs.length*120+s.open.length*100);
    const revenueUpside=Math.max(0,Math.round((100-reservation60)*12 + Math.max(0,laborDifference)*90));
    const revenueScore=clamp(Math.round(revenueRisk/12));

    const calibration=read(CALIBRATION_KEY);
    const confidence=clamp(Math.round(s.accuracy*.75+Math.min(100,(s.occupied.length+s.activeTickets.length)*4)*.25+Number(calibration.confidenceAdjustment||0)),68,97);

    byId("domainForecastingConfidence").textContent=`${confidence}%`;
    byId("domainForecastingConfidenceLabel").textContent=confidence>=88?"High confidence":confidence>=76?"Moderate confidence":"Limited live data";

    byId("reservationForecastScore").textContent=String(reservation60);
    byId("reservationForecast30").textContent=`${reservation30}%`;
    byId("reservationForecast60").textContent=`${reservation60}%`;
    byId("reservationForecast120").textContent=`${reservation120}%`;
    byId("reservationForecastHeadline").textContent=reservation60>=80?"Reservation surge expected":reservation60>=55?"Demand building":"Stable demand";
    byId("reservationForecastDetail").textContent=reservation60>=80?"Protect flexible inventory before the 60-minute arrival peak.":reservation60>=55?"Review pacing and table availability before the next wave.":"No unusual arrival pressure is projected.";

    const peak=new Date(Date.now()+60*60000).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
    byId("kitchenForecastScore").textContent=String(kitchenScore);
    byId("kitchenForecastTicketRisk").textContent=kitchenScore>=75?"High":kitchenScore>=50?"Moderate":"Low";
    byId("kitchenForecastPeak").textContent=peak;
    byId("kitchenForecastSupport").textContent=String(kitchenScore>=75?2:kitchenScore>=50?1:0);
    byId("kitchenForecastHeadline").textContent=kitchenScore>=75?"Bottleneck likely":kitchenScore>=50?"Load building":"Balanced stations";
    byId("kitchenForecastDetail").textContent=kitchenScore>=75?"Move support before the projected peak window.":kitchenScore>=50?"Watch the constrained station and expo handoff.":"Current production flow is within target.";

    byId("laborForecastScore").textContent=String(laborScore);
    byId("laborForecastCurrent").textContent=String(laborCurrent);
    byId("laborForecastRecommended").textContent=String(laborRecommended);
    byId("laborForecastDifference").textContent=laborDifference>0?`+${laborDifference}`:"0";
    byId("laborForecastHeadline").textContent=laborDifference>0?"Coverage increase recommended":"Coverage aligned";
    byId("laborForecastDetail").textContent=laborDifference>0?"Add cross-functional support before service pressure peaks.":"No labor adjustment is currently recommended.";

    byId("revenueForecastScore").textContent=String(revenueScore);
    byId("revenueForecastHour").textContent=`$${revenueHour.toLocaleString()}`;
    byId("revenueForecastRisk").textContent=`$${revenueRisk.toLocaleString()}`;
    byId("revenueForecastUpside").textContent=`$${revenueUpside.toLocaleString()}`;
    byId("revenueForecastHeadline").textContent=revenueRisk>=600?"Revenue exposure elevated":revenueRisk>=250?"Some revenue at risk":"Plan on track";
    byId("revenueForecastDetail").textContent=revenueRisk?"Operational exceptions are creating measurable exposure.":"Current conditions support the operating plan.";

    document.querySelector('[data-domain="reservations"]').dataset.tone=tone(reservation60);
    document.querySelector('[data-domain="kitchen"]').dataset.tone=tone(kitchenScore);
    document.querySelector('[data-domain="labor"]').dataset.tone=tone(laborScore);
    document.querySelector('[data-domain="revenue"]').dataset.tone=tone(revenueScore);

    if(kitchenScore>=75){
      sourceTarget="kitchenExpoCommand";
      byId("domainForecastActionTitle").textContent="Pre-position kitchen support";
      byId("domainForecastActionDetail").textContent="Move one or two support roles before the projected peak window.";
    }else if(reservation60>=80){
      sourceTarget="liveFloorOperationsV2";
      byId("domainForecastActionTitle").textContent="Protect table inventory";
      byId("domainForecastActionDetail").textContent="Hold flexible tables and control walk-in pacing before the reservation surge.";
    }else if(laborDifference>0){
      sourceTarget="workforceFoundation";
      byId("domainForecastActionTitle").textContent="Increase flexible labor coverage";
      byId("domainForecastActionDetail").textContent="Assign cross-functional support before pressure reaches the floor.";
    }else{
      sourceTarget="liveShiftCommander";
      byId("domainForecastActionTitle").textContent="Maintain current plan";
      byId("domainForecastActionDetail").textContent="No cross-functional preparation is required.";
    }

    byId("domainForecastingUpdated").textContent=`Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function init(){
    if(!byId("domainForecastingCenter"))return;
    byId("domainForecastOpenSource")?.addEventListener("click",()=>byId(sourceTarget)?.scrollIntoView({behavior:"smooth",block:"start"}));
    ["bluecurrent:incident-acknowledged","bluecurrent:incident-resolved","bluecurrent:decision-outcome-recorded","bluecurrent:table-manager-flagged","bluecurrent:kitchen-ticket-updated","bluecurrent:server-ready-notified"].forEach(name=>window.addEventListener(name,render));
    render();
    setInterval(render,60000);
  }

  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();