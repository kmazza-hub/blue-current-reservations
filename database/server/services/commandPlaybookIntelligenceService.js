"use strict";

class CommandPlaybookIntelligenceService{
  constructor(database){this.database=database;}
  now(){return new Date().toISOString();}

  normalizeRecommendation(value=""){
    return String(value||"")
      .trim()
      .replace(/\s+/g," ")
      .toLowerCase();
  }

  situationBand(metricName,value){
    const n=Number(value);
    if(!Number.isFinite(n))return "unknown";
    if(metricName==="guest_wait_minutes")return n>=30?"high":n>=15?"moderate":"low";
    if(metricName==="kitchen_pressure_index")return n>=100?"high":n>=45?"moderate":"low";
    if(metricName==="service_pressure_index")return n>=120?"high":n>=75?"moderate":"low";
    if(metricName==="low_stock_items")return n>=5?"high":n>=2?"moderate":"low";
    return n>=80?"high":n>=40?"moderate":"low";
  }

  confidence(sampleSize,improvedRate){
    if(sampleSize>=8 && improvedRate>=0.7)return {label:"STRONG",score:88};
    if(sampleSize>=4 && improvedRate>=0.6)return {label:"MODERATE",score:70};
    if(sampleSize>=2)return {label:"EARLY",score:52};
    return {label:"INSUFFICIENT",score:30};
  }

  async build(organizationId,allowedLocationIds=[],locationId=null){
    const allowed=id=>allowedLocationIds.includes("*")||allowedLocationIds.includes(id);
    const db=await this.database.read();
    const records=(db.commandOutcomeLearning||[]).filter(x=>
      x.organizationId===organizationId &&
      allowed(x.locationId) &&
      (!locationId || x.locationId===locationId)
    );

    const groups=new Map();
    for(const record of records){
      const recommendationKey=this.normalizeRecommendation(record.recommendation||record.resolutionOutcome||"");
      const situationBand=this.situationBand(record.metricName||"unknown",record.baselineValue);
      const key=`${record.domain||"service"}|${record.metricName||"unknown"}|${situationBand}|${recommendationKey}`;
      if(!groups.has(key)){
        groups.set(key,{
          domain:record.domain||"service",
          metricName:record.metricName||"unknown",
          recommendation:record.recommendation||null,
          situationBand,
          sampleSize:0,
          improved:0,
          worsened:0,
          unchanged:0,
          unverified:0,
          deltas:[],
          locations:new Set(),
          recent:[]
        });
      }
      const g=groups.get(key);
      g.sampleSize+=1;
      g.locations.add(record.locationId);
      if(record.verificationStatus==="IMPROVED")g.improved+=1;
      else if(record.verificationStatus==="WORSENED")g.worsened+=1;
      else if(record.verificationStatus==="UNCHANGED")g.unchanged+=1;
      else g.unverified+=1;
      if(Number.isFinite(Number(record.delta)))g.deltas.push(Number(record.delta));
      g.recent.push({
        actionId:record.actionId,
        locationId:record.locationId,
        verificationStatus:record.verificationStatus,
        delta:record.delta,
        createdAt:record.createdAt
      });
    }

    const playbooks=[...groups.values()].map(g=>{
      const verified=g.improved+g.worsened+g.unchanged;
      const improvedRate=verified?g.improved/verified:0;
      const worsenedRate=verified?g.worsened/verified:0;
      const avgDelta=g.deltas.length?Math.round((g.deltas.reduce((a,b)=>a+b,0)/g.deltas.length)*10)/10:null;
      const confidence=this.confidence(g.sampleSize,improvedRate);
      return {
        id:`playbook_${Buffer.from(`${g.domain}|${g.metricName}|${g.recommendation||""}`).toString("base64url").slice(0,22)}`,
        domain:g.domain,
        metricName:g.metricName,
        recommendation:g.recommendation,
        situation:{band:g.situationBand,metricName:g.metricName},
        sampleSize:g.sampleSize,
        verifiedSamples:verified,
        improved:g.improved,
        worsened:g.worsened,
        unchanged:g.unchanged,
        unverified:g.unverified,
        improvedRate:Math.round(improvedRate*100),
        worsenedRate:Math.round(worsenedRate*100),
        averageDelta:avgDelta,
        locationCount:g.locations.size,
        confidence,
        evidence:g.recent
          .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
          .slice(0,5),
        guidanceStatus:
          confidence.label==="STRONG"?"EVIDENCE_BACKED":
          confidence.label==="MODERATE"?"PROMISING":
          confidence.label==="EARLY"?"EARLY_SIGNAL":"INSUFFICIENT_EVIDENCE",
        causalClaim:false,
        approvedForAutonomousExecution:false
      };
    }).sort((a,b)=>
      b.confidence.score-a.confidence.score ||
      b.improvedRate-a.improvedRate ||
      b.sampleSize-a.sampleSize
    );

    return {
      version:"78.0.0",
      generatedAt:this.now(),
      organizationId,
      locationId,
      counts:{
        learningRecords:records.length,
        playbooks:playbooks.length,
        evidenceBacked:playbooks.filter(x=>x.guidanceStatus==="EVIDENCE_BACKED").length,
        promising:playbooks.filter(x=>x.guidanceStatus==="PROMISING").length,
        earlySignals:playbooks.filter(x=>x.guidanceStatus==="EARLY_SIGNAL").length,
        insufficient:playbooks.filter(x=>x.guidanceStatus==="INSUFFICIENT_EVIDENCE").length
      },
      playbooks:playbooks.slice(0,20),
      policy:{
        observationalAssociationOnly:true,
        noCausalClaim:true,
        minimumEvidenceForStrongGuidance:8,
        noAutomaticOperationalDecision:true,
        noAutonomousExecution:true,
        managerReviewRequired:true,
        approvedForAutomation:false
      }
    };
  }

  matchPriority(priority,playbooks=[]){
    if(!priority)return null;
    const candidates=playbooks.filter(x=>x.domain===priority.domain);
    if(!candidates.length)return null;
    return candidates.sort((a,b)=>
      b.confidence.score-a.confidence.score ||
      b.improvedRate-a.improvedRate ||
      b.sampleSize-a.sampleSize
    )[0];
  }
}

module.exports=CommandPlaybookIntelligenceService;
