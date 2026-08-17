"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Certification=require(path.join(root,"server/services/integrationCertificationService"));

(async()=>{
 assert.equal(pkg.version,"87.0.0");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/integrations/certification/phase-b"));
 assert(router.includes("/api/integrations/certification/evidence"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc870-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,"{}");
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});

 const readiness={report:async()=>({
  summary:{pilotIntegrationReady:true},
  connectors:[{connectorId:"toast-pilot",provider:"TOAST",domain:"POS",healthy:true}]
 })};
 const sync={report:async()=>({
  checkpoints:[{connectorId:"toast-pilot",stream:"orders",cursor:"c1",sequence:1}],
  failures:[]
 })};
 const recon={report:async()=>({conflicts:[],authority:{POS_TRANSACTION:"EXTERNAL_POS"}})};
 const health={build:async()=>({connectors:[{connectorId:"toast-pilot",trust:"TRUSTED"}]})};

 const svc=new Certification(db,readiness,sync,recon,health);

 let connector=await svc.evaluateConnector("o","toast-pilot");
 assert.equal(connector.technicalReady,true);
 assert.equal(connector.providerEvidenceReady,false);
 assert.equal(connector.productionCertified,false);
 assert.equal(connector.status,"TECHNICALLY_READY_PROVIDER_EVIDENCE_REQUIRED");
 assert(connector.evidence.missing.includes("REAL_PROVIDER_CREDENTIALS_VALIDATED"));

 for(const evidenceType of svc.requiredEvidence()){
   await svc.recordEvidence("o",{connectorId:"toast-pilot",evidenceType,note:`Verified evidence for ${evidenceType} during real provider certification.`,reference:"cert-run-001",verified:true},"integration-admin");
 }

 connector=await svc.evaluateConnector("o","toast-pilot");
 assert.equal(connector.providerEvidenceReady,true);
 assert.equal(connector.productionCertified,true);
 assert.equal(connector.status,"PRODUCTION_CERTIFIED");

 const phase=await svc.phaseB("o");
 assert.equal(phase.pilotPlatformReady,true);
 assert.equal(phase.providerProductionCertificationComplete,true);
 assert.equal(phase.exitGate.blueCurrentPhaseBExit,true);
 assert.equal(phase.exitGate.nextPhase,"C — RESTAURANT CONFIGURATION AND PILOT SETUP");
 assert.equal(phase.policy.phaseBExitDoesNotClaimProviderCertification,true);
 assert.equal(phase.policy.noAutomaticWriteBack,true);
 assert.equal(phase.policy.autonomousProductionChanges,false);

 console.log(JSON.stringify({
  ok:true,version:"87.0.0",
  phaseBIntegrationExit:true,
  blueCurrentPlatformCertification:true,
  realProviderEvidenceRequired:true,
  connectorSpecificCertification:true,
  organizationSpecificCertification:true,
  simulationAloneCannotCertify:true,
  writeBackCertificationSeparate:true,
  nextPhase:"C",
  autonomousProductionChanges:false
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
