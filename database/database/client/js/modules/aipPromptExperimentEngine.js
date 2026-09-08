(function(){"use strict";
class BlueCurrentAIPPromptExperimentEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4031:prompt-experiments";this.items=this.read();}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.items));}
 score(text){const value=String(text||"");let score=35;const checks=[/evidence/i,/confidence/i,/approval/i,/owner/i,/action/i,/risk/i];checks.forEach(r=>{if(r.test(value))score+=8;});score+=Math.min(12,Math.floor(value.length/45));return Math.min(100,score);}
 run({name,agent,control,variant}){const controlScore=this.score(control),variantScore=this.score(variant),winner=variantScore>controlScore?"Variant":controlScore>variantScore?"Control":"Tie";const item={id:`AIP-EXP-${Date.now()}`,name:name||"Untitled experiment",agent,control,variant,controlScore,variantScore,winner,lift:variantScore-controlScore,status:"isolated-evidence",createdAt:new Date().toISOString()};this.items.unshift(item);this.items=this.items.slice(0,75);this.save();this.eventBus?.emit?.("aip:prompt-experiment-run",item);return item;}
 clear(){this.items=[];this.save();this.eventBus?.emit?.("aip:prompt-experiments-cleared",{});}
}
window.BlueCurrentAIPPromptExperimentEngine=BlueCurrentAIPPromptExperimentEngine;})();
