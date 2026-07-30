(() => {
  "use strict";
  const KEYS={
    incidents:"blueCurrent.incidentResponse.v34.0.6",
    outcomes:"blueCurrent.decisionOutcomeTracker.v34.0.12",
    floor:"blueCurrent.liveFloorOperations.v35.0.3",
    kitchen:"blueCurrent.kitchenExpo.v35.0.8",
    handoff:"blueCurrent.serverHandoff.v35.1.0"
  };
  const byId=id=>document.getElementById(id);
  const CALIBRATION_KEY="blueCurrent.outcomeLearningCalibration.v34.0.13.6";
  let target="liveShiftCommander";
  const read=key=>{try{return JSON.parse(localStorage.getItem(key))||{}}catch{return{}}};
  const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));

  function signals(){
    const incidentState=read(KEYS.incidents), outcomeState=read(KEYS.outcomes), floorState=read(KEYS.floor), kitchenState=read(KEYS.kitchen), handoffState=read(KEYS.handoff);
    const incidents=Array.isArray(incidentState.incidents)?incidentState.incidents:[];
    const outcomes=Array.isArray(outcomeState.outcomes)?outcomeState.outcomes:[];
    const tables=Array.isArray(floorState.tables)?floorState.tables:[];
    const tickets=Array.isArray(kitchenState.tickets)?kitchenState.tickets:[];
    const handoffs=Array.isArray(handoffState.handoffs)?handoffState.handoffs:[];
    const open=incidents.filter(i=>i.status==="open"),attention=tables.filter(t=>t.status==="attention"),occupied=tables.filter(t=>t.status==="occupied");
    const lateTickets=tickets.filter(t=>{const start=t.firedAt||t.createdAt;return start&&t.status!=="ready"&&(Date.now()-new Date(start).getTime())/60000>=Number(t.target||15)});
    const lateHandoffs=handoffs.filter(h=>h.readyAt&&h.status!=="complete"&&(Date.now()-new Date(h.readyAt).getTime())/60000>=Number(h.qualityWindow||8));
    const measured=outcomes.filter(o=>o.status==="measured");
    const accuracy=measured.length?clamp(Math.round(measured.reduce((sum,o)=>{if(!o.predictedValue)return sum+.7;const error=Math.abs(Number(o.observedValue||0)-Number(o.predictedValue))/Number(o.predictedValue);return sum+Math.max(0,1-error)},0)/measured.length*100),55,98):82;
    const demand=clamp(occupied.length*8+open.length*6+lateHandoffs.length*5);
    const kitchen=clamp(lateTickets.length*24+tickets.filter(t=>t.status!=="ready").length*5+occupied.length*3);
    const floor=clamp(attention.length*25+occupied.length*6+open.filter(i=>i.sourceTarget==="liveFloorOperationsV2").length*12);
    const labor=clamp(Math.max(0,occupied.length-6)*9+lateHandoffs.length*14+attention.length*8);
    const incidentsScore=clamp(open.filter(i=>i.severity==="critical").length*28+open.filter(i=>i.severity!=="critical").length*16);
    const overall=clamp(Math.round(demand*.22+kitchen*.27+floor*.2+labor*.16+incidentsScore*.15));
    const calibration=read(CALIBRATION_KEY);
    const adjustment=Number(calibration.confidenceAdjustment||0);
    const confidence=clamp(Math.round(accuracy*.7+Math.min(100,(tables.length+tickets.length+handoffs.length)*2)*.3+adjustment),65,97);
    return{open,attention,occupied,lateTickets,lateHandoffs,demand,kitchen,floor,labor,incidentsScore,overall,confidence};
  }

  const tone=score=>score>=75?"risk":score>=50?"watch":"stable";
  function timeline(s){
    const root=byId("predictiveForecastTimeline"),now=new Date(),horizons=[0,30,60,90,120],shape=[0,Math.round((s.demand+s.floor)*.15),Math.round((s.kitchen+s.demand)*.2),Math.round((s.labor+s.floor)*.12),-Math.round((s.kitchen+s.incidentsScore)*.1)];
    root.replaceChildren();
    const series=horizons.map((minutes,i)=>{
      const score=clamp(s.overall+shape[i]);let title="Stable service",detail="No material disruption is projected.",source="liveShiftCommander";
      if(score>=80){title=i<=2?"Critical pressure window":"Recovery depends on intervention";detail="Multiple operating signals are projected to exceed target.";source=s.lateTickets.length?"kitchenExpoCommand":s.attention.length?"liveFloorOperationsV2":"missionIncidentCenter"}
      else if(score>=58){title=s.kitchen>=s.floor?"Kitchen pressure building":"Dining-room pressure building";detail="Prepare the next response before the following arrival wave.";source=s.kitchen>=s.floor?"kitchenExpoCommand":"liveFloorOperationsV2"}
      else if(i===1){title="Arrival-wave review";detail="Confirm pacing, table flexibility, and station coverage."}
      return{minutes,score,title,detail,source};
    });
    series.forEach(slot=>{const card=document.createElement("article");card.className="predictive-forecast-slot";card.dataset.tone=tone(slot.score);card.innerHTML="<time></time><strong></strong><span></span><div class='predictive-slot-meter'><i></i></div>";card.querySelector("time").textContent=new Date(now.getTime()+slot.minutes*60000).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});card.querySelector("strong").textContent=slot.title;card.querySelector("span").textContent=slot.detail;card.querySelector("i").style.width=`${slot.score}%`;card.addEventListener("click",()=>byId(slot.source)?.scrollIntoView({behavior:"smooth",block:"start"}));root.append(card)});
    return series;
  }

  function heatmap(s){
    const root=byId("predictiveHeatmapList");root.replaceChildren();
    [["Demand",s.demand],["Kitchen",s.kitchen],["Dining room",s.floor],["Labor",s.labor],["Incidents",s.incidentsScore]].forEach(([label,value])=>{const row=document.createElement("div");row.className="predictive-heatmap-row";row.innerHTML="<span></span><div class='predictive-heatmap-track'><i></i></div><strong></strong>";row.querySelector("span").textContent=label;row.querySelector("i").style.width=`${value}%`;row.querySelector("strong").textContent=String(value);root.append(row)});
  }

  function recommendation(s,series){
    let rec;
    if(s.kitchen>=70){target="kitchenExpoCommand";rec=["Kitchen ticket times are likely to exceed target.",`Projected kitchen pressure reaches ${s.kitchen}. Rebalance station or expo coverage before the peak window.`,s.lateTickets.length*180+260,"Move support to constrained station"]}
    else if(s.floor>=65){target="liveFloorOperationsV2";rec=["Dining-room congestion is likely to increase.",`Floor pressure is projected at ${s.floor}. Protect flexible tables and deploy manager attention before the next seating wave.`,s.attention.length*140+220,"Protect flexible inventory"]}
    else if(s.labor>=60){target="workforceFoundation";rec=["Labor coverage may fall behind demand.",`Labor pressure is projected at ${s.labor}. Review section coverage and assign cross-functional support.`,180,"Review shift coverage"]}
    else{target=series.reduce((a,b)=>b.score>a.score?b:a,series[0]).source;rec=["Service remains stable.","No material risk is currently projected. Maintain the current operating plan and monitor the next arrival window.",0,"Maintain plan"]}
    byId("predictiveRecommendationTitle").textContent=rec[0];byId("predictiveRecommendationDetail").textContent=rec[1];byId("predictiveRecommendationImpact").textContent=`$${rec[2].toLocaleString()}`;byId("predictiveRecommendationAction").textContent=rec[3];byId("predictiveRecommendationConfidence").textContent=`${s.confidence}% confidence`;
  }

  function render(){
    const s=signals();
    byId("predictiveDemandPressure").textContent=String(s.demand);byId("predictiveKitchenPressure").textContent=String(s.kitchen);byId("predictiveFloorPressure").textContent=String(s.floor);byId("predictiveLaborPressure").textContent=String(s.labor);byId("predictiveConfidence").textContent=`${s.confidence}%`;byId("predictiveRiskScore").textContent=String(s.overall);byId("predictiveRiskLabel").textContent=s.overall>=75?"High":s.overall>=50?"Moderate":"Low";byId("predictiveRiskScoreCard").dataset.tone=tone(s.overall);
    const series=timeline(s);heatmap(s);recommendation(s,series);
    byId("predictiveModelStatus").textContent=s.confidence>=85?"Forecast operating normally":"Forecast operating with limited live data";
    byId("predictiveModelDetail").textContent=`Current model confidence is ${s.confidence}%. The foundation recalculates from incidents, floor state, kitchen timing, handoff timing, and measured decision outcomes.`;
    byId("predictiveCommandUpdated").textContent=`Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function init(){
    if(!byId("predictiveCommandCenter"))return;
    byId("predictiveRefreshForecast")?.addEventListener("click",render);
    byId("predictiveOpenSource")?.addEventListener("click",()=>byId(target)?.scrollIntoView({behavior:"smooth",block:"start"}));
    ["bluecurrent:incident-acknowledged","bluecurrent:incident-resolved","bluecurrent:decision-outcome-recorded","bluecurrent:table-manager-flagged","bluecurrent:kitchen-ticket-updated","bluecurrent:server-ready-notified"].forEach(name=>window.addEventListener(name,render));
    render();setInterval(render,60000);
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();