"use strict";

class RestaurantConfigurationService {
  constructor(database){ this.database=database; }
  now(){ return new Date().toISOString(); }
  clean(value,max=160){ return String(value||"").trim().slice(0,max); }

  defaults(organizationId){
    return {
      version:"88.0.0",
      organizationId,
      location:{
        id:"pilot-location",
        name:"Pilot Restaurant",
        timezone:"America/New_York",
        currency:"USD",
        locale:"en-US"
      },
      servicePeriods:[
        {id:"lunch",name:"Lunch",start:"11:00",end:"16:00",enabled:true},
        {id:"dinner",name:"Dinner",start:"16:00",end:"23:00",enabled:true}
      ],
      diningAreas:[
        {id:"main-dining",name:"Main Dining Room",enabled:true}
      ],
      tables:[],
      roles:[
        {id:"manager",name:"Manager",enabled:true},
        {id:"host",name:"Host",enabled:true},
        {id:"server",name:"Server",enabled:true},
        {id:"bartender",name:"Bartender",enabled:true},
        {id:"kitchen",name:"Kitchen",enabled:true}
      ],
      targets:{
        targetTurnMinutes:90,
        targetLaborPercent:null,
        targetFoodCostPercent:null,
        targetPrimeCostPercent:null
      },
      integrationAssignments:[],
      automationPolicy:{
        mode:"RECOMMEND_ONLY",
        managerApprovalRequired:true,
        allowedInternalActions:["notify","draft-action","clear-clean-table"],
        prohibitedActions:["provider-write","financial-write","staffing-change","price-change"]
      },
      pilot:{
        enabled:true,
        mode:"PILOT",
        writeBackEnabled:false,
        autonomousProductionChanges:false,
        actualRestaurantDataConfirmed:false,
        confirmedBy:"",
        confirmedAt:null,
        confirmationSource:""
      },
      updatedAt:this.now(),
      updatedBy:"system-default"
    };
  }

  validate(input){
    const errors=[];
    const cfg=input||{};
    if(!cfg.location?.name) errors.push("location.name is required");
    if(!cfg.location?.timezone) errors.push("location.timezone is required");
    const ids=new Set();
    for(const area of cfg.diningAreas||[]){
      if(!area.id||!area.name) errors.push("Every dining area requires id and name");
      if(ids.has(`area:${area.id}`)) errors.push(`Duplicate dining area id: ${area.id}`);
      ids.add(`area:${area.id}`);
    }
    const tableIds=new Set();
    const areaIds=new Set((cfg.diningAreas||[]).map(x=>x.id));
    for(const table of cfg.tables||[]){
      if(!table.id||!table.name) errors.push("Every table requires id and name");
      if(tableIds.has(table.id)) errors.push(`Duplicate table id: ${table.id}`);
      tableIds.add(table.id);
      if(table.areaId&&!areaIds.has(table.areaId)) errors.push(`Unknown dining area for table ${table.id}`);
      const min=Number(table.minCovers||1),max=Number(table.maxCovers||table.capacity||1);
      if(min<1||max<min) errors.push(`Invalid cover range for table ${table.id}`);
    }
    const periods=new Set();
    for(const period of cfg.servicePeriods||[]){
      if(!period.id||!period.name||!period.start||!period.end) errors.push("Every service period requires id, name, start, and end");
      if(periods.has(period.id)) errors.push(`Duplicate service period id: ${period.id}`);
      periods.add(period.id);
    }
    if(cfg.pilot?.writeBackEnabled===true) errors.push("Pilot foundation cannot enable provider write-back.");
    if(cfg.pilot?.autonomousProductionChanges===true) errors.push("Autonomous production changes are prohibited.");
    if(cfg.automationPolicy?.managerApprovalRequired!==true) errors.push("Manager approval must remain required during first-location setup.");
    if(!["RECOMMEND_ONLY","MANAGER_APPROVED"].includes(cfg.automationPolicy?.mode)) errors.push("Automation mode must be RECOMMEND_ONLY or MANAGER_APPROVED.");
    if(cfg.pilot?.actualRestaurantDataConfirmed===true){
      if(!this.clean(cfg.pilot?.confirmedBy)) errors.push("pilot.confirmedBy is required when actual restaurant data is confirmed");
      if(!this.clean(cfg.pilot?.confirmationSource)) errors.push("pilot.confirmationSource is required when actual restaurant data is confirmed");
      if(!cfg.pilot?.confirmedAt || Number.isNaN(new Date(cfg.pilot.confirmedAt).getTime())) errors.push("pilot.confirmedAt must be a valid timestamp when actual restaurant data is confirmed");
    }
    return {valid:errors.length===0,errors};
  }

  async get(organizationId){
    const db=await this.database.read();
    const stored=(db.restaurantConfigurations||{})[organizationId];
    const base=this.defaults(organizationId);
    const configuration=stored?{...base,...stored,location:{...base.location,...(stored.location||{})},targets:{...base.targets,...(stored.targets||{})},pilot:{...base.pilot,...(stored.pilot||{})},automationPolicy:{...base.automationPolicy,...(stored.automationPolicy||{}),managerApprovalRequired:true}}:base;
    const validation=this.validate(configuration);
    return {
      version:"88.0.0",
      generatedAt:this.now(),
      organizationId,
      configured:Boolean(stored),
      configuration,
      validation,
      readiness:this.readiness(configuration,validation,Boolean(stored))
    };
  }

  readiness(configuration,validation=this.validate(configuration),configured=false){
    const checks={
      configurationPersisted:configured===true,
      validConfiguration:validation.valid,
      locationConfigured:Boolean(configuration.location?.name&&configuration.location?.timezone),
      servicePeriodsConfigured:(configuration.servicePeriods||[]).some(x=>x.enabled!==false),
      diningAreasConfigured:(configuration.diningAreas||[]).some(x=>x.enabled!==false),
      rolesConfigured:(configuration.roles||[]).some(x=>x.enabled!==false),
      pilotSafetyLocked:configuration.pilot?.writeBackEnabled===false&&configuration.pilot?.autonomousProductionChanges===false,
      actualRestaurantDataConfirmed:configuration.pilot?.actualRestaurantDataConfirmed===true
    };
    const blocking=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
    return {
      phase:"C",
      phaseName:"RESTAURANT_CONFIGURATION_AND_PILOT_SETUP",
      ready:blocking.length===0,
      checks,blocking,
      nextGate:"PILOT_LOCATION_CONFIGURATION_CERTIFICATION"
    };
  }

  normalize(organizationId,input,actor){
    const base=this.defaults(organizationId);
    const cfg={...base,...input};
    cfg.organizationId=organizationId;
    cfg.location={...base.location,...(input.location||{})};
    cfg.pilot={...base.pilot,...(input.pilot||{}),writeBackEnabled:false,autonomousProductionChanges:false};
    cfg.servicePeriods=Array.isArray(input.servicePeriods)?input.servicePeriods:base.servicePeriods;
    cfg.diningAreas=Array.isArray(input.diningAreas)?input.diningAreas:base.diningAreas;
    cfg.tables=Array.isArray(input.tables)?input.tables:base.tables;
    cfg.roles=Array.isArray(input.roles)?input.roles:base.roles;
    cfg.targets={...base.targets,...(input.targets||{})};
    cfg.integrationAssignments=Array.isArray(input.integrationAssignments)?input.integrationAssignments:[];
    cfg.automationPolicy={...base.automationPolicy,...(input.automationPolicy||{}),managerApprovalRequired:true};
    cfg.updatedAt=this.now();
    cfg.updatedBy=actor||"admin";
    return cfg;
  }

  async save(organizationId,input,actor){
    const configuration=this.normalize(organizationId,input||{},actor);
    const validation=this.validate(configuration);
    if(!validation.valid){
      const e=new Error(`Invalid restaurant configuration: ${validation.errors.join("; ")}`);
      e.statusCode=400; throw e;
    }
    await this.database.mutate(db=>{
      db.restaurantConfigurations=db.restaurantConfigurations||{};
      db.restaurantConfigurations[organizationId]=configuration;
      db.restaurantConfigurationAudit=db.restaurantConfigurationAudit||[];
      db.restaurantConfigurationAudit.push({
        id:`rca-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        organizationId,
        action:"CONFIGURATION_SAVED",
        actor:actor||"admin",
        at:this.now(),
        snapshot:configuration
      });
      db.locations=db.locations||[];
      const location={
        id:configuration.location.id,
        organizationId,
        name:configuration.location.name,
        timezone:configuration.location.timezone,
        currency:configuration.location.currency||"USD",
        locale:configuration.location.locale||"en-US",
        configurationManaged:true,
        updatedAt:this.now()
      };
      const existingLocation=db.locations.find(x=>x.id===location.id&&x.organizationId===organizationId);
      if(existingLocation)Object.assign(existingLocation,location);else db.locations.push(location);

      db.sections=db.sections||[];
      for(const [index,area] of (configuration.diningAreas||[]).entries()){
        const section={id:`${location.id}_${area.id}`,organizationId,locationId:location.id,name:area.name,enabled:area.enabled!==false,configurationManaged:true,sortOrder:index,updatedAt:this.now()};
        const existing=db.sections.find(x=>x.id===section.id&&x.organizationId===organizationId);
        if(existing)Object.assign(existing,section);else db.sections.push(section);
      }

      db.tables=db.tables||[];
      for(const [index,inputTable] of (configuration.tables||[]).entries()){
        const area=(configuration.diningAreas||[]).find(x=>x.id===inputTable.areaId)||(configuration.diningAreas||[])[0];
        const table={
          id:`${location.id}_${inputTable.id}`,
          organizationId,
          locationId:location.id,
          name:inputTable.name,
          seats:Number(inputTable.maxCovers||inputTable.capacity||4),
          section:area?.name||"Main Dining Room",
          sectionId:area?`${location.id}_${area.id}`:null,
          status:"available",
          shape:Number(inputTable.maxCovers||inputTable.capacity||4)>4?"rectangle":"round",
          x:Number.isFinite(Number(inputTable.x))?Number(inputTable.x):10+(index%6)*15,
          y:Number.isFinite(Number(inputTable.y))?Number(inputTable.y):12+Math.floor(index/6)*18,
          configurationManaged:true,
          updatedAt:this.now()
        };
        const existing=db.tables.find(x=>x.id===table.id&&x.organizationId===organizationId);
        if(existing)Object.assign(existing,{...table,status:existing.status||"available",guestName:existing.guestName||"",partySize:Number(existing.partySize||0),seatedAt:existing.seatedAt||null});else db.tables.push(table);
      }
      return true;
    });
    return this.get(organizationId);
  }

  async audit(organizationId){
    const db=await this.database.read();
    return {
      version:"88.0.0",
      organizationId,
      entries:(db.restaurantConfigurationAudit||[]).filter(x=>x.organizationId===organizationId)
    };
  }
}
module.exports=RestaurantConfigurationService;
