"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Config=require(path.join(root,"server/services/restaurantConfigurationService"));
const Cert=require(path.join(root,"server/services/pilotLocationConfigurationCertificationService"));
const Binding=require(path.join(root,"server/services/pilotDataWorkflowBindingService"));
const Simulation=require(path.join(root,"server/services/pilotScenarioServiceSimulationService"));
const Acceptance=require(path.join(root,"server/services/pilotOperatorAcceptanceService"));
const Launch=require(path.join(root,"server/services/pilotReadinessLaunchControlService"));
const Runtime=require(path.join(root,"server/services/pilotRuntimeSessionControlService"));
const Observability=require(path.join(root,"server/services/pilotRuntimeObservabilityIncidentService"));
(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 89);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/pilot/runtime-observability/incident"));
 assert(router.includes("/timeline"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8975-")),dbPath=path.join(dir,"db.json");fs.writeFileSync(dbPath,"{}");
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const config=new Config(db),cert=new Cert(db,config),binding=new Binding(db,config,cert),sim=new Simulation(db,binding),acceptance=new Acceptance(db,sim,binding),launch=new Launch(db,config,cert,binding,sim,acceptance),runtime=new Runtime(db,launch),obs=new Observability(db,runtime);

 await config.save("o",{location:{id:"pilot",name:"Pilot",timezone:"America/New_York",currency:"USD"},servicePeriods:[{id:"dinner",name:"Dinner",start:"16:00",end:"22:00",enabled:true}],diningAreas:[{id:"main",name:"Main",enabled:true}],tables:[{id:"t1",name:"Table 1",areaId:"main",minCovers:2,maxCovers:4}],roles:[{id:"manager",name:"Manager",enabled:true},{id:"host",name:"Host",enabled:true},{id:"server",name:"Server",enabled:true}],targets:{targetTurnMinutes:90},integrationAssignments:[{domain:"POS",connectorId:"toast-pilot",mode:"READ_ONLY"}],pilot:{enabled:true,mode:"PILOT",writeBackEnabled:false,autonomousProductionChanges:false}},"admin");
 await cert.certify("o","admin");await binding.build("o",{},"admin");await sim.run("o",{},"admin");
 for(const d of acceptance.dimensions()) await acceptance.observe("o",{dimension:d.id,score:4,note:`Operator confirms ${d.label} is suitable for controlled runtime.`,blocker:false},"operator");
 await acceptance.accept("o",{statement:"Operator accepts this exact evidence set for controlled runtime."},"operator");
 await launch.approve("o",{statement:"Administrator approves this evidence set for controlled restaurant pilot runtime."},"admin");
 const session=await runtime.start("o",{label:"Dinner pilot"},"admin");

 await obs.recordMetric("o",{sessionId:session.id,name:"service_latency_ms",value:142,unit:"ms"},"system");
 let incident=await obs.createIncident("o",{sessionId:session.id,title:"Reservation feed delay",description:"Reservation source latency exceeded the expected pilot threshold.",severity:"HIGH",category:"INTEGRATION"},"operator");
 assert.equal(incident.status,"OPEN");
 incident=await obs.acknowledge("o",incident.id,{note:"Manager acknowledged and is monitoring the affected source."},"manager");
 assert.equal(incident.status,"ACKNOWLEDGED");
 incident=await obs.escalate("o",incident.id,{note:"Integration owner engaged because latency persisted during service."},"manager");
 assert.equal(incident.status,"ESCALATED");
 incident=await obs.resolve("o",incident.id,{resolution:"Source latency recovered and reservation data freshness returned within threshold."},"manager");
 assert.equal(incident.status,"RESOLVED");

 const critical=await obs.createIncident("o",{sessionId:session.id,title:"Critical data trust failure",description:"Multiple source conflicts make connected revenue context unsafe to trust.",severity:"CRITICAL",category:"DATA_TRUST"},"operator");
 assert.equal(critical.severity,"CRITICAL");
 const paused=await runtime.session("o",session.id);
 assert.equal(paused.state,"PAUSED");

 const view=await obs.timeline("o",session.id);
 assert.equal(view.summary.metrics,1);
 assert.equal(view.summary.incidents,2);
 assert.equal(view.summary.criticalOpen,1);
 assert(view.timeline.some(x=>x.kind==="INCIDENT_RESOLVED"));
 assert(view.timeline.some(x=>x.kind==="SESSION"));
 assert.equal(view.policy.criticalIncidentPausesActiveSession,true);
 assert.equal(view.policy.observabilityDoesNotExecuteOperations,true);
 assert.equal(view.policy.autonomousProductionChanges,false);

 console.log(JSON.stringify({
   ok:true,version:"89.75.0",phase:"C",
   runtimeMetrics:true,incidentLifecycle:true,severityControl:true,
   criticalIncidentPause:true,acknowledgement:true,escalation:true,resolution:true,
   chronologicalServiceTimeline:true,observabilityReadOnly:true,
   providerWriteBack:false,autonomousProductionChanges:false,
   nextGate:"PILOT_SESSION_CLOSEOUT_AND_EVIDENCE_CAPTURE"
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
