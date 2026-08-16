"use strict";

class CommandPrioritizationService{
  severityBase(severity){
    return ({high:88,watch:62,guest:54,normal:18})[String(severity||"normal").toLowerCase()]||35;
  }

  timeSensitivity(signal={}){
    const title=String(signal.title||"").toLowerCase();
    const domain=String(signal.domain||"").toLowerCase();
    if(title.includes("food is ready"))return 98;
    if(title.includes("wait is above"))return 90;
    if(title.includes("kitchen pressure"))return 88;
    if(title.includes("near capacity"))return 82;
    if(title.includes("vip"))return 76;
    if(domain==="inventory")return 52;
    return signal.severity==="high"?80:signal.severity==="watch"?62:45;
  }

  guestImpact(signal={},picture={}){
    const metric=Number(signal.metric);
    const domain=String(signal.domain||"").toLowerCase();
    if(domain==="guests"){
      if(String(signal.title||"").toLowerCase().includes("vip"))return 70;
      return Math.min(100,55+(Number.isFinite(metric)?metric*2:0));
    }
    if(domain==="kitchen"){
      const covers=Number(picture.service?.activeCovers||0);
      return Math.min(100,45+covers*3+(Number.isFinite(metric)?metric*4:0));
    }
    if(domain==="service"){
      return Math.min(100,50+Number(picture.service?.occupancyPercent||0)*.45);
    }
    if(domain==="inventory")return 30;
    return 40;
  }

  serviceRisk(signal={},picture={}){
    const domain=String(signal.domain||"").toLowerCase();
    const activeTickets=Number(picture.service?.activeKitchenTickets||0);
    const ready=Number(picture.service?.foodReadyItems||0);
    const occupancy=Number(picture.service?.occupancyPercent||0);
    const wait=Number(picture.service?.averageQuotedWaitMinutes||0);

    if(domain==="kitchen")return Math.min(100,60+activeTickets*7+ready*5);
    if(domain==="service")return Math.min(100,45+occupancy*.45);
    if(domain==="guests")return Math.min(100,40+wait*1.5);
    if(domain==="inventory")return 42;
    return 35;
  }

  financialExposure(signal={},picture={}){
    // This is a relative heuristic score, never a dollar claim.
    const forecast=Number(picture.financial?.salesForecast||0);
    const domain=String(signal.domain||"").toLowerCase();
    const hasForecast=forecast>0;
    if(!hasForecast)return null;
    if(domain==="service")return 66;
    if(domain==="kitchen")return 72;
    if(domain==="guests")return 58;
    if(domain==="inventory")return 48;
    return 40;
  }

  confidence(picture={}){
    if(picture.dataMode==="historical-demo")return {score:55,label:"DEMO",reason:"Historical seed data limits time-sensitive confidence."};
    return {score:92,label:"HIGH",reason:"Derived from current persisted Blue Current operating state."};
  }

  recommendation(signal={}){
    const title=String(signal.title||"").toLowerCase();
    if(title.includes("food is ready"))return "Confirm expo/runner ownership and move ready food before accepting avoidable service delay.";
    if(title.includes("kitchen pressure")||title.includes("kitchen throughput"))return "Open Kitchen, confirm expo ownership of ready food, identify the constrained or held ticket, and rebalance only after a manager reviews the queue.";
    if(title.includes("wait is above"))return "Review host quoting, imminent turns, and reservation compression before changing the quoted wait.";
    if(title.includes("near capacity"))return "Protect the next turn and review table commitments before adding discretionary walk-in demand.";
    if(title.includes("inventory"))return "Review the low-stock items and upcoming demand before approving a purchase or substitution.";
    if(title.includes("vip"))return "Confirm the guest context and service handoff before arrival.";
    return `Review ${signal.workspace||"the relevant workspace"} and confirm the operating context before acting.`;
  }

  owner(signal={}){
    return ({
      kitchen:"Manager + Expo",
      service:"Manager + Host",
      guests:"Host + Manager",
      inventory:"Manager",
      team:"Manager",
      performance:"GM"
    })[signal.domain]||"Manager";
  }

  correlate(signals=[]){
    const groups=[];
    const used=new Set();

    const kitchen=signals.filter((x,i)=>x.domain==="kitchen"&&!used.has(i));
    if(kitchen.length>1){
      const indices=signals.map((x,i)=>x.domain==="kitchen"?i:-1).filter(i=>i>=0);
      indices.forEach(i=>used.add(i));
      groups.push({
        severity:kitchen.some(x=>x.severity==="high")?"high":"watch",
        domain:"kitchen",
        workspace:"kitchen",
        title:"Kitchen throughput needs attention",
        detail:kitchen.map(x=>x.detail).filter(Boolean).join(" "),
        metric:kitchen.reduce((sum,x)=>sum+(Number(x.metric)||0),0),
        evidence:kitchen.map(x=>({title:x.title,detail:x.detail,metric:x.metric}))
      });
    }

    signals.forEach((signal,index)=>{
      if(used.has(index))return;
      groups.push({...signal,evidence:[{title:signal.title,detail:signal.detail,metric:signal.metric}]});
    });
    return groups;
  }

  prioritize(picture={}){
    const confidence=this.confidence(picture);
    const correlated=this.correlate(picture.attention||[]);
    const scored=correlated.map((signal,index)=>{
      const urgency=this.timeSensitivity(signal);
      const guest=this.guestImpact(signal,picture);
      const service=this.serviceRisk(signal,picture);
      const financial=this.financialExposure(signal,picture);
      const severity=this.severityBase(signal.severity);

      const weightedFinancial=financial===null?50:financial;
      const score=Math.round(
        severity*.30+
        urgency*.27+
        guest*.18+
        service*.20+
        weightedFinancial*.05
      );

      return {
        id:`priority_${index+1}`,
        rank:null,
        score,
        severity:signal.severity||"normal",
        domain:signal.domain||"service",
        workspace:signal.workspace||"service",
        title:signal.title,
        detail:signal.detail,
        owner:this.owner(signal),
        recommendation:this.recommendation(signal),
        dimensions:{
          urgency,
          guestImpact:guest,
          serviceRisk:service,
          financialExposure:financial
        },
        evidence:signal.evidence||[],
        confidence,
        decisionType:"human-review-required",
        automaticAction:false
      };
    }).sort((a,b)=>b.score-a.score||b.dimensions.urgency-a.dimensions.urgency);

    scored.forEach((item,index)=>item.rank=index+1);
    const top=scored.slice(0,3);
    const deferred=scored.slice(3);

    let state="CLEAR";
    if(top.some(x=>x.score>=80))state="ACT_NOW";
    else if(top.some(x=>x.score>=62))state="WATCH_CLOSELY";
    else if(top.length)state="STABLE";

    return {
      version:"76.50.0",
      generatedAt:new Date().toISOString(),
      state,
      topPriorities:top,
      deferredSignals:deferred,
      counts:{
        sourceSignals:(picture.attention||[]).length,
        correlatedSignals:correlated.length,
        topPriorities:top.length,
        deferred:deferred.length
      },
      confidence,
      policy:{
        rankingHeuristic:true,
        financialExposureIsRelativeScore:true,
        noDollarRiskClaim:true,
        noAutonomousOperationalDecision:true,
        noAutomaticMutation:true,
        managerConfirmationRequired:true,
        topThreeNoiseLimit:true
      }
    };
  }
}

module.exports=CommandPrioritizationService;
