"use strict";
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

class RetirementAssuranceService{
  constructor(rootPath,impactService){this.rootPath=rootPath;this.impactService=impactService;this.ledgerDir=path.join(rootPath,"config","retirements");}
  listLedgers(){if(!fs.existsSync(this.ledgerDir))return [];return fs.readdirSync(this.ledgerDir).filter(x=>x.endsWith(".json")).sort().map(name=>{try{return {name,...JSON.parse(fs.readFileSync(path.join(this.ledgerDir,name),"utf8"))};}catch(error){return {name,parseError:error.message};}});}
  hash(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");}
  verifyLedger(ledger){
    if(ledger.parseError)return {name:ledger.name,surfaceId:null,status:"invalid-ledger",score:0,checks:[{id:"parse",pass:false,detail:ledger.parseError}],blockers:[ledger.parseError]};
    const surfaceId=ledger.surfaceId||null,impact=surfaceId?this.impactService.analyze(surfaceId):null,retiredFiles=ledger.retiredFiles||[];
    const checks=[
      {id:"ledger-status",label:"Ledger records authoritative retirement",pass:ledger.status==="authoritatively-retired",detail:ledger.status||"missing"},
      {id:"retired-files-absent",label:"Retired module files remain absent",pass:retiredFiles.length>0&&retiredFiles.every(rel=>!fs.existsSync(path.join(this.rootPath,rel))),detail:`${retiredFiles.filter(rel=>!fs.existsSync(path.join(this.rootPath,rel))).length}/${retiredFiles.length} absent`},
      {id:"owned-runtime-files",label:"No owned runtime files reintroduced",pass:Boolean(impact)&&impact.graph.ownedFiles.length===0,detail:`${impact?.graph?.ownedFiles?.length??"?"} owned file(s)`},
      {id:"startup-regression",label:"No startup dependency regression",pass:Boolean(impact)&&impact.graph.startupDependencies.length===0,detail:`${impact?.graph?.startupDependencies?.length??"?"} startup dependency(ies)`},
      {id:"api-regression",label:"No API reference regression",pass:Boolean(impact)&&impact.graph.apiUsage.length===0,detail:`${impact?.graph?.apiUsage?.length??"?"} API reference(s)`},
      {id:"operational-reference-regression",label:"No operational inbound references",pass:Boolean(impact)&&!impact.graph.inboundReferences.some(x=>["reference","startup-registry","html-registration"].includes(x.type)),detail:`${impact?.graph?.inboundReferences?.filter(x=>["reference","startup-registry","html-registration"].includes(x.type)).length??"?"} operational reference(s)`},
      {id:"rollback-record",label:"Rollback evidence retained",pass:ledger.rollbackAvailable===true&&ledger.rollbackRequired===true,detail:`required=${Boolean(ledger.rollbackRequired)} · available=${Boolean(ledger.rollbackAvailable)}`},
      {id:"baseline-hashes",label:"Baseline hash evidence retained",pass:ledger.baselineHashes&&Object.keys(ledger.baselineHashes).length>0,detail:`${Object.keys(ledger.baselineHashes||{}).length} baseline hash(es)`}
    ];
    const score=Math.round(checks.reduce((sum,x)=>sum+(x.pass?100:0),0)/checks.length),blockers=checks.filter(x=>!x.pass).map(x=>`${x.label}: ${x.detail}`);
    return {name:ledger.name,surfaceId,status:score===100?"retirement-assured":"retirement-regression-detected",score,checks,blockers,retiredAt:ledger.retiredAt||null,policy:ledger.policy||null};
  }
  snapshot(){
    const ledgers=this.listLedgers(),items=ledgers.map(x=>this.verifyLedger(x)),allAssured=items.length>0&&items.every(x=>x.score===100);
    const digest=crypto.createHash("sha256").update(JSON.stringify(items.map(x=>({surfaceId:x.surfaceId,status:x.status,score:x.score})))).digest("hex");
    return {version:"46.55.0",status:allAssured?"post-retirement-assurance-ready":items.length?"blocked":"no-retirements",trusted:allAssured,retirements:items.length,assured:items.filter(x=>x.score===100).length,regressions:items.filter(x=>x.score<100).length,items,digest,rollbackRegistry:{recorded:items.filter(x=>x.checks?.find(c=>c.id==="rollback-record")?.pass).length,total:items.length},nextCandidateGate:{eligible:allAssured,reason:allAssured?"All authoritative retirements remain regression-free.":"Resolve retirement regressions before nominating another permanent retirement."},safety:{liveExecutionChanged:false,automaticDeletion:false,codeDeletionEndpointAdded:false},generatedAt:new Date().toISOString()};
  }
}
module.exports=RetirementAssuranceService;
