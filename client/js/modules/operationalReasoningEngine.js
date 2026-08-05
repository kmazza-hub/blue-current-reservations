(function(){"use strict";
class BlueCurrentOperationalReasoningEngine{
 constructor(eventBus,appState){this.eventBus=eventBus;this.appState=appState;this.contextKey="bluecurrent:v414:last-context";this.dependencyKey="bluecurrent:v415:decision-dependencies";this.historyKey="bluecurrent:v416:reasoning-history";this.last=null;}
 read(key,fallback=[]){try{const value=JSON.parse(localStorage.getItem(key)||"null");return value??fallback;}catch{return fallback;}}
 write(key,value){localStorage.setItem(key,JSON.stringify(value));}
 snapshot(){return this.appState?.getState?.()||this.appState?.state||{};}
 infer(question="What requires attention right now?"){
  const s=this.snapshot(),ctx=this.read(this.contextKey,null),deps=this.read(this.dependencyKey,[]);
  const occupancy=Number(s.occupancyPercent||s.occupancy||0),wait=Number(s.guestWaitMinutes||s.averageWaitMinutes||0),kitchen=Number(s.kitchenLoad||s.kitchenPressure||0),labor=Number(s.laborPercent||s.laborPercentage||0),quality=Number(s.serviceQualityScore||0);
  const findings=[];
  if(wait>=20)findings.push({signal:"Guest wait",severity:wait>=30?"critical":"watch",value:`${wait} min`,cause:"Arrival demand is outpacing available seating or host capacity.",action:"Smooth seating pace and add host coverage before accepting more walk-ins."});
  if(kitchen>=80)findings.push({signal:"Kitchen pressure",severity:kitchen>=92?"critical":"watch",value:`${kitchen}%`,cause:"Ticket release is exceeding current production capacity.",action:"Throttle seating, rebalance stations, and protect high-age tickets."});
  if(labor>=36)findings.push({signal:"Labor",severity:labor>=42?"critical":"watch",value:`${labor}%`,cause:"Scheduled coverage is running ahead of productive demand.",action:"Delay nonessential clock-ins or redeploy labor to revenue-producing work."});
  if(occupancy>=90)findings.push({signal:"Occupancy",severity:"watch",value:`${occupancy}%`,cause:"The floor has limited recovery capacity for delays or table resets.",action:"Protect turn timing and avoid seating faster than the kitchen can absorb."});
  if(quality&&quality<82)findings.push({signal:"Service quality",severity:"watch",value:`${quality}%`,cause:"Guest experience signals are below the operating guardrail.",action:"Assign a manager recovery sweep to delayed or vulnerable tables."});
  if(!findings.length)findings.push({signal:"Operating picture",severity:"healthy",value:"Stable",cause:"No material threshold breach is visible in the current state.",action:"Maintain pacing and continue monitoring the next demand wave."});
  const weights={critical:3,watch:2,healthy:1};const primary=findings.sort((a,b)=>(weights[b.severity]||0)-(weights[a.severity]||0))[0];
  const confidence=Math.min(97,55+findings.length*6+Math.min(18,(ctx?.relationships?.length||0)*2)+Math.min(10,deps.length));
  const result={id:`RSN-${Date.now()}`,question:String(question||"").trim(),summary:`${primary.signal} is the highest-leverage issue. ${primary.action}`,primary,findings,dependencies:deps.slice(0,8),contextId:ctx?.id||null,confidence,createdAt:new Date().toISOString()};
  const history=this.read(this.historyKey,[]);history.unshift(result);this.write(this.historyKey,history.slice(0,30));this.last=result;this.eventBus?.emit?.("aip:operational-reasoning-complete",result);return result;
 }
 history(){return this.read(this.historyKey,[]);}
}
window.BlueCurrentOperationalReasoningEngine=BlueCurrentOperationalReasoningEngine;})();
