(function(){"use strict";
class BlueCurrentPilotEvidenceEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.value=null;['pilot-launch:updated','pilot-onboarding:updated','experience-quality:updated','runtime-recovery:updated','outcome-intelligence:updated','shift-closeout:updated'].forEach(n=>eventBus.on(n,()=>this.refresh(n)));}
 refresh(reason='manual'){const s=this.appState.getState(),launch=s.pilotLaunch||{},quality=s.experienceQuality||{},runtime=s.runtimeRecovery||{},onboarding=s.pilotOnboarding||{},outcomes=s.outcomeIntelligence||{},closeout=s.shiftCloseout||{};
 const evidence=[
  {id:'launch',label:'Launch decision',ready:launch.status==='go',value:launch.status||'not evaluated'},
  {id:'quality',label:'Experience quality',ready:Number(quality.score||0)>=85,value:`${Number(quality.score||0)}%`},
  {id:'runtime',label:'Runtime resilience',ready:Number(runtime.score||0)>=85,value:`${Number(runtime.score||0)}%`},
  {id:'onboarding',label:'Pilot onboarding',ready:Number(onboarding.score||0)===100,value:`${Number(onboarding.score||0)}%`},
  {id:'outcomes',label:'Measured outcomes',ready:Number(outcomes.completedCount||outcomes.measurementCount||0)>0,value:String(Number(outcomes.completedCount||outcomes.measurementCount||0))},
  {id:'closeout',label:'Shift closeout evidence',ready:Boolean(closeout.completedAt||s.shiftCloseoutCompleted?.length),value:closeout.completedAt?'complete':`${(s.shiftCloseoutCompleted||[]).length} records`}
 ];
 const passed=evidence.filter(x=>x.ready).length,score=Math.round(passed/evidence.length*100),status=score===100?'evidence-complete':score>=67?'evidence-building':'evidence-insufficient';
 const value={capturedAt:new Date().toISOString(),reason,score,status,evidence,missing:evidence.filter(x=>!x.ready).map(x=>x.label),summary:{rpi:Number(s.restaurantPerformanceIndex||0),realizedRevenue:Number(outcomes.realizedRevenue||outcomes.totalRealizedRevenue||0),launchOwner:launch.owner||'Unassigned',launchWindow:launch.window||'Unscheduled'}};
 this.value=value;this.appState.update({pilotEvidence:value,pilotEvidenceHistory:[...(s.pilotEvidenceHistory||[]),value].slice(-30)});this.eventBus.emit('pilot-evidence:updated',structuredClone(value));return structuredClone(value)}
 snapshot(){return structuredClone(this.value||this.refresh('initial'))}
 export(){const payload={generatedAt:new Date().toISOString(),version:'V36.39.0',evidence:this.snapshot(),state:{pilotLaunch:this.appState.getState().pilotLaunch,pilotOnboarding:this.appState.getState().pilotOnboarding,outcomeIntelligence:this.appState.getState().outcomeIntelligence}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='blue-current-pilot-evidence-package.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
}
window.BlueCurrentPilotEvidenceEngine=BlueCurrentPilotEvidenceEngine;})();