(function(){"use strict";
class BlueCurrentOperationalAssuranceEngine{
 constructor(){this.keys={roots:"bluecurrent:v3921:root-causes",actions:"bluecurrent:v3921:corrective-actions",standards:"bluecurrent:v3924:standard-work-links",training:"bluecurrent:v3924:training-assignments",verifications:"bluecurrent:v3924:prevention-verifications"};}
 read(key){try{return JSON.parse(localStorage.getItem(key)||"[]");}catch{return[];}}
 snapshot(){
  const roots=this.read(this.keys.roots),actions=this.read(this.keys.actions),standards=this.read(this.keys.standards),training=this.read(this.keys.training),verifications=this.read(this.keys.verifications);
  const completedActions=actions.filter(x=>x.status==="completed");
  const trained=training.filter(x=>x.status==="completed").length;
  const effective=verifications.filter(x=>x.result==="effective").length;
  const failed=verifications.filter(x=>x.result==="failed").length;
  const rootCoverage=roots.length?Math.round(new Set(standards.map(x=>x.rootCauseId)).size/roots.length*100):0;
  const actionClosure=actions.length?Math.round(completedActions.length/actions.length*100):0;
  const trainingCompletion=training.length?Math.round(trained/training.length*100):0;
  const preventionEffectiveness=verifications.length?Math.round(effective/verifications.length*100):0;
  const evidenceScore=Math.round((rootCoverage+actionClosure+trainingCompletion+preventionEffectiveness)/4);
  const blockers=[];
  if(rootCoverage<80)blockers.push("Standard-work coverage is below 80%.");
  if(actionClosure<80)blockers.push("Corrective-action closure is below 80%.");
  if(trainingCompletion<80)blockers.push("Training completion is below 80%.");
  if(failed>0)blockers.push(`${failed} prevention verification${failed===1?" requires":"s require"} follow-up.`);
  const status=evidenceScore>=90&&!blockers.length?"assured":evidenceScore>=75?"controlled":evidenceScore>=50?"developing":"insufficient evidence";
  return{roots,actions,standards,training,verifications,rootCoverage,actionClosure,trainingCompletion,preventionEffectiveness,evidenceScore,blockers,status,counts:{roots:roots.length,actions:actions.length,standards:standards.length,training:training.length,verifications:verifications.length}};
 }
}
window.BlueCurrentOperationalAssuranceEngine=BlueCurrentOperationalAssuranceEngine;})();
