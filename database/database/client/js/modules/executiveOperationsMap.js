(() => {
  "use strict";
  const INCIDENT_KEY="blueCurrent.incidentResponse.v34.0.6";
  const PLAYBOOK_KEY="blueCurrent.serviceRecovery.v34.0.7";
  const FLOOR_KEY="blueCurrent.liveFloorOperations.v35.0.3";
  const KITCHEN_KEY="blueCurrent.kitchenExpo.v35.0.8";
  const HANDOFF_KEY="blueCurrent.serverHandoff.v35.1.0";
  const byId=id=>document.getElementById(id);
  const locations=[
    {name:"Marina Grille",city:"Belmar",baseRevenue:18600},
    {name:"Asbury Boardwalk",city:"Asbury Park",baseRevenue:21400},
    {name:"Rooney's Oceanfront",city:"Long Branch",baseRevenue:23800},
    {name:"Stone House",city:"Warren",baseRevenue:17200}
  ];

  function read(key){try{return JSON.parse(localStorage.getItem(key))||{}}catch{return{}}}
  function collect(){
    const incidentState=read(INCIDENT_KEY), playbookState=read(PLAYBOOK_KEY), floorState=read(FLOOR_KEY), kitchenState=read(KITCHEN_KEY), handoffState=read(HANDOFF_KEY);
    const incidents=Array.isArray(incidentState.incidents)?incidentState.incidents:[];
    const playbooks=Array.isArray(playbookState.runs)?playbookState.runs:[];
    const tables=Array.isArray(floorState.tables)?floorState.tables:[];
    const tickets=Array.isArray(kitchenState.tickets)?kitchenState.tickets:[];
    const handoffs=Array.isArray(handoffState.handoffs)?handoffState.handoffs:[];
    const open=incidents.filter(i=>i.status==="open"), acknowledged=incidents.filter(i=>i.status==="acknowledged"), resolved=incidents.filter(i=>i.status==="resolved");
    const completed=playbooks.filter(p=>p.status==="completed");
    const attentionTables=tables.filter(t=>t.status==="attention");
    const lateTickets=tickets.filter(t=>{const start=t.firedAt||t.createdAt;if(!start||t.status==="ready")return false;return(Date.now()-new Date(start).getTime())/60000>=Number(t.target||15)});
    const lateHandoffs=handoffs.filter(h=>{if(!h.readyAt||h.status==="complete")return false;return(Date.now()-new Date(h.readyAt).getTime())/60000>=Number(h.qualityWindow||8)});
    const responseTimes=incidents.filter(i=>i.acknowledgedAt&&i.detectedAt).map(i=>Math.max(0,(new Date(i.acknowledgedAt)-new Date(i.detectedAt))/60000));
    const averageResponse=responseTimes.length?Math.round(responseTimes.reduce((s,v)=>s+v,0)/responseTimes.length):0;
    const riskExposure=open.filter(i=>i.severity==="critical").length*450+open.filter(i=>i.severity!=="critical").length*220+attentionTables.length*140+lateTickets.length*180+lateHandoffs.length*120;
    return{open,acknowledged,resolved,completed,tables,attentionTables,lateTickets,lateHandoffs,averageResponse,riskExposure};
  }
  function scoreFor(index,s){return Math.max(45,Math.min(100,96-(index===0?s.open.length*10+s.attentionTables.length*8+s.lateTickets.length*9+s.lateHandoffs.length*7:index*3)))}
  function tone(score){return score>=86?"stable":score>=70?"watch":"risk"}
  function renderLocations(s){
    const root=byId("executiveLocationGrid");root.replaceChildren();
    locations.forEach((location,index)=>{
      const score=scoreFor(index,s), incidents=index===0?s.open.length+s.acknowledged.length:Math.max(0,index-1);
      const occupancy=index===0?Math.min(100,s.tables.filter(t=>t.status==="occupied").length*9):62+index*7;
      const card=document.createElement("article");card.className="executive-location-card";card.dataset.tone=tone(score);
      card.innerHTML="<small></small><strong></strong><span></span><div class='executive-location-metrics'><div><b></b><em>Health</em></div><div><b></b><em>Occupancy</em></div><div><b></b><em>Revenue</em></div></div>";
      card.querySelector("small").textContent=location.city;card.querySelector("strong").textContent=location.name;card.querySelector("span").textContent=incidents?`${incidents} active exception${incidents===1?"":"s"}`:"No active exceptions";
      const b=card.querySelectorAll("b");b[0].textContent=String(score);b[1].textContent=`${occupancy}%`;b[2].textContent=`$${Math.max(0,location.baseRevenue-incidents*350).toLocaleString()}`;
      card.addEventListener("click",()=>{if(index===0)byId("liveFloorOperationsV2")?.scrollIntoView({behavior:"smooth",block:"start"})});
      root.append(card);
    });
  }
  function priorities(s){
    const p=[];
    const critical=s.open.find(i=>i.severity==="critical");
    if(critical)p.push({tone:"risk",label:"Immediate",title:critical.title,detail:`Estimated exposure if ignored: $450. ${critical.detail}`,target:critical.sourceTarget||"missionIncidentCenter"});
    if(s.lateTickets.length)p.push({tone:"watch",label:"Kitchen",title:"Relieve the late-ticket cluster",detail:`${s.lateTickets.length} ticket${s.lateTickets.length===1?" is":"s are"} beyond target.`,target:"kitchenExpoCommand"});
    if(s.attentionTables.length)p.push({tone:"watch",label:"Dining room",title:`Recover ${s.attentionTables[0].name||"the highest-risk table"}`,detail:"Manager touch and next-course coordination are recommended.",target:"liveFloorOperationsV2"});
    if(s.lateHandoffs.length)p.push({tone:"watch",label:"Handoff",title:"Protect ready-food quality",detail:`${s.lateHandoffs.length} ready course${s.lateHandoffs.length===1?" has":"s have"} exceeded the pickup window.`,target:"serverHandoffCenter"});
    if(!p.length)p.push({tone:"stable",label:"Stable",title:"Maintain current operating rhythm",detail:"No major exception requires executive intervention.",target:"liveShiftCommander"});
    return p.slice(0,3);
  }
  function renderPriorities(s){
    const items=priorities(s),root=byId("executiveAttentionList");root.replaceChildren();
    items.forEach(item=>{const card=document.createElement("article");card.className="executive-attention-item";card.dataset.tone=item.tone;card.innerHTML="<small></small><strong></strong><p></p><button type='button'>Open priority</button>";card.querySelector("small").textContent=item.label;card.querySelector("strong").textContent=item.title;card.querySelector("p").textContent=item.detail;card.querySelector("button").addEventListener("click",()=>byId(item.target)?.scrollIntoView({behavior:"smooth",block:"start"}));root.append(card)});
    byId("executiveAttentionCount").textContent=`${items.length} priorit${items.length===1?"y":"ies"}`;
  }
  function renderTimeline(s){
    const root=byId("executivePredictiveTimeline"),now=new Date();root.replaceChildren();
    [[0,"Current pulse",s.open.length?`${s.open.length} incident${s.open.length===1?"":"s"} open`:"Stable"],[30,"Arrival wave","Reservation pressure increases"],[60,"Kitchen peak",s.lateTickets.length?"Bottleneck risk elevated":"Expected load manageable"],[90,"Turn window","Table availability begins to recover"],[120,"Late service","Labor and closing pace review"]].forEach(([offset,title,detail])=>{const item=document.createElement("article");item.className="executive-predictive-slot";item.innerHTML="<time></time><strong></strong><span></span>";item.querySelector("time").textContent=new Date(now.getTime()+offset*60000).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});item.querySelector("strong").textContent=title;item.querySelector("span").textContent=detail;root.append(item)});
  }
  function renderKPIs(s){
    const scores=locations.map((_,i)=>scoreFor(i,s)),portfolio=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length),confidence=Math.max(65,Math.min(97,92-s.open.length*2+s.resolved.length));
    byId("executiveMapHealthScore").textContent=String(portfolio);byId("executiveMapHealthLabel").textContent=portfolio>=88?"All systems aligned":portfolio>=75?"Controlled pressure":"Executive attention required";byId("executiveMapHealth").dataset.tone=portfolio>=88?"stable":portfolio>=75?"watch":"risk";
    byId("executiveMapRevenueRisk").textContent=`$${s.riskExposure.toLocaleString()}`;byId("executiveMapLocationsRisk").textContent=String(scores.filter(v=>v<75).length);byId("executiveMapRecoveries").textContent=String(s.resolved.length+s.completed.length);byId("executiveMapResponse").textContent=`${s.averageResponse} min`;byId("executiveMapConfidence").textContent=`${confidence}%`;byId("executivePredictiveConfidence").textContent=`Confidence ${confidence}%`;
  }
  function render(){const s=collect();renderKPIs(s);renderLocations(s);renderPriorities(s);renderTimeline(s);byId("executiveMapUpdated").textContent=`Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`}
  function init(){if(!byId("executiveOperationsMap"))return;byId("executiveMapView")?.addEventListener("change",render);["bluecurrent:incident-acknowledged","bluecurrent:incident-resolved","bluecurrent:playbook-completed","bluecurrent:table-manager-flagged","bluecurrent:kitchen-ticket-updated","bluecurrent:server-ready-notified"].forEach(name=>window.addEventListener(name,render));render();setInterval(render,60000)}
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();