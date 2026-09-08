"use strict";

class CommandShiftMemoryService{
  constructor(database,playbookService){this.database=database;this.playbooks=playbookService;}
  now(){return new Date().toISOString();}
  num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d;}

  currentContext(picture={}){
    const s=picture.service||{},n=picture.next30Minutes||{},inv=picture.inventory||{};
    const occupancy=this.num(s.occupancyPercent);
    const wait=this.num(s.averageQuotedWaitMinutes);
    const tickets=this.num(s.activeKitchenTickets);
    const ready=this.num(s.foodReadyItems);
    const covers=this.num(s.activeCovers);
    const upcoming=this.num(n.covers);

    return {
      dataMode:picture.dataMode||null,
      occupancyPercent:occupancy,
      averageQuotedWaitMinutes:wait,
      activeKitchenTickets:tickets,
      foodReadyItems:ready,
      activeCovers:covers,
      next30MinuteCovers:upcoming,
      activeStaff:this.num(s.activeStaff),
      lowStockItems:this.num(inv.lowStockItems),
      servicePhase:
        upcoming>=30?"arrival-wave":
        tickets>=4||ready>=3?"peak-pressure":
        occupancy>=75?"high-occupancy":
        covers>0?"active-service":"pre-service",
      bands:{
        occupancy:occupancy>=90?"critical":occupancy>=75?"high":occupancy>=50?"moderate":"low",
        wait:wait>=30?"critical":wait>=20?"high":wait>=10?"moderate":"low",
        kitchen:tickets>=6||ready>=5?"critical":tickets>=4||ready>=3?"high":tickets>=2?"moderate":"low",
        demand:upcoming>=40?"critical":upcoming>=25?"high":upcoming>=10?"moderate":"low"
      }
    };
  }

  historicalContext(record={}){
    const base=record.baselineSnapshot||{};
    const service=base.service||{};
    const metric=base.metric||{};
    const ctx=metric.context||{};
    const inventory=base.inventory||{};
    const occupancy=this.num(service.occupancyPercent,ctx.occupancyPercent);
    const wait=this.num(service.averageQuotedWaitMinutes,ctx.averageQuotedWaitMinutes);
    const tickets=this.num(service.activeKitchenTickets,ctx.activeKitchenTickets);
    const ready=this.num(service.foodReadyItems,ctx.foodReadyItems);
    const covers=this.num(service.activeCovers,ctx.activeCovers);
    return {
      occupancyPercent:occupancy,
      averageQuotedWaitMinutes:wait,
      activeKitchenTickets:tickets,
      foodReadyItems:ready,
      activeCovers:covers,
      activeStaff:this.num(service.activeStaff),
      lowStockItems:this.num(inventory.lowStockItems,ctx.lowStockItems),
      hasRichContext:Boolean(record.baselineSnapshot)
    };
  }

  similarity(current,historical,domain){
    const dimensions=[];
    const add=(name,a,b,scale,weight)=>{
      if(!Number.isFinite(Number(a))||!Number.isFinite(Number(b)))return;
      const distance=Math.min(1,Math.abs(Number(a)-Number(b))/scale);
      dimensions.push({name,score:Math.round((1-distance)*100),weight});
    };

    add("occupancy",current.occupancyPercent,historical.occupancyPercent,50,domain==="service"?2:1);
    add("wait",current.averageQuotedWaitMinutes,historical.averageQuotedWaitMinutes,30,domain==="guests"?2:1);
    add("kitchenTickets",current.activeKitchenTickets,historical.activeKitchenTickets,6,domain==="kitchen"?2:1);
    add("foodReady",current.foodReadyItems,historical.foodReadyItems,5,domain==="kitchen"?2:1);
    add("activeCovers",current.activeCovers,historical.activeCovers,50,1);
    add("lowStock",current.lowStockItems,historical.lowStockItems,5,domain==="inventory"?2:1);

    if(!dimensions.length)return {score:0,dimensions:[],confidence:"INSUFFICIENT_CONTEXT"};
    const totalWeight=dimensions.reduce((s,x)=>s+x.weight,0);
    const score=Math.round(dimensions.reduce((s,x)=>s+x.score*x.weight,0)/totalWeight);
    return {
      score,
      dimensions,
      confidence:historical.hasRichContext?(score>=80?"HIGH":score>=60?"MODERATE":"LOW"):"LIMITED"
    };
  }

  async match(organizationId,allowedLocationIds=[],locationId,picture={}){
    const allowed=id=>allowedLocationIds.includes("*")||allowedLocationIds.includes(id);
    const current=this.currentContext(picture);
    const db=await this.database.read();
    const records=(db.commandOutcomeLearning||[]).filter(x=>
      x.organizationId===organizationId &&
      allowed(x.locationId) &&
      x.verificationStatus!=="UNVERIFIED"
    );

    // Evidence may span every authorized location. Current location remains part of
    // the contextual match and is never used to bypass tenant/location permissions.
    const playbookSummary=await this.playbooks.build(organizationId,allowedLocationIds,null);
    const priority=picture.prioritization?.topPriorities?.[0]||null;
    const domain=priority?.domain||null;

    const candidates=records
      .filter(x=>!domain||x.domain===domain)
      .map(record=>{
        const historical=this.historicalContext(record);
        const similarity=this.similarity(current,historical,record.domain);
        return {record,historical,similarity,sameLocation:record.locationId===locationId};
      })
      .filter(x=>x.similarity.score>0)
      .sort((a,b)=>b.similarity.score-a.similarity.score)
      .slice(0,20);

    const bestPlaybook=domain
      ? this.playbooks.matchPriority(priority,playbookSummary.playbooks)
      : playbookSummary.playbooks[0]||null;

    const sameRecommendation=bestPlaybook
      ? candidates.filter(x=>
          String(x.record.recommendation||"").trim().toLowerCase()===
          String(bestPlaybook.recommendation||"").trim().toLowerCase()
        )
      : candidates;
    const evidence=sameRecommendation.length?sameRecommendation:candidates;
    const top=evidence[0]||null;

    const verified=evidence.filter(x=>["IMPROVED","UNCHANGED","WORSENED"].includes(x.record.verificationStatus));
    const improved=verified.filter(x=>x.record.verificationStatus==="IMPROVED").length;
    const weightedSimilarity=verified.length
      ? Math.round(verified.reduce((s,x)=>s+x.similarity.score,0)/verified.length)
      : 0;

    return {
      version:"78.50.0",
      generatedAt:this.now(),
      organizationId,
      locationId,
      currentContext:current,
      currentPriority:priority?{
        id:priority.id,rank:priority.rank,domain:priority.domain,title:priority.title,
        score:priority.score,recommendation:priority.recommendation
      }:null,
      match:top?{
        similarityScore:top.similarity.score,
        similarityConfidence:top.similarity.confidence,
        historicalActionId:top.record.actionId,
        historicalLocationId:top.record.locationId,
        historicalOutcome:top.record.verificationStatus,
        sameLocation:top.sameLocation,
        historicalContext:top.historical
      }:null,
      playbook:bestPlaybook?{
        id:bestPlaybook.id,
        domain:bestPlaybook.domain,
        recommendation:bestPlaybook.recommendation,
        guidanceStatus:bestPlaybook.guidanceStatus,
        sampleSize:bestPlaybook.sampleSize,
        improvedRate:bestPlaybook.improvedRate,
        confidence:bestPlaybook.confidence,
        situation:bestPlaybook.situation
      }:null,
      contextualEvidence:{
        comparableOutcomes:verified.length,
        improvedOutcomes:improved,
        improvedRate:verified.length?Math.round(improved/verified.length*100):null,
        averageSimilarity:weightedSimilarity||null
      },
      guidance:
        !priority?"NO_ACTIVE_PRIORITY":
        !bestPlaybook?"NO_PLAYBOOK_EVIDENCE":
        !top?"NO_CONTEXTUAL_HISTORY":
        top.similarity.score>=80&&bestPlaybook.guidanceStatus==="EVIDENCE_BACKED"?"HIGHLY_RELEVANT_HISTORY":
        top.similarity.score>=60?"RELEVANT_HISTORY":"LOW_CONTEXT_MATCH",
      policy:{
        shiftMemoryReadOnly:true,
        contextualSimilarityIsHeuristic:true,
        observationalAssociationOnly:true,
        noCausalClaim:true,
        noAutonomousActionSelection:true,
        noAutomaticOperationalDecision:true,
        managerReviewRequired:true
      }
    };
  }
}
module.exports=CommandShiftMemoryService;
