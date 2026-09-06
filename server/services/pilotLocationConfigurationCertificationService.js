"use strict";

class PilotLocationConfigurationCertificationService {
  constructor(database, restaurantConfigurationService){
    this.database=database;
    this.restaurantConfigurationService=restaurantConfigurationService;
  }
  now(){ return new Date().toISOString(); }

  evaluate(configurationResult,operationalTruth={locations:[],tables:[]}){
    const c=configurationResult.configuration||{};
    const validation=configurationResult.validation||{valid:false,errors:["configuration unavailable"]};
    const enabledPeriods=(c.servicePeriods||[]).filter(x=>x.enabled!==false);
    const enabledAreas=(c.diningAreas||[]).filter(x=>x.enabled!==false);
    const enabledRoles=(c.roles||[]).filter(x=>x.enabled!==false);
    const tables=c.tables||[];
    const assignments=c.integrationAssignments||[];
    const operationalLocation=(operationalTruth.locations||[]).find(location=>
      location.id===c.location?.id && location.organizationId===configurationResult.organizationId
    );
    const operationalTables=(operationalTruth.tables||[]).filter(table=>
      table.organizationId===configurationResult.organizationId && table.locationId===c.location?.id
    );
    const operationalTablesById=new Map(operationalTables.map(table=>[table.id,table]));
    const tableMapMatchesOperationalTruth=tables.length>0 && tables.length===operationalTables.length && tables.every(table=>{
      const operational=operationalTablesById.get(table.id);
      const configuredCapacity=Number(table.maxCovers||table.capacity||0);
      return Boolean(operational) && table.name===operational.name && configuredCapacity===Number(operational.seats||0);
    });

    const checks={
      configurationPersisted:configurationResult.configured===true,
      configurationValid:validation.valid===true,
      locationIdentityComplete:Boolean(c.location?.id&&c.location?.name&&c.location?.timezone&&c.location?.currency),
      placeholderIdentityRemoved:c.location?.id!=="pilot-location"&&c.location?.name!=="Pilot Restaurant",
      restaurantConfirmationRecorded:c.pilot?.actualRestaurantDataConfirmed===true&&Boolean(c.pilot?.confirmedBy&&c.pilot?.confirmedAt&&c.pilot?.confirmationSource),
      locationMatchesOperationalTruth:Boolean(operationalLocation)&&operationalLocation.name===c.location?.name&&operationalLocation.timezone===c.location?.timezone,
      servicePeriodsReady:enabledPeriods.length>0,
      diningAreasReady:enabledAreas.length>0,
      tableMapReady:tables.length>0 && tables.every(t=>t.id&&t.name&&t.areaId),
      tableMapMatchesOperationalTruth,
      operatingRolesReady:enabledRoles.length>=3,
      turnTargetConfigured:Number(c.targets?.targetTurnMinutes)>0,
      integrationAssignmentsDeclared:assignments.length>0,
      pilotModeEnabled:c.pilot?.enabled===true&&c.pilot?.mode==="PILOT",
      providerWriteBackLockedOff:c.pilot?.writeBackEnabled===false,
      autonomousProductionChangesLockedOff:c.pilot?.autonomousProductionChanges===false
    };
    const blocking=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
    return {
      version:"88.25.0",
      phase:"C",
      gate:"PILOT_LOCATION_CONFIGURATION_CERTIFICATION",
      status:blocking.length===0?"CERTIFIABLE":"BLOCKED",
      certifiable:blocking.length===0,
      checks,
      blocking,
      counts:{
        servicePeriods:enabledPeriods.length,
        diningAreas:enabledAreas.length,
        tables:tables.length,
        roles:enabledRoles.length,
        integrationAssignments:assignments.length
      },
      nextGate:blocking.length===0?"PILOT_DATA_AND_WORKFLOW_BINDING":"RESOLVE_CONFIGURATION_BLOCKERS"
    };
  }

  async assess(organizationId){
    const configuration=await this.restaurantConfigurationService.get(organizationId);
    const database=await this.database.read();
    return {
      organizationId,
      generatedAt:this.now(),
      configurationUpdatedAt:configuration.configuration?.updatedAt||null,
      ...this.evaluate(configuration,{locations:database.locations||[],tables:database.tables||[]})
    };
  }

  async certify(organizationId,actor){
    const assessment=await this.assess(organizationId);
    if(!assessment.certifiable){
      const error=new Error(`Pilot location configuration is blocked: ${assessment.blocking.join(", ")}`);
      error.statusCode=409;
      error.details=assessment;
      throw error;
    }
    const certification={
      id:`plcc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId,
      version:"88.25.0",
      gate:assessment.gate,
      status:"CERTIFIED",
      certifiedAt:this.now(),
      certifiedBy:actor||"admin",
      configurationUpdatedAt:assessment.configurationUpdatedAt,
      checks:assessment.checks,
      counts:assessment.counts,
      providerWriteBackEnabled:false,
      autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{
      db.pilotLocationConfigurationCertifications=db.pilotLocationConfigurationCertifications||{};
      db.pilotLocationConfigurationCertifications[organizationId]=certification;
      db.pilotLocationConfigurationCertificationAudit=db.pilotLocationConfigurationCertificationAudit||[];
      db.pilotLocationConfigurationCertificationAudit.push(certification);
      return true;
    });
    return certification;
  }

  async current(organizationId){
    const db=await this.database.read();
    const certification=(db.pilotLocationConfigurationCertifications||{})[organizationId]||null;
    const assessment=await this.assess(organizationId);
    const current=Boolean(
      certification &&
      certification.status==="CERTIFIED" &&
      certification.configurationUpdatedAt===assessment.configurationUpdatedAt &&
      assessment.certifiable
    );
    return {
      version:"88.25.0",
      organizationId,
      certified:Boolean(certification),
      current,
      certification,
      assessment,
      status:current?"CERTIFIED_CURRENT":certification?"RECERTIFICATION_REQUIRED":"NOT_CERTIFIED"
    };
  }
}
module.exports=PilotLocationConfigurationCertificationService;
