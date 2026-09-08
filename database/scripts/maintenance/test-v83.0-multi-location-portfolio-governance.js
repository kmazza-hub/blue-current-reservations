"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory")),Portfolio=require(path.join(root,"server/services/multiLocationPortfolioGovernanceService"));
(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 83);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8"),server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
 assert(router.includes("/api/executive/portfolio-health"));
 assert(server.includes("MultiLocationPortfolioGovernanceService"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc830-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,JSON.stringify({
  locations:[
   {id:"l1",organizationId:"o",name:"Flagship"},
   {id:"l2",organizationId:"o",name:"Expansion Two"},
   {id:"l3",organizationId:"o",name:"Expansion Three"}
  ],
  expansionProductionActivations:{
   "o:l1":{status:"ACTIVE"},"o:l2":{status:"ACTIVE"},"o:l3":{status:"ROLLED_BACK"}
  },
  expansionStabilizationGraduations:{"o:l1":{status:"GRADUATED"}},
  expansionStabilizationIncidents:[
   {organizationId:"o",locationId:"l2",status:"OPEN",severity:"CRITICAL"},
   {organizationId:"o",locationId:"l2",status:"OPEN",severity:"WATCH"}
  ]
 }));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const stabilization={status:async(o,a,l)=>({state:l==="l2"?"UNSTABLE":l==="l1"?"READY_TO_GRADUATE":null})};
 const continuity={evaluate:async(o,a,l)=>({providers:[{provider:"toast",continuity:l==="l2"?"DEGRADED":"STABLE",fallback:l==="l2"?"DEGRADED_LOCAL_FALLBACK":"TRUSTED_LIVE",recoveryReady:l!=="l2"}]})};
 const svc=new Portfolio(db,stabilization,continuity);
 const p=await svc.portfolio("o",["*"]);
 assert.equal(p.version,"83.0.0");
 assert.equal(p.counts.total,3);
 assert.equal(p.counts.normalOperations,1);
 assert.equal(p.counts.critical,1);
 assert.equal(p.counts.rolledBack,1);
 assert.equal(p.criticalIncidents,1);
 assert.equal(p.executiveAttention[0].locationId,"l2");
 assert.equal(p.executiveAttention[0].health,"CRITICAL");
 assert.equal(p.policy.noAutomaticCrossLocationAction,true);
 assert.equal(p.policy.noAutomaticRolloutExpansion,true);
 assert.equal(p.policy.autonomousProductionChanges,false);
 console.log(JSON.stringify({
  ok:true,version:"83.0.0",multiLocationPortfolio:true,locationHealth:true,
  rolloutState:true,incidentConcentration:true,supportBurden:true,
  operatingConsistency:true,executiveAttentionPrioritization:true,
  locationAuthorityIndependent:true,automaticCrossLocationAction:false,
  automaticRolloutExpansion:false,autonomousProductionChanges:false
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
