(function(){"use strict";
const CONTRACTS={
 reservations:{locationId:["locationId","location_id","restaurantId"],reservationId:["reservationId","reservation_id","id"],scheduledAt:["scheduledAt","scheduled_at","reservationTime","time"],partySize:["partySize","party_size","covers"],status:["status","reservationStatus"]},
 pos:{locationId:["locationId","location_id","restaurantId"],checkId:["checkId","check_id","id"],openedAt:["openedAt","opened_at","createdAt"],netSales:["netSales","net_sales","sales","total"]},
 labor:{locationId:["locationId","location_id","restaurantId"],employeeId:["employeeId","employee_id","staffId"],clockIn:["clockIn","clock_in","startedAt"],role:["role","position","job"]},
 inventory:{locationId:["locationId","location_id","restaurantId"],itemId:["itemId","item_id","sku","id"],quantity:["quantity","qty","onHand"],unitCost:["unitCost","unit_cost","cost"]}
};
class BlueCurrentCanonicalMappingEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.off=eventBus.on("data-intake:validated",v=>{if(v?.valid)this.mapValidation(v);});}
 pick(record,aliases){for(const key of aliases||[]){if(record?.[key]!==undefined&&record[key]!==null&&record[key]!=="")return record[key];}return undefined;}
 normalize(source,record){const contract=CONTRACTS[source]||{};const mapped={};const provenance={};const missing=[];for(const [field,aliases] of Object.entries(contract)){const value=this.pick(record,aliases);if(value===undefined)missing.push(field);else{mapped[field]=value;provenance[field]=aliases.find(a=>record?.[a]!==undefined&&record[a]!==null&&record[a]!=="")||field;}}return{mapped,provenance,missing,valid:missing.length===0,raw:record};}
 mapValidation(validation){const source=validation.source;const input=Array.isArray(validation.payload)?validation.payload:[validation.payload];const results=input.map(r=>this.normalize(source,r));const accepted=results.filter(r=>r.valid).map(r=>({record:r.mapped,provenance:r.provenance}));const quarantined=results.filter(r=>!r.valid).map(r=>({missing:r.missing,raw:r.raw}));const batch={id:`map_${Date.now()}`,source,createdAt:new Date().toISOString(),sampleId:validation.id,total:results.length,accepted:accepted.length,quarantined:quarantined.length,records:accepted,quarantine:quarantined,status:quarantined.length?"review":"mapped"};this.appState.update({canonicalMapping:batch,canonicalMappingHistory:[...(this.appState.get("canonicalMappingHistory")||[]),{...batch,records:undefined,quarantine:undefined}].slice(-40)});this.eventBus.emit("canonical-mapping:completed",structuredClone(batch));return batch;}
 snapshot(){return this.appState.get("canonicalMapping")||{status:"idle",total:0,accepted:0,quarantined:0,records:[],quarantine:[],source:"—"};}
 remap(){const v=this.appState.get("dataIntakeValidation");return v?.valid?this.mapValidation(v):this.snapshot();}
 destroy(){this.off?.();}
}
window.BlueCurrentCanonicalMappingEngine=BlueCurrentCanonicalMappingEngine;})();