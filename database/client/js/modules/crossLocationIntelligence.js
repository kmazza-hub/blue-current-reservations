(() => {
  "use strict";

  const byId=id=>document.getElementById(id);
  const fallback=[
    {id:"marina",name:"Marina Grill",city:"Belmar",health:92,revenue:18450,revenueTrend:8,occupancy:84,ticket:18,labor:24,alerts:1},
    {id:"dock",name:"The Dock Room",city:"Point Pleasant",health:71,revenue:13780,revenueTrend:-6,occupancy:91,ticket:31,labor:31,alerts:5},
    {id:"shoreline",name:"Shoreline Kitchen",city:"Asbury Park",health:79,revenue:15120,revenueTrend:2,occupancy:76,ticket:24,labor:28,alerts:3},
    {id:"harbor",name:"Harbor House",city:"Long Branch",health:88,revenue:16940,revenueTrend:5,occupancy:81,ticket:20,labor:25,alerts:1}
  ];

  const state={locations:[],selectedId:null,sort:"score",analysis:null};

  function fromDistrictCards(){
    const cards=[...document.querySelectorAll(".district-location-card")];
    return cards.map((card,index)=>{
      const text=card.textContent||"";
      const name=card.querySelector("strong")?.textContent?.trim()||`Location ${index+1}`;
      const numbers=(text.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
      return {
        id:card.dataset.locationId||`location_${index}`,
        name,
        city:card.querySelector("small")?.textContent?.trim()||"Portfolio",
        health:numbers.find(n=>n>=50&&n<=100)||80,
        revenue:numbers.find(n=>n>1000)||12000,
        revenueTrend:numbers.find(n=>n>=-20&&n<=20)||0,
        occupancy:numbers.filter(n=>n>=40&&n<=100)[1]||75,
        ticket:numbers.find(n=>n>=10&&n<=45)||22,
        labor:numbers.find(n=>n>=15&&n<=40)||27,
        alerts:numbers.find(n=>n>=0&&n<=10)||0
      };
    });
  }

  function score(l){
    return Math.max(0,Math.min(100,Math.round(
      l.health*.38 + Math.max(0,100-l.ticket*2)*.2 + Math.max(0,100-l.labor*2)*.16 +
      l.occupancy*.12 + Math.max(0,50+l.revenueTrend*3)*.14
    )));
  }

  function analyze(){
    const locations=state.locations.map(l=>({...l,score:score(l)}));
    const sorted=[...locations].sort((a,b)=>b.score-a.score);
    const best=sorted[0],worst=sorted[sorted.length-1];
    const portfolioHealth=Math.round(locations.reduce((s,l)=>s+l.health,0)/locations.length);
    const revenue=locations.reduce((s,l)=>s+l.revenue,0);
    const attention=locations.filter(l=>l.score<75||l.alerts>=3);
    const transfers=[];

    if(best&&worst&&best.id!==worst.id){
      if(best.ticket+5<worst.ticket) transfers.push({title:`Transfer ${best.name}'s kitchen pacing to ${worst.name}`,detail:`Ticket time differs by ${worst.ticket-best.ticket} minutes. Review expo cadence, station handoff, and peak prep.`});
      if(best.labor+4<worst.labor) transfers.push({title:`Apply ${best.name}'s labor model at ${worst.name}`,detail:`Labor ratio differs by ${worst.labor-best.labor} points. Compare section design and cross-training coverage.`});
      if(best.revenueTrend>worst.revenueTrend+5) transfers.push({title:`Share ${best.name}'s revenue-growth playbook`,detail:`Revenue trend is ${best.revenueTrend-worst.revenueTrend} points stronger than ${worst.name}. Review reservation mix and throughput.`});
    }
    if(!transfers.length) transfers.push({title:"Maintain portfolio operating standards",detail:"No material best-practice transfer gap is currently detected."});

    return{locations,sorted,best,worst,portfolioHealth,revenue,attention,transfers};
  }

  function tone(l){return l.score<65?"risk":l.score<78?"watch":"stable"}

  function renderRanking(){
    const root=byId("crossLocationRankingList");root.replaceChildren();
    const lowerBetter=["ticket","labor"].includes(state.sort);
    const sorted=[...state.analysis.locations].sort((a,b)=>lowerBetter?a[state.sort]-b[state.sort]:b[state.sort]-a[state.sort]);

    sorted.forEach((l,index)=>{
      const card=document.createElement("article");
      card.className="cross-location-card";
      card.dataset.tone=tone(l);
      card.classList.toggle("is-selected",l.id===state.selectedId);
      card.innerHTML="<span class='cross-location-rank'></span><div class='cross-location-copy'><strong></strong><span></span></div><div class='cross-location-score'><strong></strong><span></span></div>";
      card.querySelector(".cross-location-rank").textContent=String(index+1);
      card.querySelector(".cross-location-copy strong").textContent=l.name;
      card.querySelector(".cross-location-copy span").textContent=`${l.city} · $${l.revenue.toLocaleString()} · ${l.occupancy}% occupied`;
      card.querySelector(".cross-location-score strong").textContent=String(l.score);
      card.querySelector(".cross-location-score span").textContent=`${l.ticket}m tickets · ${l.alerts} alerts`;
      card.addEventListener("click",()=>{state.selectedId=l.id;render()});
      root.append(card);
    });
  }

  function renderInspector(){
    const l=state.analysis.locations.find(x=>x.id===state.selectedId);
    if(!l){
      byId("crossLocationOpenSource").disabled=true;
      return;
    }
    const best=state.analysis.best;
    const risk=l.ticket>=28?"Kitchen ticket time":l.labor>=30?"Labor efficiency":l.alerts>=3?"Alert pressure":l.revenueTrend<0?"Revenue trend":"No material risk";
    const match=best&&best.id!==l.id?best.name:"Portfolio standard";
    byId("crossLocationSelectedTitle").textContent=l.name;
    byId("crossLocationSelectedDetail").textContent=`${l.name} is operating at a ${l.score} composite score with ${l.health} health, ${l.occupancy}% occupancy, and a ${l.revenueTrend>=0?"+":""}${l.revenueTrend}% revenue trend.`;
    byId("crossLocationSelectedScore").textContent=String(l.score);
    byId("crossLocationSelectedTrend").textContent=`${l.revenueTrend>=0?"+":""}${l.revenueTrend}%`;
    byId("crossLocationSelectedRisk").textContent=risk;
    byId("crossLocationSelectedMatch").textContent=match;
    byId("crossLocationOpenSource").disabled=false;
  }

  function renderTransfers(){
    const root=byId("crossLocationTransferList");root.replaceChildren();
    state.analysis.transfers.forEach(item=>{
      const card=document.createElement("article");
      card.className="cross-location-transfer-item";
      card.innerHTML="<strong></strong><span></span>";
      card.querySelector("strong").textContent=item.title;
      card.querySelector("span").textContent=item.detail;
      root.append(card);
    });
    byId("crossLocationTransferLabel").textContent=`${state.analysis.transfers.length} recommendation${state.analysis.transfers.length===1?"":"s"}`;
  }

  function render(){
    state.analysis=analyze();
    if(!state.selectedId) state.selectedId=state.analysis.best?.id||null;
    const a=state.analysis;
    byId("crossLocationHealth").textContent=String(a.portfolioHealth);
    byId("crossLocationHealthLabel").textContent=a.portfolioHealth>=85?"Healthy portfolio":a.portfolioHealth>=75?"Managed pressure":"Executive attention required";
    byId("crossLocationHealthCard").dataset.tone=a.portfolioHealth>=85?"stable":a.portfolioHealth>=75?"watch":"risk";
    byId("crossLocationCount").textContent=String(a.locations.length);
    byId("crossLocationRevenue").textContent=`$${a.revenue.toLocaleString()}`;
    byId("crossLocationBest").textContent=a.best?.name||"—";
    byId("crossLocationAttention").textContent=String(a.attention.length);
    byId("crossLocationTransferCount").textContent=String(a.transfers.length);
    byId("crossLocationBriefTitle").textContent=a.attention.length?`${a.attention.length} location${a.attention.length===1?"":"s"} require regional follow-up.`:"Portfolio is operating within target.";
    byId("crossLocationBriefDetail").textContent=a.best&&a.worst?`${a.best.name} leads the portfolio at ${a.best.score}. ${a.worst.name} trails at ${a.worst.score}. The highest-value next step is: ${a.transfers[0].title}.`:"Portfolio data is limited.";
    byId("crossLocationUpdated").textContent=`Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
    renderRanking();renderInspector();renderTransfers();
  }

  function copyBrief(){
    const a=state.analysis;
    const text=[
      "Blue Current Cross-Location Executive Brief",
      `Portfolio health: ${a.portfolioHealth}`,
      `Portfolio revenue: $${a.revenue.toLocaleString()}`,
      `Best performer: ${a.best?.name||"—"} (${a.best?.score||0})`,
      `Needs attention: ${a.attention.map(l=>l.name).join(", ")||"None"}`,
      "",
      "Best-practice transfers:",
      ...a.transfers.map((x,i)=>`${i+1}. ${x.title}: ${x.detail}`)
    ].join("\n");
    navigator.clipboard?.writeText(text).then(()=>byId("crossLocationStatus").textContent="Portfolio brief copied.").catch(()=>byId("crossLocationStatus").textContent="Copy unavailable in this browser.");
  }

  function init(){
    if(!byId("crossLocationIntelligence"))return;
    const discovered=fromDistrictCards();
    state.locations=discovered.length>=2?discovered:fallback;
    byId("crossLocationSort")?.addEventListener("change",e=>{state.sort=e.target.value;renderRanking()});
    byId("crossLocationRefresh")?.addEventListener("click",render);
    byId("crossLocationCopyBrief")?.addEventListener("click",copyBrief);
    byId("crossLocationOpenSource")?.addEventListener("click",()=>byId("districtCommandCenter")?.scrollIntoView({behavior:"smooth",block:"start"}));
    render();
  }

  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();