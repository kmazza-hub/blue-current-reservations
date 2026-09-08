"use strict";

class CommandOutcomeVerificationService{
  constructor(database){this.database=database;}
  now(){return new Date().toISOString();}

  metricFor(domain,picture={}){
    const s=picture.service||{},inv=picture.inventory||{};
    if(domain==="kitchen")return {
      name:"kitchen_pressure_index",
      value:Number(s.activeKitchenTickets||0)*18+Number(s.foodReadyItems||0)*8,
      lowerIsBetter:true,
      context:{activeKitchenTickets:s.activeKitchenTickets||0,foodReadyItems:s.foodReadyItems||0,kitchenTargetMinutes:s.kitchenTargetMinutes||0}
    };
    if(domain==="guests")return {
      name:"guest_wait_minutes",
      value:Number(s.averageQuotedWaitMinutes||0),
      lowerIsBetter:true,
      context:{waitlistParties:s.waitlistParties||0,averageQuotedWaitMinutes:s.averageQuotedWaitMinutes||0}
    };
    if(domain==="service")return {
      name:"service_pressure_index",
      value:Number(s.occupancyPercent||0)+Number(s.averageQuotedWaitMinutes||0),
      lowerIsBetter:true,
      context:{occupancyPercent:s.occupancyPercent||0,averageQuotedWaitMinutes:s.averageQuotedWaitMinutes||0,activeCovers:s.activeCovers||0}
    };
    if(domain==="inventory")return {
      name:"low_stock_items",
      value:Number(inv.lowStockItems||0),
      lowerIsBetter:true,
      context:{lowStockItems:inv.lowStockItems||0,items:inv.items||0}
    };
    return {
      name:"priority_score",
      value:Number(picture.prioritization?.topPriorities?.[0]?.score||0),
      lowerIsBetter:true,
      context:{decisionState:picture.prioritization?.state||null}
    };
  }

  captureBaseline(action,picture={}){
    const metric=this.metricFor(action.domain,picture);
    return {
      capturedAt:this.now(),
      dataMode:picture.dataMode||null,
      metric,
      priorityScore:Number(action.priorityScore||0),
      service:{...(picture.service||{})},
      inventory:{...(picture.inventory||{})}
    };
  }

  compare(baseline,currentMetric){
    const before=Number(baseline?.metric?.value);
    const after=Number(currentMetric?.value);
    if(!Number.isFinite(before)||!Number.isFinite(after))return {status:"UNVERIFIED",delta:null,percentChange:null,improved:null};
    const delta=after-before;
    const lowerIsBetter=baseline.metric.lowerIsBetter!==false;
    const improved=lowerIsBetter?after<before:after>before;
    const unchanged=after===before;
    const percentChange=before===0?null:Math.round((delta/Math.abs(before))*1000)/10;
    return {
      status:unchanged?"UNCHANGED":improved?"IMPROVED":"WORSENED",
      delta,
      percentChange,
      improved:unchanged?null:improved
    };
  }

  async verify(action,picture={},actor){
    const baseline=action.baseline||null;
    const currentMetric=this.metricFor(action.domain,picture);
    const comparison=this.compare(baseline,currentMetric);
    const verification={
      version:"78.50.0",
      verifiedAt:this.now(),
      verifiedBy:actor,
      domain:action.domain,
      metricName:currentMetric.name,
      baselineValue:baseline?.metric?.value??null,
      currentValue:currentMetric.value,
      baselineContext:baseline?.metric?.context||null,
      currentContext:currentMetric.context,
      status:comparison.status,
      delta:comparison.delta,
      percentChange:comparison.percentChange,
      improved:comparison.improved,
      confidence:picture.dataMode==="historical-demo"?"DEMO":"OPERATIONAL",
      humanOutcome:action.outcome||null,
      automaticSuccessClaim:false
    };

    const learning={
      id:`col_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      organizationId:action.organizationId,
      locationId:action.locationId,
      actionId:action.id,
      domain:action.domain,
      title:action.title,
      recommendation:action.recommendation,
      owner:action.owner,
      resolutionOutcome:action.outcome,
      verificationStatus:verification.status,
      metricName:verification.metricName,
      baselineValue:verification.baselineValue,
      currentValue:verification.currentValue,
      delta:verification.delta,
      percentChange:verification.percentChange,
      confidence:verification.confidence,
      baselineSnapshot:baseline ? {
        capturedAt:baseline.capturedAt||null,
        dataMode:baseline.dataMode||null,
        priorityScore:baseline.priorityScore||null,
        metric:baseline.metric||null,
        service:baseline.service||{},
        inventory:baseline.inventory||{}
      } : null,
      createdAt:this.now(),
      eligibleForAutomation:false
    };

    await this.database.mutate(db=>{
      db.commandOutcomeLearning||=[];
      db.commandOutcomeLearning.push(learning);
      return learning;
    });
    return {verification,learning};
  }

  async summary(organizationId,allowedLocationIds=[],locationId=null){
    const allowed=id=>allowedLocationIds.includes("*")||allowedLocationIds.includes(id);
    const db=await this.database.read();
    const records=(db.commandOutcomeLearning||[])
      .filter(x=>x.organizationId===organizationId&&allowed(x.locationId)&&(!locationId||x.locationId===locationId))
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const improved=records.filter(x=>x.verificationStatus==="IMPROVED").length;
    const worsened=records.filter(x=>x.verificationStatus==="WORSENED").length;
    const unchanged=records.filter(x=>x.verificationStatus==="UNCHANGED").length;
    const unverified=records.filter(x=>x.verificationStatus==="UNVERIFIED").length;
    return {
      version:"78.50.0",generatedAt:this.now(),locationId,
      counts:{total:records.length,improved,worsened,unchanged,unverified},
      recent:records.slice(0,12),
      policy:{
        observationalLearningOnly:true,
        noCausalClaim:true,
        noAutomaticSuccessClaim:true,
        noAutonomousActionSelection:true,
        eligibleForAutomation:false
      }
    };
  }
}
module.exports=CommandOutcomeVerificationService;
