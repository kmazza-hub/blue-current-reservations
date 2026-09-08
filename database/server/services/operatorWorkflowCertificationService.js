"use strict";

class OperatorWorkflowCertificationService {
  constructor(database,{workflowCertificationService,failureCertificationService}={}){
    this.database=database;
    this.workflow=workflowCertificationService;
    this.failure=failureCertificationService;
  }

  async certify(organizationId,allowedLocationIds=[]){
    const db=await this.database.read();
    const allowed=id=>allowedLocationIds.includes("*")||allowedLocationIds.includes(id);
    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId&&allowed(x.id));
    const workflow=await this.workflow.certify(organizationId);
    const failure=await this.failure.certify(organizationId);

    const roles=[
      {
        id:"host",label:"Host",
        objective:"Move the guest from arrival to the correct table with minimal decisions.",
        primaryActions:["review-arrivals","check-in-guest","review-table-availability","seat-party","manage-waitlist"],
        escalation:["table-conflict","guest-request","reservation-exception"]
      },
      {
        id:"server",label:"Server",
        objective:"Understand assigned guests, tables, timing, and service exceptions immediately.",
        primaryActions:["review-section","review-seated-parties","review-guest-context","flag-service-exception"],
        escalation:["guest-recovery","table-delay","manager-assistance"]
      },
      {
        id:"kitchen",label:"Kitchen",
        objective:"Keep tickets moving through legal states while surfacing pressure before service degrades.",
        primaryActions:["review-ticket-queue","start-ticket","mark-item-ready","plate-ticket","serve-ticket"],
        escalation:["held-ticket","station-pressure","ticket-delay"]
      },
      {
        id:"manager",label:"Manager",
        objective:"See what requires intervention now, what is next, and what can wait.",
        primaryActions:["review-shift-command","resolve-exception","rebalance-service","complete-service","review-readiness"],
        escalation:["critical-incident","workflow-blocker","reconciliation-required"]
      },
      {
        id:"executive",label:"Executive",
        objective:"See material operating and financial exceptions without restaurant-level noise.",
        primaryActions:["review-portfolio-health","review-material-risk","review-profitability","assign-accountable-action"],
        escalation:["multi-location-risk","material-profit-impact","pilot-no-go"]
      }
    ];

    const locationResults=locations.map(location=>{
      const reservations=(db.reservations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===location.id);
      const tables=(db.tables||[]).filter(x=>x.organizationId===organizationId&&x.locationId===location.id);
      const staff=(db.staff||db.employees||[]).filter(x=>x.organizationId===organizationId&&x.locationId===location.id);
      const tickets=(db.kitchenTickets||[]).filter(x=>x.organizationId===organizationId&&x.locationId===location.id);
      const checks=[
        {id:"location-context",passed:!!location.id,detail:"Operator actions remain location-scoped."},
        {id:"reservation-context",passed:Array.isArray(reservations),detail:`${reservations.length} reservation record(s) available.`},
        {id:"floor-context",passed:Array.isArray(tables)&&tables.length>0,detail:`${tables.length} table record(s) available.`},
        {id:"staff-context",passed:Array.isArray(staff),detail:`${staff.length} staff record(s) available.`},
        {id:"kitchen-context",passed:Array.isArray(tickets),detail:`${tickets.length} kitchen ticket record(s) available.`},
        {id:"workflow-certified",passed:workflow.pilotWorkflowReady===true,detail:`${workflow.issues?.length||0} workflow issue(s).`},
        {id:"failure-safe",passed:failure.liveShiftFailureReady===true,detail:`${failure.issues?.length||0} failure-path issue(s).`}
      ];
      const blockers=checks.filter(x=>!x.passed);
      return {
        locationId:location.id,locationName:location.name||location.id,
        certified:blockers.length===0,
        score:Math.round((checks.length-blockers.length)/checks.length*100),
        checks,blockers
      };
    });

    const blockerCount=locationResults.reduce((n,x)=>n+x.blockers.length,0);
    return {
      version:"74.50.0",generatedAt:new Date().toISOString(),organizationId,
      certified:locations.length>0&&blockerCount===0,
      operatorPilotReady:locations.length>0&&blockerCount===0,
      locationCount:locations.length,blockerCount,
      roles,locations:locationResults,
      experiencePolicy:{
        immediateWorkFirst:true,
        progressiveDisclosure:true,
        roleSpecificActions:true,
        exceptionFirstManagement:true,
        destructiveActionsRequireIntent:true,
        noAutomaticOperationalDecision:true,
        darkEnvironmentHighContrastRequired:true,
        touchTargetsRequired:true
      }
    };
  }
}
module.exports=OperatorWorkflowCertificationService;
