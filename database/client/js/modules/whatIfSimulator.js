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
  const read=key=>{try{return JSON.parse(localStorage.getItem(key))||{}}catch{return{}}};
  const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
  let target="liveShiftCommander";
  let lastSimulation=null;

  const scenarioImpacts={
    server_callout:{demand:0,kitchen:4,floor:18,labor:32,revenue:320,recovery:"45–75 min"},
    reservation_surge:{demand:28,kitchen:20,floor:24,labor:14,revenue:480,recovery:"60–90 min"},
    kitchen_station_down:{demand:0,kitchen:38,floor:16,labor:12,revenue:650,recovery:"45–120 min"},
    walkin_party:{demand:22,kitchen:18,floor:30,labor:16,revenue:390,recovery:"45–75 min"},
    rain_shift:{demand:18,kitchen:12,floor:26,labor:10,revenue:280,recovery:"30–60 min"}
  };
  const severityMultiplier={low:.6,medium:1,high:1.45};

  function baseline(){
    const incidents=read(KEYS.incidents).incidents||[];
    const tables=read(KEYS.floor).tables||[];
    const tickets=read(KEYS.kitchen).tickets||[];
    const handoffs=read(KEYS.handoff).handoffs||[];
    const outcomes=read(KEYS.outcomes).outcomes||[];
    const open=Array.isArray(incidents)?incidents.filter(i=>i.status==="open"):[];
    const occupied=Array.isArray(tables)?tables.filter(t=>t.status==="occupied"):[];
    const attention=Array.isArray(tables)?tables.filter(t=>t.status==="attention"):[];
    const lateTickets=Array.isArray(tickets)?tickets.filter(t=>{const start=t.firedAt||t.createdAt;return start&&t.status!=="ready"&&(Date.now()-new Date(start).getTime())/60000>=Number(t.target||15)}):[];
    const lateHandoffs=Array.isArray(handoffs)?handoffs.filter(h=>h.readyAt&&h.status!=="complete"&&(Date.now()-new Date(h.readyAt).getTime())/60000>=Number(h.qualityWindow||8)):[];
    const measured=Array.isArray(outcomes)?outcomes.filter(o=>o.status==="measured"):[];
    const confidence=measured.length?90:82;
    return{
      demand:clamp(occupied.length*8+open.length*6),
      kitchen:clamp(lateTickets.length*24+(Array.isArray(tickets)?tickets.filter(t=>t.status!=="ready").length:0)*5+occupied.length*3),
      floor:clamp(attention.length*25+occupied.length*6),
      labor:clamp(Math.max(0,occupied.length-6)*9+lateHandoffs.length*14+attention.length*8),
      confidence
    };
  }

  function scenarioName(value){
    return {
      server_callout:"One server calls out",
      reservation_surge:"Reservation surge",
      kitchen_station_down:"Kitchen station goes down",
      walkin_party:"Large walk-in party",
      rain_shift:"Rain moves patio demand inside"
    }[value]||"Scenario";
  }

  function recommendation(type,result){
    if(result.kitchen>=80){
      target="kitchenExpoCommand";
      return ["Activate kitchen contingency plan","Move cross-trained support to the constrained station and communicate revised timing to the floor."];
    }
    if(result.floor>=80){
      target="liveFloorOperationsV2";
      return ["Protect dining-room flow","Hold flexible tables, adjust seating pace, and deploy a manager to the highest-risk section."];
    }
    if(result.labor>=75){
      target="workforceFoundation";
      return ["Reassign flexible labor","Shift one cross-functional employee into the affected service role before the scenario begins."];
    }
    if(result.demand>=75){
      target="liveFloorOperationsV2";
      return ["Control the arrival wave","Protect inventory and update host pacing before demand reaches the projected peak."];
    }
    target="liveShiftCommander";
    lastSimulation=null;
    byId("whatIfCreateDecision").disabled=true;
    return ["Maintain current plan","The scenario remains within controllable operating limits."];
  }

  function run(){
    const base=baseline();
    const type=byId("whatIfScenario").value;
    const severity=byId("whatIfSeverity").value;
    const start=Number(byId("whatIfStartWindow").value);
    const impact=scenarioImpacts[type];
    const mult=severityMultiplier[severity];

    const result={
      demand:clamp(Math.round(base.demand+impact.demand*mult)),
      kitchen:clamp(Math.round(base.kitchen+impact.kitchen*mult)),
      floor:clamp(Math.round(base.floor+impact.floor*mult)),
      labor:clamp(Math.round(base.labor+impact.labor*mult))
    };
    const baseRisk=Math.round((base.demand+base.kitchen+base.floor+base.labor)/4);
    const scenarioRisk=Math.round((result.demand+result.kitchen+result.floor+result.labor)/4);
    const delta=scenarioRisk-baseRisk;
    const confidence=clamp(base.confidence-(severity==="high"?5:severity==="low"?0:2),65,95);
    const revenue=Math.round(impact.revenue*mult);
    const rec=recommendation(type,result);

    byId("whatIfDemandBaseline").textContent=String(base.demand);
    byId("whatIfDemandScenario").textContent=String(result.demand);
    byId("whatIfKitchenBaseline").textContent=String(base.kitchen);
    byId("whatIfKitchenScenario").textContent=String(result.kitchen);
    byId("whatIfFloorBaseline").textContent=String(base.floor);
    byId("whatIfFloorScenario").textContent=String(result.floor);
    byId("whatIfLaborBaseline").textContent=String(base.labor);
    byId("whatIfLaborScenario").textContent=String(result.labor);

    byId("whatIfRiskDelta").textContent=delta>0?`+${delta}`:String(delta);
    byId("whatIfRiskDeltaLabel").textContent=delta>=25?"Major risk increase":delta>=12?"Moderate risk increase":"Contained impact";
    byId("whatIfComparisonCard").dataset.tone=delta>=25?"risk":delta>=12?"watch":"stable";

    byId("whatIfSummaryTitle").textContent=`${scenarioName(type)} — ${severity} severity`;
    byId("whatIfSummaryDetail").textContent=`Starting ${start===0?"now":`in ${start} minutes`}, projected operating risk changes from ${baseRisk} to ${scenarioRisk}.`;
    byId("whatIfConfidence").textContent=`${confidence}%`;
    byId("whatIfRevenueExposure").textContent=`$${revenue.toLocaleString()}`;
    byId("whatIfRecoveryWindow").textContent=impact.recovery;
    byId("whatIfRecommendationTitle").textContent=rec[0];
    byId("whatIfRecommendationDetail").textContent=rec[1];
    lastSimulation={
      scenario:type,
      scenarioName:scenarioName(type),
      severity,
      startWindow:start,
      baseline:base,
      projected:result,
      baselineRisk:baseRisk,
      projectedRisk:scenarioRisk,
      riskDelta:delta,
      confidence,
      revenueExposure:revenue,
      recoveryWindow:impact.recovery,
      recommendationTitle:rec[0],
      recommendationDetail:rec[1],
      sourceTarget:target
    };
    byId("whatIfCreateDecision").disabled=false;
    byId("whatIfUpdated").textContent=`Simulation run ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function reset(){
    ["whatIfDemandBaseline","whatIfDemandScenario","whatIfKitchenBaseline","whatIfKitchenScenario","whatIfFloorBaseline","whatIfFloorScenario","whatIfLaborBaseline","whatIfLaborScenario"].forEach(id=>byId(id).textContent="0");
    byId("whatIfRiskDelta").textContent="0";
    byId("whatIfRiskDeltaLabel").textContent="No scenario applied";
    byId("whatIfComparisonCard").dataset.tone="stable";
    byId("whatIfSummaryTitle").textContent="No scenario applied";
    byId("whatIfSummaryDetail").textContent="Choose a scenario and run the model to compare projected operational impact.";
    byId("whatIfConfidence").textContent="0%";
    byId("whatIfRevenueExposure").textContent="$0";
    byId("whatIfRecoveryWindow").textContent="—";
    byId("whatIfRecommendationTitle").textContent="Maintain current plan";
    byId("whatIfRecommendationDetail").textContent="The simulation has not identified a required response.";
    target="liveShiftCommander";
  }

  function init(){
    if(!byId("whatIfSimulator"))return;
    byId("whatIfRun").addEventListener("click",run);
    byId("whatIfReset").addEventListener("click",reset);
    byId("whatIfOpenSource").addEventListener("click",()=>byId(target)?.scrollIntoView({behavior:"smooth",block:"start"}));
    byId("whatIfCreateDecision").addEventListener("click",()=>{
      if(!lastSimulation)return;
      window.dispatchEvent(new CustomEvent("bluecurrent:predictive-decision-requested",{
        detail:{simulation:{...lastSimulation}}
      }));
    });
  }

  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();