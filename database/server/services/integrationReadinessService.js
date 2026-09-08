"use strict";

class IntegrationReadinessService{
  constructor(database){this.database=database;}
  now(){return new Date().toISOString();}
  requiredCapabilities(){
    return ["IDENTITY","CONNECTIVITY","SCHEMA_CONTRACT","INCREMENTAL_SYNC","RECONCILIATION","FRESHNESS","FAILURE_ISOLATION","AUDITABILITY"];
  }
  normalize(c={}){
    const caps=c.capabilities||{};
    const required=this.requiredCapabilities();
    const capabilityStatus=Object.fromEntries(required.map(k=>[k,Boolean(caps[k])]));
    const missing=required.filter(k=>!capabilityStatus[k]);
    const freshnessMinutes=Number.isFinite(Number(c.freshnessMinutes))?Number(c.freshnessMinutes):null;
    const maxFreshnessMinutes=Number.isFinite(Number(c.maxFreshnessMinutes))?Number(c.maxFreshnessMinutes):15;
    const stale=freshnessMinutes!==null&&freshnessMinutes>maxFreshnessMinutes;
    const reconciliationVariance=Number.isFinite(Number(c.reconciliationVariance))?Math.abs(Number(c.reconciliationVariance)):null;
    const reconciled=reconciliationVariance===null?false:reconciliationVariance<=0.01;
    const healthy=missing.length===0&&!stale&&reconciled&&c.status!=="FAILED";
    return {
      connectorId:String(c.connectorId||""),
      provider:String(c.provider||"GENERIC").toUpperCase(),
      domain:String(c.domain||"UNKNOWN").toUpperCase(),
      mode:String(c.mode||"READ_ONLY").toUpperCase(),
      status:String(c.status||"UNVERIFIED").toUpperCase(),
      capabilityStatus,missingCapabilities:missing,
      freshnessMinutes,maxFreshnessMinutes,stale,
      reconciliationVariance,reconciled,healthy,
      lastSuccessfulSyncAt:c.lastSuccessfulSyncAt||null,
      lastFailureAt:c.lastFailureAt||null,
      failureReason:c.failureReason||null,
      dataAuthority:String(c.dataAuthority||"EXTERNAL_SOURCE").toUpperCase()
    };
  }
  async report(organizationId){
    const db=await this.database.read();
    const rows=(db.integrationReadinessConnectors||[]).filter(x=>x.organizationId===organizationId).map(x=>this.normalize(x));
    const blockers=[];
    for(const x of rows){
      if(x.missingCapabilities.length) blockers.push({connectorId:x.connectorId,type:"MISSING_CAPABILITIES",detail:x.missingCapabilities});
      if(x.stale) blockers.push({connectorId:x.connectorId,type:"STALE_DATA",detail:{freshnessMinutes:x.freshnessMinutes,maxFreshnessMinutes:x.maxFreshnessMinutes}});
      if(!x.reconciled) blockers.push({connectorId:x.connectorId,type:"RECONCILIATION_NOT_PROVEN",detail:{variance:x.reconciliationVariance}});
      if(x.status==="FAILED") blockers.push({connectorId:x.connectorId,type:"CONNECTOR_FAILED",detail:x.failureReason||null});
    }
    return {
      version:"86.0.0",generatedAt:this.now(),organizationId,
      summary:{
        connectors:rows.length,
        healthy:rows.filter(x=>x.healthy).length,
        stale:rows.filter(x=>x.stale).length,
        failed:rows.filter(x=>x.status==="FAILED").length,
        reconciled:rows.filter(x=>x.reconciled).length,
        blockers:blockers.length,
        pilotIntegrationReady:rows.length>0&&blockers.length===0
      },
      connectors:rows,blockers,
      providerProfiles:{
        TOAST:{status:"CONTRACT_READY_NOT_VENDOR_CERTIFIED",domains:["POS","ORDERS","MENU","PAYMENTS","LABOR_WHERE_AVAILABLE"]},
        GENERIC_POS:{status:"CONTRACT_READY",domains:["POS","ORDERS","MENU","PAYMENTS"]},
        RESERVATION_PROVIDER:{status:"CONTRACT_READY",domains:["RESERVATIONS","GUESTS"]},
        LABOR_PROVIDER:{status:"CONTRACT_READY",domains:["EMPLOYEES","SCHEDULES","TIME"]},
        INVENTORY_ACCOUNTING:{status:"CONTRACT_READY",domains:["INVENTORY","COST","ACCOUNTING"]}
      },
      policy:{
        externalSystemRemainsSourceOfRecordUntilExplicitlyChanged:true,
        connectorFailureMustNotCorruptBlueCurrent:true,
        staleDataMustBeVisible:true,
        reconciliationRequiredBeforePilotCertification:true,
        vendorCertificationMustNotBeImplied:true,
        writeBackDisabledByDefault:true,
        autonomousProductionChanges:false
      }
    };
  }
  async upsert(organizationId,input={},actor){
    const connectorId=String(input.connectorId||"").trim();
    if(!connectorId){const e=new Error("connectorId is required.");e.statusCode=400;throw e;}
    const record={...input,connectorId,organizationId,updatedAt:this.now(),updatedBy:actor||"admin"};
    record.mode=String(record.mode||"READ_ONLY").toUpperCase();
    if(record.mode!=="READ_ONLY"&&!input.explicitWriteAuthorization){
      const e=new Error("Connector write mode requires explicitWriteAuthorization.");e.statusCode=409;throw e;
    }
    await this.database.mutate(db=>{
      db.integrationReadinessConnectors=db.integrationReadinessConnectors||[];
      const i=db.integrationReadinessConnectors.findIndex(x=>x.organizationId===organizationId&&x.connectorId===connectorId);
      if(i>=0) db.integrationReadinessConnectors[i]={...db.integrationReadinessConnectors[i],...record};
      else db.integrationReadinessConnectors.push(record);
      return true;
    });
    return this.normalize(record);
  }
}
module.exports=IntegrationReadinessService;
