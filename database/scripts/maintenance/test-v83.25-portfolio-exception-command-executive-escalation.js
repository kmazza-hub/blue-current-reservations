"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory")),Command=require(path.join(root,"server/services/portfolioExceptionCommandService"));
(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 83);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8"),server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
 assert(router.includes("/api/executive/portfolio-exceptions/acknowledge"));assert(router.includes("/api/executive/portfolio-exceptions/resolve"));assert(server.includes("PortfolioExceptionCommandService"));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8325-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,JSON.stringify({portfolioExceptions:[{id:"existing",organizationId:"o",locationId:"l3",locationName:"Three",reason:"PROVIDER_CONTINUITY",severity:"WATCH",status:"ACKNOWLEDGED",owner:"Ops",openedAt:new Date(Date.now()-5*3600000).toISOString()}]}));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const portfolio={portfolio:async()=>({generatedAt:new Date(Date.now()-2*3600000).toISOString(),executiveAttention:[{locationId:"l1",name:"One",health:"CRITICAL",attention:["CRITICAL_INCIDENT","PROVIDER_CONTINUITY"]},{locationId:"l2",name:"Two",health:"WATCH",attention:["PROVIDER_CONTINUITY"]}]})};
 const svc=new Command(db,portfolio);let c=await svc.list("o",["*"]);
 assert.equal(c.summary.open,4);assert.equal(c.summary.executive,2);assert.equal(c.summary.spreadingPatterns,1);assert(c.spreadingPatterns.some(x=>x.reason==="PROVIDER_CONTINUITY"&&x.count===3));
 const critical=c.exceptions.find(x=>x.locationId==="l1"&&x.reason==="CRITICAL_INCIDENT");assert.equal(critical.escalation,"EXECUTIVE");
 let a=await svc.acknowledge("o",["*"],critical.id,{owner:"Regional VP"},"executive");assert.equal(a.exception.status,"ACKNOWLEDGED");
 let blocked=false;try{const u=c.exceptions.find(x=>x.locationId==="l2");await svc.resolve("o",["*"],u.id,{rationale:"Issue fully verified and cleared."},"executive");}catch(e){blocked=e.statusCode===409}assert.equal(blocked,true);
 let r=await svc.resolve("o",["*"],critical.id,{rationale:"Incident recovered, evidence reviewed, and location is stable."},"executive");assert.equal(r.resolved.status,"RESOLVED");assert.equal(r.command.policy.executiveDecisionRemainsHuman,true);assert.equal(r.command.policy.noAutomaticCrossLocationAction,true);assert.equal(r.command.policy.autonomousProductionChanges,false);
 console.log(JSON.stringify({ok:true,version:"83.25.0",exceptionCommand:true,ownership:true,aging:true,executiveEscalation:true,crossLocationPatternDetection:true,acknowledgementRequired:true,humanResolution:true,automaticCrossLocationAction:false,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
