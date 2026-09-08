"use strict";

class PilotScenarioServiceSimulationService{
  constructor(database,bindingService){
    this.database=database;
    this.bindingService=bindingService;
  }
  now(){return new Date().toISOString();}
  scenarios(){return [
    {id:"reservation-arrival",name:"Reservation arrival and seating",domains:["RESERVATIONS","GUESTS","TABLES","SERVICE"]},
    {id:"walk-in-pressure",name:"Walk-in pressure and wait management",domains:["GUESTS","TABLES","SERVICE"]},
    {id:"table-turn",name:"Table turn and pacing",domains:["TABLES","SERVICE","POS"]},
    {id:"staffing-gap",name:"Staffing gap during service",domains:["TEAM","SERVICE"]},
    {id:"kitchen-delay",name:"Kitchen delay and guest recovery",domains:["KITCHEN","SERVICE","GUESTS"]},
    {id:"pos-stale",name:"Stale POS context isolation",domains:["POS","SERVICE"]},
    {id:"service-recovery",name:"Guest issue and manager recovery",domains:["GUESTS","SERVICE","TEAM"]}
  ];}

  async run(organizationId,input={},actor){
    const binding=await this.bindingService.current(organizationId);
    if(!binding.ready){
      const e=new Error("Current pilot data/workflow binding is required before service simulation.");
      e.statusCode=409;e.details=binding;throw e;
    }
    const requested=Array.isArray(input.scenarios)&&input.scenarios.length?input.scenarios:this.scenarios().map(x=>x.id);
    const catalog=new Map(this.scenarios().map(x=>[x.id,x]));
    const unknown=requested.filter(x=>!catalog.has(x));
    if(unknown.length){const e=new Error(`Unknown pilot scenarios: ${unknown.join(", ")}`);e.statusCode=400;throw e;}

    const boundDomains=new Set((binding.binding.bindings||[]).map(x=>x.domain));
    const results=requested.map(id=>{
      const scenario=catalog.get(id);
      const missing=scenario.domains.filter(d=>!boundDomains.has(d));
      const events=this.eventsFor(id,binding.binding);
      const assertions=this.assertionsFor(id,events);
      return {
        scenarioId:id,name:scenario.name,domains:scenario.domains,
        status:missing.length||assertions.some(a=>!a.pass)?"FAILED":"PASSED",
        missingDomains:missing,events,assertions
      };
    });

    const failed=results.filter(x=>x.status!=="PASSED");
    const run={
      id:`psim-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      version:"88.75.0",organizationId,
      bindingId:binding.binding.id,
      configurationUpdatedAt:binding.binding.configurationUpdatedAt,
      startedAt:this.now(),completedAt:this.now(),runBy:actor||"admin",
      mode:"SIMULATION_ONLY",
      results,
      summary:{total:results.length,passed:results.length-failed.length,failed:failed.length},
      status:failed.length?"FAILED":"PASSED",
      safety:{
        simulatedEventsOnly:true,
        externalProviderWriteBack:false,
        customerCommunication:false,
        autonomousProductionChanges:false
      }
    };
    await this.database.mutate(db=>{
      db.pilotScenarioSimulationRuns=db.pilotScenarioSimulationRuns||[];
      db.pilotScenarioSimulationRuns.push(run);
      return true;
    });
    return run;
  }

  eventsFor(id,binding){
    const table=binding.tableBinding?.tables?.[0]?.id||"table-1";
    const base={simulated:true,occurredAt:this.now()};
    const sets={
      "reservation-arrival":[
        {...base,type:"RESERVATION_ARRIVED",reservationId:"sim-r1",guestId:"sim-g1"},
        {...base,type:"TABLE_ASSIGNED",reservationId:"sim-r1",tableId:table},
        {...base,type:"GUEST_SEATED",reservationId:"sim-r1",tableId:table}
      ],
      "walk-in-pressure":[
        {...base,type:"WALK_IN_ADDED",guestId:"sim-g2",partySize:4},
        {...base,type:"WAIT_ESTIMATE_UPDATED",minutes:25},
        {...base,type:"TABLE_CANDIDATE_IDENTIFIED",tableId:table}
      ],
      "table-turn":[
        {...base,type:"CHECK_CONTEXT_OBSERVED",source:"READ_ONLY_EXTERNAL"},
        {...base,type:"TABLE_CLEARED",tableId:table},
        {...base,type:"TABLE_READY",tableId:table}
      ],
      "staffing-gap":[
        {...base,type:"STAFFING_GAP_DETECTED",role:"server"},
        {...base,type:"MANAGER_ACTION_RECOMMENDED",action:"REBALANCE_SECTION"}
      ],
      "kitchen-delay":[
        {...base,type:"KITCHEN_DELAY_DETECTED",minutes:14},
        {...base,type:"SERVICE_RECOVERY_RECOMMENDED",action:"MANAGER_TOUCH"}
      ],
      "pos-stale":[
        {...base,type:"EXTERNAL_CONTEXT_STALE",domain:"POS"},
        {...base,type:"SOURCE_ISOLATED",domain:"POS"},
        {...base,type:"INTERNAL_SERVICE_CONTINUES",domain:"SERVICE"}
      ],
      "service-recovery":[
        {...base,type:"GUEST_ISSUE_RECORDED",guestId:"sim-g3"},
        {...base,type:"MANAGER_TOUCH_RECOMMENDED"},
        {...base,type:"RECOVERY_OUTCOME_RECORDED",outcome:"SIMULATED_RESOLVED"}
      ]
    };
    return sets[id]||[];
  }

  assertionsFor(id,events){
    const has=t=>events.some(e=>e.type===t);
    const common=[{name:"allEventsSimulated",pass:events.every(e=>e.simulated===true)}];
    const specific={
      "reservation-arrival":[["arrivalCaptured","RESERVATION_ARRIVED"],["tableAssigned","TABLE_ASSIGNED"],["seated","GUEST_SEATED"]],
      "walk-in-pressure":[["walkInCaptured","WALK_IN_ADDED"],["waitUpdated","WAIT_ESTIMATE_UPDATED"]],
      "table-turn":[["externalContextReadOnly","CHECK_CONTEXT_OBSERVED"],["tableReady","TABLE_READY"]],
      "staffing-gap":[["gapDetected","STAFFING_GAP_DETECTED"],["humanActionRecommended","MANAGER_ACTION_RECOMMENDED"]],
      "kitchen-delay":[["delayDetected","KITCHEN_DELAY_DETECTED"],["recoveryRecommended","SERVICE_RECOVERY_RECOMMENDED"]],
      "pos-stale":[["staleDetected","EXTERNAL_CONTEXT_STALE"],["sourceIsolated","SOURCE_ISOLATED"],["serviceContinues","INTERNAL_SERVICE_CONTINUES"]],
      "service-recovery":[["issueCaptured","GUEST_ISSUE_RECORDED"],["managerTouch","MANAGER_TOUCH_RECOMMENDED"],["outcomeRecorded","RECOVERY_OUTCOME_RECORDED"]]
    };
    return common.concat((specific[id]||[]).map(([name,type])=>({name,pass:has(type)})));
  }

  async status(organizationId){
    const [db,binding]=await Promise.all([this.database.read(),this.bindingService.current(organizationId)]);
    const runs=(db.pilotScenarioSimulationRuns||[]).filter(x=>x.organizationId===organizationId);
    const latest=runs[runs.length-1]||null;
    const current=Boolean(latest&&binding.ready&&latest.bindingId===binding.binding?.id&&latest.status==="PASSED");
    return {
      version:"88.75.0",phase:"C",organizationId,
      gate:"PILOT_SCENARIO_AND_SERVICE_SIMULATION",
      status:current?"SIMULATION_CERTIFIED":latest?"SIMULATION_RERUN_REQUIRED":"NOT_RUN",
      current,latest,totalRuns:runs.length,
      nextGate:current?"PILOT_OBSERVATION_AND_OPERATOR_ACCEPTANCE":"RUN_ALL_REQUIRED_SCENARIOS",
      safety:{externalProviderWriteBack:false,autonomousProductionChanges:false}
    };
  }
}
module.exports=PilotScenarioServiceSimulationService;
