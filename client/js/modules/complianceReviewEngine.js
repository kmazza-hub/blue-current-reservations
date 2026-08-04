(function(){"use strict";
class BlueCurrentComplianceReviewEngine{
 constructor(){this.key="bluecurrent:v3926:compliance-review";this.controls=[
  {id:"owner",label:"Every prevention action has a named owner"},
  {id:"due",label:"Every open action has a due date"},
  {id:"standard",label:"Confirmed root causes are linked to standard work"},
  {id:"training",label:"Required training is assigned and tracked"},
  {id:"evidence",label:"Completed actions have verification evidence"}
 ];}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"{}");}catch{return{};}}
 write(v){localStorage.setItem(this.key,JSON.stringify(v));return v;}
 set(id,checked,owner,note){const state=this.read();state[id]={checked:Boolean(checked),owner:(owner||"Manager").trim(),note:(note||"").trim(),updatedAt:new Date().toISOString()};this.write(state);return state[id];}
 snapshot(){const state=this.read(),rows=this.controls.map(c=>({...c,...(state[c.id]||{checked:false,owner:"",note:"",updatedAt:null})}));const passed=rows.filter(x=>x.checked).length,score=Math.round(passed/rows.length*100);return{rows,passed,total:rows.length,score,status:score===100?"complete":score>=80?"controlled":score>=60?"watch":"incomplete"};}
}
window.BlueCurrentComplianceReviewEngine=BlueCurrentComplianceReviewEngine;})();
