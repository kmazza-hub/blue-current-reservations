"use strict";
class DataReconciliationConflictService{
 constructor(database){this.database=database;} now(){return new Date().toISOString();}
 defaultAuthority(){return {POS_TRANSACTION:"EXTERNAL_POS",PAYMENT:"EXTERNAL_POS",MENU_ITEM:"EXTERNAL_POS",RESERVATION:"RESERVATION_SOURCE",GUEST_PROFILE:"BLUE_CURRENT_WITH_PROVENANCE",EMPLOYEE:"LABOR_SOURCE",SCHEDULE:"LABOR_SOURCE",INVENTORY:"INVENTORY_SOURCE"};}
 async authority(org){const db=await this.database.read();return {...this.defaultAuthority(),...((db.reconciliationAuthorityPolicy||{})[org]||{})};}
 async setAuthority(org,input={},actor){
  const entityType=String(input.entityType||"").toUpperCase().trim(),source=String(input.authoritativeSource||"").toUpperCase().trim();
  if(!entityType||!source){const e=new Error("entityType and authoritativeSource are required.");e.statusCode=400;throw e;}
  await this.database.mutate(db=>{db.reconciliationAuthorityPolicy=db.reconciliationAuthorityPolicy||{};db.reconciliationAuthorityPolicy[org]=db.reconciliationAuthorityPolicy[org]||{};db.reconciliationAuthorityPolicy[org][entityType]=source;db.reconciliationAuthorityHistory=db.reconciliationAuthorityHistory||[];db.reconciliationAuthorityHistory.push({organizationId:org,entityType,authoritativeSource:source,changedAt:this.now(),changedBy:actor||"admin"});return true;});
  return this.authority(org);
 }
 async compare(org,input={}){
  const entityType=String(input.entityType||"").toUpperCase().trim(),entityId=String(input.entityId||"").trim(),field=String(input.field||"").trim(),obs=Array.isArray(input.observations)?input.observations:[];
  if(!entityType||!entityId||!field||obs.length<2){const e=new Error("entityType, entityId, field and at least two observations are required.");e.statusCode=400;throw e;}
  const authority=await this.authority(org),authoritativeSource=String(authority[entityType]||"HUMAN_REVIEW").toUpperCase();
  const observations=obs.map(x=>({source:String(x.source||"UNKNOWN").toUpperCase(),value:x.value,observedAt:x.observedAt||this.now(),sourceRecordId:x.sourceRecordId||null}));
  const conflict=new Set(observations.map(x=>JSON.stringify(x.value))).size>1, authoritativeObservation=observations.find(x=>x.source===authoritativeSource)||null;
  const status=!conflict?"MATCH":authoritativeObservation?"RESOLVABLE_BY_AUTHORITY":"HUMAN_REVIEW_REQUIRED";
  const row={id:`recon-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,organizationId:org,entityType,entityId,field,observations,conflict,authoritativeSource,authoritativeObservation,status,detectedAt:this.now(),resolution:null};
  await this.database.mutate(db=>{db.dataReconciliationConflicts=db.dataReconciliationConflicts||[];db.dataReconciliationConflicts.push(row);return true;});return row;
 }
 async resolve(org,input={},actor){
  const id=String(input.conflictId||"").trim();if(!id){const e=new Error("conflictId is required.");e.statusCode=400;throw e;}let result;
  await this.database.mutate(db=>{const row=(db.dataReconciliationConflicts||[]).find(x=>x.organizationId===org&&x.id===id);if(!row){const e=new Error("Reconciliation conflict not found.");e.statusCode=404;throw e;}if(row.resolution){const e=new Error("Conflict is already resolved.");e.statusCode=409;throw e;}
   const selectedSource=String(input.selectedSource||row.authoritativeSource||"").toUpperCase(),selected=row.observations.find(x=>x.source===selectedSource);if(!selected){const e=new Error("selectedSource must correspond to an observed source.");e.statusCode=400;throw e;}
   const note=String(input.note||"").trim();if(row.status==="HUMAN_REVIEW_REQUIRED"&&note.length<10){const e=new Error("Human-reviewed conflicts require a resolution note.");e.statusCode=400;throw e;}
   row.resolution={selectedSource,selectedValue:selected.value,resolvedAt:this.now(),resolvedBy:actor||"admin",note:note||null,policyAuthorityMatched:selectedSource===row.authoritativeSource};row.status="RESOLVED";result={...row};return true;});return result;
 }
 async report(org){const db=await this.database.read(),rows=(db.dataReconciliationConflicts||[]).filter(x=>x.organizationId===org);return {version:"86.50.0",generatedAt:this.now(),organizationId:org,summary:{comparisons:rows.length,matches:rows.filter(x=>!x.conflict).length,conflicts:rows.filter(x=>x.conflict).length,unresolved:rows.filter(x=>x.conflict&&!x.resolution).length,humanReviewRequired:rows.filter(x=>x.status==="HUMAN_REVIEW_REQUIRED").length,resolved:rows.filter(x=>x.status==="RESOLVED").length},authority:await this.authority(org),conflicts:rows.filter(x=>x.conflict),policy:{provenanceRequired:true,sourceAuthorityExplicit:true,disagreementNeverSilentlyOverwritten:true,humanReviewWhenAuthorityUnavailable:true,resolutionAudited:true,externalSourceOfRecordPreserved:true,writeBackDisabledByDefault:true,autonomousProductionChanges:false}};}
}
module.exports=DataReconciliationConflictService;
