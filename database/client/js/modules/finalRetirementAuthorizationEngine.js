(function(global){"use strict";
class BlueCurrentFinalRetirementAuthorizationEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  state(){try{return this.appState?.getState?.()||{};}catch{return {};}}
  plans(){return Array.isArray(this.state().operatorDeletionPlans)?this.state().operatorDeletionPlans:[];}
  rehearsals(){return Array.isArray(this.state().operatorRetirementRehearsals)?this.state().operatorRetirementRehearsals:[];}
  packets(){return Array.isArray(this.state().operatorFinalRetirementPackets)?this.state().operatorFinalRetirementPackets:[];}
  findPlan(surfaceId){return this.plans().find(x=>x.surfaceId===surfaceId&&x.status==="human-authorized-plan")||null;}
  findRehearsal(surfaceId){return this.rehearsals().find(x=>x.surfaceId===surfaceId&&x.readiness?.status==="final-change-set-ready-for-human-review"&&x.validation?.passed===true&&x.safety?.authoritativeSafe===true)||null;}
  async hash(value){const str=JSON.stringify(value);if(typeof require==="function"){return require("crypto").createHash("sha256").update(str).digest("hex");}const bytes=new TextEncoder().encode(str),digest=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");}
  checkpointInstructions(surfaceId,packetId){return {
    required:true,
    commands:[
      "git status",
      "npm run check",
      `git tag -a pre-retirement-${surfaceId}-${packetId.toLowerCase()} -m "Pre-retirement checkpoint for ${surfaceId}"`,
      `git push origin pre-retirement-${surfaceId}-${packetId.toLowerCase()}`,
      "git status"
    ],
    rule:"Do not apply an authoritative retirement unless the pre-retirement tag exists remotely and the working tree is clean.",
    checkpointVerified:false
  };}
  async create(surfaceId,createdBy="Operator"){const plan=this.findPlan(surfaceId),rehearsal=this.findRehearsal(surfaceId);if(!plan)throw new Error("A human-authorized deletion plan is required.");if(!rehearsal)throw new Error("A successful disposable-copy rehearsal is required.");if(!rehearsal.rollback?.digest||!rehearsal.changeSet?.digest)throw new Error("Rollback and exact change-set digests are required.");const now=Date.now(),id=`FRAP-${now.toString(36).toUpperCase()}`,binding={surfaceId,planId:plan.id,retirementCertificationId:plan.retirementCertificationId,planAuthorizedBy:plan.humanDeletionAuthorization?.authorizedBy||null,rollbackDigest:rehearsal.rollback.digest,changeSetDigest:rehearsal.changeSet.digest,rehearsalGeneratedAt:rehearsal.generatedAt,authoritativeSourceDigest:rehearsal.safety?.authoritativeAfter?.sha256||null};const packet={id,version:"46.45.0",surfaceId,status:"awaiting-second-human-authorization",scope:"final-retirement-authorization-only",binding,bindingDigest:await this.hash(binding),createdBy,createdAt:new Date(now).toISOString(),expiresAt:new Date(now+15*60*1000).toISOString(),secondAuthorization:null,checkpoint:this.checkpointInstructions(surfaceId,id),codeDeletionAllowed:false,deletionExecuted:false,authoritativeMutation:false};const next=[packet,...this.packets().filter(x=>x.surfaceId!==surfaceId)].slice(0,100);this.appState?.update?.({operatorFinalRetirementPackets:next});this.eventBus?.emit?.("operator-final-retirement-packet:created",structuredClone(packet));return packet;}
  async revalidate(packet){if(!packet)throw new Error("Final retirement authorization packet is required.");const plan=this.findPlan(packet.surfaceId),rehearsal=this.findRehearsal(packet.surfaceId),binding=packet.binding||{},checks=[
    {id:"not-expired",pass:new Date(packet.expiresAt).getTime()>Date.now(),detail:packet.expiresAt},
    {id:"authorized-plan",pass:Boolean(plan)&&plan.id===binding.planId,detail:plan?.id||"missing"},
    {id:"retirement-certification",pass:Boolean(plan?.retirementCertificationId)&&plan.retirementCertificationId===binding.retirementCertificationId,detail:plan?.retirementCertificationId||"missing"},
    {id:"rehearsal",pass:Boolean(rehearsal)&&rehearsal.validation?.passed===true&&rehearsal.safety?.authoritativeSafe===true,detail:rehearsal?.readiness?.status||"missing"},
    {id:"rollback-digest",pass:Boolean(rehearsal?.rollback?.digest)&&rehearsal.rollback.digest===binding.rollbackDigest,detail:binding.rollbackDigest?.slice(0,12)||"missing"},
    {id:"change-set-digest",pass:Boolean(rehearsal?.changeSet?.digest)&&rehearsal.changeSet.digest===binding.changeSetDigest,detail:binding.changeSetDigest?.slice(0,12)||"missing"},
    {id:"source-digest",pass:Boolean(rehearsal?.safety?.authoritativeAfter?.sha256)&&rehearsal.safety.authoritativeAfter.sha256===binding.authoritativeSourceDigest,detail:binding.authoritativeSourceDigest?.slice(0,12)||"missing"},
    {id:"binding-digest",pass:(await this.hash(binding))===packet.bindingDigest,detail:packet.bindingDigest},
    {id:"no-delete-capability",pass:packet.codeDeletionAllowed===false&&packet.deletionExecuted===false&&packet.authoritativeMutation===false,detail:"Authorization gate only"}
  ];return {pass:checks.every(x=>x.pass),checks,version:"46.45.0"};}
  async authorize(packetId,approver,note=""){const packets=this.packets(),packet=packets.find(x=>x.id===packetId);if(!packet)throw new Error("Final retirement packet not found.");const validation=await this.revalidate(packet);if(!validation.pass)throw new Error(`Packet revalidation failed: ${validation.checks.filter(x=>!x.pass).map(x=>x.id).join(", ")}`);const name=String(approver||"").trim();if(!name)throw new Error("Second authorizer is required.");const first=String(packet.binding?.planAuthorizedBy||"").trim().toLowerCase();if(first&&name.toLowerCase()===first)throw new Error("Second authorization must come from a distinct human approver.");const authorization={authorizedBy:name,authorizedAt:new Date().toISOString(),note:String(note||"").slice(0,500),scope:"final-retirement-authorization-only",bindingDigest:packet.bindingDigest};const next=packets.map(x=>x.id===packetId?{...x,status:"final-authorization-granted-checkpoint-required",secondAuthorization:authorization,codeDeletionAllowed:false,deletionExecuted:false}:x);this.appState?.update?.({operatorFinalRetirementPackets:next});this.eventBus?.emit?.("operator-final-retirement-packet:authorized",{packetId,authorization});return next.find(x=>x.id===packetId);}
  async markCheckpoint(packetId,verifiedBy){const packets=this.packets(),packet=packets.find(x=>x.id===packetId);if(!packet)throw new Error("Final retirement packet not found.");if(!packet.secondAuthorization)throw new Error("Second human authorization is required before checkpoint verification.");const validation=await this.revalidate(packet);if(!validation.pass)throw new Error("Packet expired or evidence changed before checkpoint verification.");const checkpoint={...packet.checkpoint,checkpointVerified:true,verifiedBy:String(verifiedBy||"Operator"),verifiedAt:new Date().toISOString()};const next=packets.map(x=>x.id===packetId?{...x,status:"ready-for-separate-authoritative-retirement-decision",checkpoint,codeDeletionAllowed:false,deletionExecuted:false}:x);this.appState?.update?.({operatorFinalRetirementPackets:next});return next.find(x=>x.id===packetId);}
  async readiness(packet){const validation=await this.revalidate(packet),checks=[...validation.checks,
    {id:"second-human-authorization",pass:Boolean(packet?.secondAuthorization),detail:packet?.secondAuthorization?.authorizedBy||"missing"},
    {id:"checkpoint-instructions",pass:Array.isArray(packet?.checkpoint?.commands)&&packet.checkpoint.commands.length>=4,detail:`${packet?.checkpoint?.commands?.length||0} command(s)`},
    {id:"checkpoint-verified",pass:packet?.checkpoint?.checkpointVerified===true,detail:packet?.checkpoint?.verifiedBy||"not verified"},
    {id:"still-no-delete",pass:packet?.codeDeletionAllowed===false&&packet?.deletionExecuted===false,detail:"Separate authoritative retirement decision still required"}
  ];const score=Math.round(checks.reduce((s,x)=>s+(x.pass?100:0),0)/checks.length);return {score,status:score===100?"final-retirement-gate-ready":score>=60?"conditional":"blocked",checks,codeDeletionAllowed:false,deletionExecuted:false,version:"46.45.0"};}
  snapshot(){const packets=this.packets(),latest=packets[0]||null;return {count:packets.length,latest,policy:"second-human-auth-plus-git-checkpoint-before-separate-retirement-decision",authorizationExpiryMinutes:15,codeDeletionAllowed:false,deletionExecuted:false,version:"46.45.0"};}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentFinalRetirementAuthorizationEngine;
if(global)global.BlueCurrentFinalRetirementAuthorizationEngine=BlueCurrentFinalRetirementAuthorizationEngine;
})(typeof window!=="undefined"?window:globalThis);