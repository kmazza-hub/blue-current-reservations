"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory")),Cutover=require(path.join(root,"server/services/pilotDataAuthorityCutoverService"));
(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 80);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8"),server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
 assert(router.includes("/api/pilot/data-authority/activate"));assert(router.includes("/api/pilot/data-authority/rollback"));assert(server.includes("PilotDataAuthorityCutoverService"));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc800-")),dbPath=path.join(dir,"db.json");fs.writeFileSync(dbPath,JSON.stringify({locations:[{id:"l1",organizationId:"o",name:"Pilot"}]}));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 let stable=false;
 const continuity={evaluate:async()=>({decision:stable?"CONTINUOUS":"DEGRADED",trustedContinuousProviders:stable?["toast"]:[],providers:[{provider:"toast",continuity:stable?"STABLE":"DEGRADED",fallback:stable?"TRUSTED_LIVE":"DEGRADED_LOCAL_FALLBACK",recoveryReady:stable}]})};
 const svc=new Cutover(db,continuity);
 const initial=await svc.status("o",["*"],"l1");assert.equal(initial.mode,"LOCAL_AUTHORITY");assert.equal(initial.eligibleForProviderAuthority,false);
 let blocked=false;try{await svc.activate("o",["*"],"l1","toast","admin");}catch(e){blocked=e.statusCode===409;}assert.equal(blocked,true);
 stable=true;const live=await svc.activate("o",["*"],"l1","toast","admin");assert.equal(live.mode,"PROVIDER_AUTHORITY");assert.equal(live.authority.sales,"toast");assert.equal(live.authority.reservations,"toast");assert.equal(live.authority.service,"blue-current");
 const rolled=await svc.rollback("o",["*"],"l1","provider instability","admin");assert.equal(rolled.mode,"LOCAL_AUTHORITY");assert.equal(rolled.authority.sales,"blue-current");assert.equal(rolled.rollbackReason,"provider instability");
 assert.equal(live.policy.humanCutoverRequired,true);assert.equal(live.policy.noAutomaticCutover,true);assert.equal(live.policy.localFallbackAlwaysAvailable,true);assert.equal(live.policy.blueCurrentRetainsOperationalAuthority,true);
 console.log(JSON.stringify({ok:true,version:"80.0.0",humanCutover:true,unstableProviderBlocked:true,certifiedDomainAuthority:true,blueCurrentOperationalAuthority:true,humanRollback:true,localFallback:true,automaticCutover:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
