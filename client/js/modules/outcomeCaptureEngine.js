(function(){"use strict";
class BlueCurrentOutcomeCaptureEngine{
 constructor({eventBus}){this.eventBus=eventBus;this.key="bluecurrent:operations-outcomes";}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return [];}}
 write(rows){localStorage.setItem(this.key,JSON.stringify(rows.slice(-100)));this.eventBus.emit("outcome-capture:updated",this.snapshot());}
 add({priorityId,title,modeledImpact,measuredImpact,note,owner}){const rows=this.read();rows.push({id:`outcome-${Date.now()}`,priorityId:String(priorityId||"manual"),title:String(title||"Operational action"),modeledImpact:Number(modeledImpact)||0,measuredImpact:Number(measuredImpact)||0,note:String(note||""),owner:String(owner||"Manager"),capturedAt:new Date().toISOString()});this.write(rows);}
 snapshot(){const rows=this.read().slice().reverse(),modeled=rows.reduce((s,x)=>s+x.modeledImpact,0),measured=rows.reduce((s,x)=>s+x.measuredImpact,0);return{rows,total:rows.length,modeled,measured,variance:measured-modeled,accuracy:modeled?Math.round((measured/modeled)*100):0};}
 remove(id){this.write(this.read().filter(x=>x.id!==id));}
}
window.BlueCurrentOutcomeCaptureEngine=BlueCurrentOutcomeCaptureEngine;})();
