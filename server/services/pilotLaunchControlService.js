"use strict";
const crypto=require("crypto");
class PilotLaunchControlService{
 constructor(database,auditService,realtimeHub,pilotDeploymentPackageService){Object.assign(this,{database,auditService,realtimeHub,pilotDeploymentPackageService});}
 now(){return new Date().toISOString();}
 allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
 async records(org){const db=await this.database.read();return(db.pilotLaunchControls||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));}
 async authorizations(org){const db=await this.database.read();return(db.pilotLaunchAuthorizations||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.authorizedAt)-new Date(a.authorizedAt));}
 config(db,org,locationId){
  const location=(db.locations||[]).find(x=>x.organizationId===org&&x.id===locationId)||null;
  const tables=(db.tables||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
  const sections=(db.sections||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
  const memberships=(db.memberships||[]).filter(x=>x.organizationId===org&&((x.locationIds||[]).includes("*")||(x.locationIds||[]).includes(locationId)));
  const connectors=(db.liveConnectors||[]).filter(x=>x.organizationId===org&&(!x.locationId||x.locationId===locationId));
  const normalized={location:location?{id:location.id,name:location.name||location.displayName,status:location.status||null}:null,tables:tables.map(x=>({id:x.id,name:x.name||x.label||null,seats:x.seats||null,status:x.status||null})),sections:sections.map(x=>({id:x.id,name:x.name||null})),memberships:memberships.map(x=>({id:x.id,userId:x.userId,role:x.role,locationIds:x.locationIds})),connectors:connectors.map(x=>({id:x.id,type:x.type,status:x.status,locationId:x.locationId||null}))};
  return{normalized,hash:crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex")};
 }
 checks(control,deploymentLoc,currentHash){
  const open=(control?.blockers||[]).filter(x=>x.status!=="RESOLVED"),roster=control?.operatorRoster||[],support=control?.supportBridge||{},freeze=control?.configurationFreeze||{},win=control?.launchWindow||{};
  return[
   {id:"PILOT_LOCATION_SELECTED",label:"Pilot restaurant selected",passed:!!control?.locationId,actual:control?.locationName||"not selected"},
   {id:"DEPLOYMENT_PACKAGE_CERTIFIED",label:"Pilot deployment package certified",passed:deploymentLoc?.certification?.status==="PILOT_DEPLOYMENT_CERTIFIED",actual:deploymentLoc?.certification?.status||"not certified"},
   {id:"CONFIGURATION_FROZEN",label:"Pilot configuration freeze recorded",passed:!!freeze.hash,actual:freeze.hash?`SHA-256 ${freeze.hash.slice(0,12)}…`:"not frozen"},
   {id:"CONFIGURATION_UNCHANGED",label:"Current configuration matches frozen configuration",passed:!!freeze.hash&&freeze.hash===currentHash,actual:freeze.hash?(freeze.hash===currentHash?"matches freeze":"changed since freeze"):"no freeze"},
   {id:"LAUNCH_WINDOW",label:"Pilot launch window recorded",passed:!!win.start&&!!win.end,actual:win.start?`${win.start} → ${win.end}`:"not set"},
   {id:"LAUNCH_OWNER",label:"Human launch owner assigned",passed:!!control?.launchOwner,actual:control?.launchOwner||"not assigned"},
   {id:"OPERATOR_ROSTER",label:"Pilot operator roster confirmed",passed:roster.length>0&&roster.every(x=>x.confirmed===true),actual:`${roster.filter(x=>x.confirmed).length}/${roster.length} confirmed`},
   {id:"SUPPORT_BRIDGE",label:"Live support bridge and escalation path recorded",passed:!!support.channel&&!!support.owner&&!!support.escalationOwner,actual:support.channel?`${support.channel} · ${support.owner}`:"not configured"},
   {id:"NO_OPEN_BLOCKERS",label:"No unresolved launch blockers",passed:open.length===0,actual:`${open.length} open blocker(s)`},
   {id:"PRELAUNCH_EVIDENCE",label:"Human pre-launch verification evidence recorded",passed:!!control?.prelaunchEvidence,actual:control?.prelaunchEvidence?"recorded":"not recorded"}
  ];
 }
 async snapshot(org,allowed){
  const[db,deployment,records,auths]=await Promise.all([this.database.read(),this.pilotDeploymentPackageService.snapshot(org,allowed),this.records(org),this.authorizations(org)]);
  const latest=new Map(),authorized=new Map();for(const r of records)if(!latest.has(r.locationId))latest.set(r.locationId,r);for(const a of auths)if(!authorized.has(a.locationId))authorized.set(a.locationId,a);
  const locations=(db.locations||[]).filter(x=>x.organizationId===org&&this.allowed(x.id,allowed)).map(loc=>{const control=latest.get(loc.id)||null,current=this.config(db,org,loc.id),deploymentLoc=deployment.locations.find(x=>x.locationId===loc.id)||null,checks=this.checks(control,deploymentLoc,current.hash),auth=authorized.get(loc.id)||null,open=(control?.blockers||[]).filter(x=>x.status!=="RESOLVED");return{locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,control,authorization:auth,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,currentConfigurationHash:current.hash,openBlockers:open,launchReady:checks.every(x=>x.passed),launchState:auth?.status==="PILOT_LAUNCH_AUTHORIZED"?"PILOT_LAUNCH_AUTHORIZED":control?"LAUNCH_CONTROL_CONFIGURED":"LAUNCH_CONTROL_REQUIRED"};});
  return{version:"51.55.0",generatedAt:this.now(),status:locations.length===0?"restaurant-required":locations.some(x=>x.authorization?.status==="PILOT_LAUNCH_AUTHORIZED")?"pilot-launch-authorized":locations.some(x=>x.launchReady)?"pilot-launch-ready-for-authorization":"pilot-launch-control-required",headline:`${locations.filter(x=>x.launchReady).length}/${locations.length} location(s) currently satisfy all launch-control gates; ${locations.reduce((n,x)=>n+x.openBlockers.length,0)} unresolved blocker(s) remain.`,locations,policy:{onePilotLocationAtATimeRecommended:true,configurationFreezeRequired:true,deploymentPackageCertificationRequired:true,operatorRosterConfirmationRequired:true,supportBridgeRequired:true,zeroOpenBlockersRequired:true,humanLaunchAuthorizationRequired:true,authorizationDoesNotStartRuntime:true,authorizationDoesNotPerformGoLive:true,automaticLaunch:false,automaticGoLive:false,autonomousProductionChanges:false}};
 }
 async configure(org,allowed,locationId,input,actor){
  if(!this.allowed(locationId,allowed))throw new Error("Location is outside your authorized scope.");const db=await this.database.read(),loc=(db.locations||[]).find(x=>x.organizationId===org&&x.id===locationId);if(!loc)throw new Error("Pilot location not found.");
  const launchOwner=String(input.launchOwner||"").trim().slice(0,160),start=String(input.launchWindowStart||"").trim().slice(0,80),end=String(input.launchWindowEnd||"").trim().slice(0,80);if(!launchOwner)throw new Error("Human launch owner is required.");if(!start||!end)throw new Error("Pilot launch window start and end are required.");
  const roster=(Array.isArray(input.operatorRoster)?input.operatorRoster:[]).map((x,i)=>({id:String(x.id||`operator_${i+1}`),name:String(x.name||"").trim().slice(0,160),role:String(x.role||"pilot operator").trim().slice(0,120),confirmed:x.confirmed===true}));if(!roster.length||roster.some(x=>!x.name))throw new Error("At least one named pilot operator is required.");
  const support={channel:String(input.supportChannel||"").trim().slice(0,240),owner:String(input.supportOwner||"").trim().slice(0,160),escalationOwner:String(input.escalationOwner||"").trim().slice(0,160)};if(!support.channel||!support.owner||!support.escalationOwner)throw new Error("Support bridge channel, support owner, and escalation owner are required.");
  const prelaunchEvidence=String(input.prelaunchEvidence||"").trim().slice(0,3200);if(!prelaunchEvidence)throw new Error("Human pre-launch verification evidence is required.");
  const blockers=(Array.isArray(input.blockers)?input.blockers:[]).map((x,i)=>({id:String(x.id||`blocker_${i+1}`),severity:String(x.severity||"medium").toLowerCase(),issue:String(x.issue||"").trim().slice(0,1500),status:String(x.status||"OPEN").toUpperCase(),owner:String(x.owner||"").trim().slice(0,160)})).filter(x=>x.issue);
  const current=this.config(db,org,locationId),now=this.now(),record={id:`plc51_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,locationName:loc.name||loc.displayName||locationId,status:"PILOT_LAUNCH_CONTROL_CONFIGURED",createdAt:now,createdBy:actor,launchOwner,launchWindow:{start,end},operatorRoster:roster,supportBridge:support,blockers,prelaunchEvidence,note:String(input.note||"").trim().slice(0,1800),configurationFreeze:{frozenAt:now,frozenBy:actor,hash:current.hash,summary:{tables:current.normalized.tables.length,sections:current.normalized.sections.length,memberships:current.normalized.memberships.length,connectors:current.normalized.connectors.length}},runtimeStarted:false,goLivePerformed:false};
  await this.database.mutate(db=>{db.pilotLaunchControls||=[];db.pilotLaunchControls.push(record);return record;});await this.auditService.record({organizationId:org,actor,action:`Pilot launch control configured and configuration frozen for ${locationId}; no launch performed`,category:"pilot_launch"});this.realtimeHub.publish("pilot-launch:configured",{organizationId:org,locationId,id:record.id});return record;
 }
 async resolveBlocker(org,controlId,blockerId,input,actor){
  const resolution=String(input.resolution||"").trim().slice(0,1800);if(!resolution)throw new Error("Human blocker-resolution evidence is required.");const now=this.now(),result=await this.database.mutate(db=>{const c=(db.pilotLaunchControls||[]).find(x=>x.id===controlId&&x.organizationId===org);if(!c)return null;const b=(c.blockers||[]).find(x=>x.id===blockerId);if(!b)return null;b.status="RESOLVED";b.resolution=resolution;b.resolvedAt=now;b.resolvedBy=actor;return{...b};});if(!result)throw new Error("Pilot launch blocker not found.");await this.auditService.record({organizationId:org,actor,action:`Pilot launch blocker ${blockerId} resolved with human evidence`,category:"pilot_launch"});this.realtimeHub.publish("pilot-launch:blocker-resolved",{organizationId:org,controlId,blockerId});return result;
 }
 async authorize(org,allowed,locationId,input,actor){
  const snap=await this.snapshot(org,allowed),loc=snap.locations.find(x=>x.locationId===locationId);if(!loc)throw new Error("Pilot location not found.");if(!loc.launchReady)throw new Error("All pilot launch-control gates must pass before launch authorization.");
  const evidence=String(input.evidence||"").trim().slice(0,3400),note=String(input.note||"").trim().slice(0,1800);if(!evidence)throw new Error("Human launch-authorization evidence is required.");if(!note)throw new Error("Human launch-authorization note is required.");
  const record={id:`pla51_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,locationName:loc.locationName,status:"PILOT_LAUNCH_AUTHORIZED",authorizedAt:this.now(),authorizedBy:actor,evidence,note,controlId:loc.control.id,launchOwner:loc.control.launchOwner,launchWindow:loc.control.launchWindow,configurationHash:loc.currentConfigurationHash,gateSnapshot:loc.checks,runtimeStartedByAuthorization:false,goLivePerformedByAuthorization:false,autonomousProductionChanges:false};
  await this.database.mutate(db=>{db.pilotLaunchAuthorizations||=[];db.pilotLaunchAuthorizations.push(record);return record;});await this.auditService.record({organizationId:org,actor,action:`Pilot launch authorized for ${locationId}; authorization did not start runtime or perform go-live`,category:"pilot_launch"});this.realtimeHub.publish("pilot-launch:authorized",{organizationId:org,locationId,id:record.id});return record;
 }
}
module.exports=PilotLaunchControlService;
