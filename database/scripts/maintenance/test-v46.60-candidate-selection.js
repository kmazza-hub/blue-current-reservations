"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
global.structuredClone=global.structuredClone||((x)=>JSON.parse(JSON.stringify(x)));
const Impact=require("../../server/services/repositoryImpactService");
const Assurance=require("../../server/services/retirementAssuranceService");
const CandidateImpact=require("../../server/services/retirementCandidateImpactService");
const Rational=require("../../client/js/modules/operatorSurfaceRationalizationEngine");
const Consolidation=require("../../client/js/modules/operatorConsolidationEngine");
const Selection=require("../../client/js/modules/retirementCandidateSelectionEngine");

(async()=>{
  const root=path.resolve(__dirname,"../.."),impact=new Impact(root),assuranceService=new Assurance(root,impact),candidateImpact=new CandidateImpact(impact,assuranceService);
  const assurance=assuranceService.snapshot();
  assert.equal(assurance.nextCandidateGate.eligible,true);
  assert.equal(assurance.regressions,0);

  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
  const ids=[...html.matchAll(/<section[^>]+id="([^"]+(?:Center|center))"/g)].map(m=>m[1]);
  const rational=new Rational({eventBus:{},appState:{getState:()=>({})}});
  const dep=ids.filter(id=>rational.classify(id).disposition==="deprecation-candidate");
  assert.ok(dep.length>=20,`Expected a meaningful deprecation pool, got ${dep.length}`);

  const batch=candidateImpact.analyze(dep.slice(0,20));
  assert.equal(batch.gateOpen,true);
  assert.equal(batch.safety.readOnly,true);
  assert.equal(batch.safety.automaticSelection,false);
  assert.equal(batch.safety.automaticDeletion,false);
  assert.ok(batch.items.length>0);

  const state={operatorUseEvidence:[]};
  const appState={getState:()=>state,update:o=>Object.assign(state,o)};
  const consolidation=new Consolidation({eventBus:{emit:()=>{}},appState,rationalizationEngine:rational});
  const fakeRational={snapshot:()=>({items:[
    {id:"innovationCenter",disposition:"deprecation-candidate"},
    {id:"executiveBriefingCenter",disposition:"deprecation-candidate"},
    {id:"portfolioPerformanceCenter",disposition:"deprecation-candidate"},
    {id:"strategyArchiveCenter",disposition:"deprecation-candidate"},
    {id:"forecastWorkbenchCenter",disposition:"deprecation-candidate"}
  ]})};
  const fakeAssurance={snapshot:async()=>({nextCandidateGate:{eligible:true},items:[{surfaceId:"retiredOldCenter"}],digest:"abc123"})};
  const engine=new Selection({eventBus:{emit:()=>{}},appState,rationalizationEngine:fakeRational,consolidationEngine:consolidation,assuranceEngine:fakeAssurance});
  engine.impact=async ids=>({gateOpen:true,items:ids.map((id,i)=>({surfaceId:id,impact:{ownedFiles:i===0?1:3,startupDependencies:1,apiReferences:0,operationalInboundReferences:i===0?1:3,testReferences:1,totalReferences:5}}))});
  const ranking=await engine.rank();
  assert.equal(ranking.automaticSelection,false);
  assert.equal(ranking.automaticDeletion,false);
  assert.ok(ranking.top3.length>=2);
  assert.equal(ranking.top3.some(x=>x.surfaceId==="executiveBriefingCenter"),false,"Executive default surface must be protected");
  assert.equal(ranking.top3.some(x=>x.surfaceId==="portfolioPerformanceCenter"),false,"Portfolio executive default must be protected");
  assert.ok(ranking.protectedCount>=2);

  const selected=engine.select(ranking.top3[0],"Candidate selection regression test");
  assert.equal(selected.status,"selected-for-preview-pipeline-only");
  assert.equal(selected.previewStarted,false);
  assert.equal(selected.codeDeletionAllowed,false);
  assert.equal(selected.deletionExecuted,false);

  let protectedBlocked=false;
  try{engine.select(ranking.ranked.find(x=>x.surfaceId==="executiveBriefingCenter"),"should fail");}catch(e){protectedBlocked=true;}
  assert.equal(protectedBlocked,true);

  console.log(JSON.stringify({
    ok:true,version:"46.60.0",
    realDeprecationPool:dep.length,
    batchImpactItems:batch.items.length,
    protectedCount:ranking.protectedCount,
    top3:ranking.top3.map(x=>({surfaceId:x.surfaceId,score:x.score})),
    selected:selected.surfaceId,
    selectionStatus:selected.status,
    protectedSelectionBlocked:protectedBlocked,
    automaticSelection:false,
    automaticDeletion:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
