"use strict";

class PilotOperationalReadinessService {
  constructor(database,v49ReleaseCertificationService,v50ReleaseCertificationService,technicalActivationReadinessService,pilotProofProgramService){
    Object.assign(this,{database,v49ReleaseCertificationService,v50ReleaseCertificationService,technicalActivationReadinessService,pilotProofProgramService});
  }
  now(){return new Date().toISOString();}
  allowed(locationId,allowedLocationIds=[]){return allowedLocationIds.includes("*")||allowedLocationIds.includes(locationId);}
  async snapshot(organizationId,allowedLocationIds){
    const [db,v49,v50,technical,pilotProof]=await Promise.all([
      this.database.read(),
      this.v49ReleaseCertificationService.snapshot(organizationId,allowedLocationIds),
      this.v50ReleaseCertificationService.snapshot(organizationId,allowedLocationIds),
      this.technicalActivationReadinessService.snapshot(organizationId,allowedLocationIds),
      this.pilotProofProgramService.snapshot(organizationId,allowedLocationIds)
    ]);

    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId&&this.allowed(x.id,allowedLocationIds));
    const tables=(db.tables||[]).filter(x=>x.organizationId===organizationId);
    const sections=(db.sections||[]).filter(x=>x.organizationId===organizationId);
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===organizationId);
    const staff=(db.staff||[]).filter(x=>x.organizationId===organizationId&&x.status==="active");
    const employees=(db.employees||[]).filter(x=>x.organizationId===organizationId&&x.status==="active");
    const kitchenStations=(db.kitchenStations||[]).filter(x=>x.organizationId===organizationId);
    const memberships=(db.memberships||[]).filter(x=>x.organizationId===organizationId);
    const connectors=(db.liveConnectors||[]).filter(x=>x.organizationId===organizationId);
    const technicalByLocation=new Map((technical.locations||[]).map(x=>[x.locationId,x]));

    const rows=locations.map(loc=>{
      const id=loc.id,tech=technicalByLocation.get(id)||null;
      const locationTables=tables.filter(x=>x.locationId===id);
      const locationSections=sections.filter(x=>x.locationId===id);
      const locationReservations=reservations.filter(x=>x.locationId===id);
      const locationPeople=[...staff.filter(x=>x.locationId===id),...employees.filter(x=>x.locationId===id)];
      const locationKitchen=kitchenStations.filter(x=>x.locationId===id);
      const access=memberships.filter(x=>(x.locationIds||[]).includes("*")||(x.locationIds||[]).includes(id));
      const locationConnectors=connectors.filter(x=>!x.locationId||x.locationId===id);
      const configuredConnectors=locationConnectors.filter(x=>String(x.status||"").toLowerCase()!=="not-configured");
      const connectedConnectors=locationConnectors.filter(x=>["connected","active","ready"].includes(String(x.status||"").toLowerCase()));

      const checks=[
        {id:"location-record",category:"foundation",label:"Restaurant/location record exists",required:true,passed:true,actual:id},
        {id:"floor-model",category:"floor",label:"Floor model has tables and sections",required:true,passed:locationTables.length>0&&locationSections.length>0,actual:`${locationTables.length} tables · ${locationSections.length} sections`},
        {id:"reservation-path",category:"reservations",label:"Reservation operating path has data or a configured connector",required:true,passed:locationReservations.length>0||configuredConnectors.some(x=>x.type==="reservations"),actual:`${locationReservations.length} reservations · ${configuredConnectors.filter(x=>x.type==="reservations").length} configured reservation connector(s)`},
        {id:"workforce-roster",category:"staff",label:"Active workforce roster exists",required:true,passed:locationPeople.length>0||configuredConnectors.some(x=>x.type==="labor"),actual:`${locationPeople.length} active people`},
        {id:"kitchen-model",category:"kitchen",label:"Kitchen operating model or connector exists",required:true,passed:locationKitchen.length>0||configuredConnectors.some(x=>x.type==="kitchen"),actual:`${locationKitchen.length} kitchen stations`},
        {id:"authorized-access",category:"identity",label:"At least one authorized membership can access the restaurant",required:true,passed:access.length>0,actual:`${access.length} authorized membership(s)`},
        {id:"technical-preflight",category:"deployment",label:"Technical activation preflight is complete",required:true,passed:tech?.technicallyReady===true,actual:tech?`${tech.requiredPassed}/${tech.requiredTotal} required checks`:"not in technical activation review"},
        {id:"production-architecture",category:"production",label:"V50 production architecture is certified",required:true,passed:v50.architecturePassed===v50.architectureTotal&&v50.architectureTotal>0,actual:`${v50.architecturePassed}/${v50.architectureTotal} architecture contracts`},
        {id:"pilot-success-contract",category:"pilot",label:"Pilot baseline and success criteria are configured",required:true,passed:!!pilotProof.program&&!!pilotProof.successCriteria,actual:!pilotProof.program?"pilot baseline missing":pilotProof.successCriteria?"configured":"success criteria missing"},
        {id:"external-connectivity",category:"integrations",label:"At least one production-capable external connector is live",required:false,passed:connectedConnectors.length>0,actual:`${connectedConnectors.length} connected connector(s)`}
      ];
      const required=checks.filter(x=>x.required),passed=required.filter(x=>x.passed).length;
      const blockers=required.filter(x=>!x.passed);
      const warnings=checks.filter(x=>!x.required&&!x.passed);
      const percent=required.length?Math.round(passed/required.length*100):0;
      return {
        locationId:id,locationName:loc.name||loc.displayName||id,
        readinessPercent:percent,requiredPassed:passed,requiredTotal:required.length,
        pilotReady:passed===required.length,
        decision:passed===required.length?"GO":percent>=75?"CONDITIONAL":"NO-GO",
        checks,blockers,warnings,
        dependencies:{
          tables:locationTables.length,sections:locationSections.length,reservations:locationReservations.length,
          activePeople:locationPeople.length,kitchenStations:locationKitchen.length,authorizedMemberships:access.length,
          configuredConnectors:configuredConnectors.length,connectedConnectors:connectedConnectors.length
        }
      };
    });

    const requiredChecks=rows.reduce((n,x)=>n+x.requiredTotal,0);
    const passedChecks=rows.reduce((n,x)=>n+x.requiredPassed,0);
    const blockers=rows.flatMap(x=>x.blockers.map(b=>({locationId:x.locationId,locationName:x.locationName,...b})));
    const warnings=rows.flatMap(x=>x.warnings.map(w=>({locationId:x.locationId,locationName:x.locationName,...w})));
    const ready=rows.filter(x=>x.pilotReady).length;
    const portfolioPercent=requiredChecks?Math.round(passedChecks/requiredChecks*100):0;

    return {
      version:"51.05.0",generatedAt:this.now(),
      status:rows.length===0?"pilot-location-required":ready===rows.length?"PILOT-BASELINE-GO":portfolioPercent>=75?"PILOT-BASELINE-CONDITIONAL":"PILOT-BASELINE-NO-GO",
      headline:rows.length===0?"No authorized restaurant locations are available for pilot readiness review.":`${ready}/${rows.length} restaurant location(s) satisfy every required V51 pilot baseline gate.`,
      readinessPercent:portfolioPercent,requiredPassed:passedChecks,requiredTotal:requiredChecks,
      blockerCount:blockers.length,warningCount:warnings.length,
      locations:rows,blockers,warnings,
      upstream:{
        v49Status:v49.status,v49Architecture:`${v49.architecturePassed}/${v49.architectureTotal}`,
        v50Status:v50.status,v50Architecture:`${v50.architecturePassed}/${v50.architectureTotal}`,
        pilotProgramStatus:pilotProof.status,
        technicalStatus:technical.status
      },
      goNoGo:{
        decision:rows.length>0&&ready===rows.length?"GO":portfolioPercent>=75?"CONDITIONAL":"NO-GO",
        rule:"GO requires every required pilot baseline check to pass for every in-scope restaurant. Warnings do not block GO.",
        humanApprovalRequired:true
      },
      policy:{
        assessmentReadOnly:true,
        noSyntheticReadiness:true,
        warningsDoNotBecomePasses:true,
        humanGoNoGoRequired:true,
        automaticConfiguration:false,
        automaticDeployment:false,
        automaticGoLive:false,
        autonomousProductionChanges:false
      }
    };
  }
}
module.exports=PilotOperationalReadinessService;
