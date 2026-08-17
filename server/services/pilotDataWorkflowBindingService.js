"use strict";

class PilotDataWorkflowBindingService {
  constructor(database, restaurantConfigurationService, locationCertificationService){
    this.database=database;
    this.configuration=restaurantConfigurationService;
    this.locationCertification=locationCertificationService;
  }
  now(){return new Date().toISOString();}
  domains(){return ["GUESTS","RESERVATIONS","TABLES","SERVICE","TEAM","KITCHEN","POS"];}

  defaultBindings(configuration){
    const assigned=(configuration.integrationAssignments||[]);
    const connectorFor=(domain)=>{
      const row=assigned.find(x=>String(x.domain||"").toUpperCase()===domain);
      return row?.connectorId||null;
    };
    return [
      {domain:"GUESTS",source:"BLUE_CURRENT",workflow:"GUEST_PROFILE_AND_HISTORY",mode:"READ_WRITE_INTERNAL"},
      {domain:"RESERVATIONS",source:"BLUE_CURRENT",workflow:"RESERVATION_LIFECYCLE",mode:"READ_WRITE_INTERNAL"},
      {domain:"TABLES",source:"RESTAURANT_CONFIGURATION",workflow:"FLOOR_AND_TABLE_STATE",mode:"CONFIGURATION_BOUND"},
      {domain:"SERVICE",source:"BLUE_CURRENT",workflow:"LIVE_SERVICE_COORDINATION",mode:"READ_WRITE_INTERNAL"},
      {domain:"TEAM",source:connectorFor("LABOR")||"BLUE_CURRENT",workflow:"STAFFING_AND_TIME",mode:connectorFor("LABOR")?"READ_ONLY_EXTERNAL":"READ_WRITE_INTERNAL"},
      {domain:"KITCHEN",source:"BLUE_CURRENT",workflow:"KITCHEN_OPERATIONS",mode:"READ_WRITE_INTERNAL"},
      {domain:"POS",source:connectorFor("POS")||"UNASSIGNED",workflow:"CHECK_AND_REVENUE_CONTEXT",mode:"READ_ONLY_EXTERNAL"}
    ];
  }

  validateBindings(configuration,bindings){
    const errors=[];
    const byDomain=new Map();
    for(const b of bindings||[]){
      const domain=String(b.domain||"").toUpperCase();
      if(!this.domains().includes(domain)){errors.push(`Unknown workflow domain: ${domain||"(blank)"}`);continue;}
      if(byDomain.has(domain)) errors.push(`Duplicate workflow domain: ${domain}`);
      byDomain.set(domain,b);
      if(!b.source) errors.push(`${domain} requires a source`);
      if(!b.workflow) errors.push(`${domain} requires a workflow`);
      if(String(b.mode||"").includes("WRITE")&&String(b.source||"")!=="BLUE_CURRENT"){
        errors.push(`${domain} cannot write to an external provider during pilot`);
      }
    }
    for(const domain of this.domains()) if(!byDomain.has(domain)) errors.push(`Missing workflow binding: ${domain}`);

    const areaIds=new Set((configuration.diningAreas||[]).map(x=>x.id));
    for(const table of configuration.tables||[]){
      if(!areaIds.has(table.areaId)) errors.push(`Table ${table.id} is not bound to a configured dining area`);
    }

    const pos=byDomain.get("POS");
    if(pos?.source==="UNASSIGNED") errors.push("POS requires a declared read-only integration assignment for pilot data binding");

    return {valid:errors.length===0,errors};
  }

  async build(organizationId,input={},actor){
    const currentCert=await this.locationCertification.current(organizationId);
    if(!currentCert.current){
      const e=new Error("Current pilot location configuration certification is required before workflow binding.");
      e.statusCode=409;e.details=currentCert;throw e;
    }
    const configResult=await this.configuration.get(organizationId);
    const configuration=configResult.configuration;
    const bindings=Array.isArray(input.bindings)?input.bindings:this.defaultBindings(configuration);
    const validation=this.validateBindings(configuration,bindings);
    if(!validation.valid){
      const e=new Error(`Invalid pilot data/workflow binding: ${validation.errors.join("; ")}`);
      e.statusCode=400;e.details=validation;throw e;
    }

    const binding={
      id:`pdwb-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      version:"88.50.0",
      organizationId,
      configurationUpdatedAt:configuration.updatedAt,
      locationCertificationId:currentCert.certification.id,
      bindings,
      tableBinding:{
        diningAreas:(configuration.diningAreas||[]).map(x=>({id:x.id,name:x.name})),
        tables:(configuration.tables||[]).map(x=>({id:x.id,name:x.name,areaId:x.areaId,minCovers:x.minCovers||1,maxCovers:x.maxCovers||x.capacity||1}))
      },
      servicePeriods:(configuration.servicePeriods||[]).filter(x=>x.enabled!==false),
      roles:(configuration.roles||[]).filter(x=>x.enabled!==false),
      targets:configuration.targets||{},
      safety:{
        externalProviderWriteBack:false,
        autonomousProductionChanges:false,
        externalSourcesReadOnly:true
      },
      createdAt:this.now(),
      createdBy:actor||"admin"
    };

    await this.database.mutate(db=>{
      db.pilotDataWorkflowBindings=db.pilotDataWorkflowBindings||{};
      db.pilotDataWorkflowBindings[organizationId]=binding;
      db.pilotDataWorkflowBindingAudit=db.pilotDataWorkflowBindingAudit||[];
      db.pilotDataWorkflowBindingAudit.push({id:`pdwba-${Date.now()}`,organizationId,action:"BINDING_CREATED",at:this.now(),actor:actor||"admin",bindingId:binding.id});
      return true;
    });
    return this.current(organizationId);
  }

  async current(organizationId){
    const [db,cert,configResult]=await Promise.all([
      this.database.read(),
      this.locationCertification.current(organizationId),
      this.configuration.get(organizationId)
    ]);
    const binding=(db.pilotDataWorkflowBindings||{})[organizationId]||null;
    const current=Boolean(
      binding&&cert.current&&
      binding.locationCertificationId===cert.certification?.id&&
      binding.configurationUpdatedAt===configResult.configuration?.updatedAt
    );
    const validation=binding?this.validateBindings(configResult.configuration,binding.bindings):{valid:false,errors:["No pilot data/workflow binding exists."]};
    const ready=current&&validation.valid;
    return {
      version:"88.50.0",
      phase:"C",
      organizationId,
      status:ready?"BOUND_CURRENT":binding?"REBIND_REQUIRED":"NOT_BOUND",
      ready,
      binding,
      validation,
      gate:"PILOT_DATA_AND_WORKFLOW_BINDING",
      nextGate:ready?"PILOT_SCENARIO_AND_SERVICE_SIMULATION":"RESOLVE_BINDING_BLOCKERS",
      safety:{
        externalProviderWriteBack:false,
        autonomousProductionChanges:false
      }
    };
  }
}
module.exports=PilotDataWorkflowBindingService;
