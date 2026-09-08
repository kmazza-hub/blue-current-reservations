(() => {
  "use strict";

  const KEYS={
    accountability:"blueCurrent.executiveAccountabilityCenter.v34.0.14.6",
    coach:"blueCurrent.aiOperationsCoach.v34.0.14.7",
    intelligence:"blueCurrent.executiveOperationalIntelligence.v34.0.14.5",
    replay:"blueCurrent.executiveReplayAnalytics.v34.0.14.2",
    history:"blueCurrent.autonomousExecutiveBriefings.v34.0.14.9"
  };

  const byId=id=>document.getElementById(id);
  let currentBrief=null;

  function read(key){
    try{return JSON.parse(localStorage.getItem(key))||{}}
    catch{return{}}
  }

  function collect(){
    const accountability=read(KEYS.accountability);
    const coach=read(KEYS.coach);
    const intelligence=read(KEYS.intelligence);
    const replay=read(KEYS.replay);

    const commitments=Array.isArray(accountability.commitments)?accountability.commitments:[];
    const history=Array.isArray(coach.history)?coach.history:[];
    const sessions=Array.isArray(replay.savedSessions)?replay.savedSessions:[];

    const open=commitments.filter(item=>!["completed","verified"].includes(item.status));
    const overdue=open.filter(item=>new Date(item.dueAt||0).getTime()<Date.now());
    const dueSoon=open.filter(item=>{
      const due=new Date(item.dueAt||0).getTime();
      return due>=Date.now()&&due-Date.now()<=24*3600000;
    });
    const verified=commitments.filter(item=>item.status==="verified");

    const locationCards=[...document.querySelectorAll("#crossLocationRankingList .cross-location-card")];
    const locations=locationCards.map(card=>({
      name:card.querySelector(".cross-location-copy strong")?.textContent||"Location",
      score:Number(card.querySelector(".cross-location-score strong")?.textContent||0),
      detail:card.querySelector(".cross-location-copy span")?.textContent||""
    }));

    const risks=[];
    overdue.slice(0,3).forEach(item=>risks.push(`${item.title} is overdue and assigned to ${item.owner}.`));
    dueSoon.slice(0,3).forEach(item=>risks.push(`${item.title} is due within 24 hours.`));
    locations.filter(l=>l.score<75).slice(0,3).forEach(l=>risks.push(`${l.name} is below target at a ${l.score} portfolio score.`));
    if(!risks.length) risks.push("No material executive risk is currently visible.");

    const actions=open
      .slice()
      .sort((a,b)=>a.priority-b.priority)
      .slice(0,4)
      .map(item=>`P${item.priority}: ${item.title} — ${item.owner}.`);
    if(!actions.length) actions.push("Maintain current operating plan and continue verification discipline.");

    const wins=verified.slice(0,4).map(item=>item.verifiedResult||`${item.title} was completed and verified.`);
    if(!wins.length) wins.push("No verified wins have been recorded yet.");

    const signalCount=commitments.length+history.length+sessions.length+locations.length;
    const confidence=Math.max(55,Math.min(97,58+signalCount*2+verified.length*3));
    const riskCount=overdue.length+dueSoon.length+locations.filter(l=>l.score<75).length;
    const readiness=Math.max(0,Math.min(100,70+verified.length*5-riskCount*8));

    return{commitments,open,overdue,dueSoon,verified,history,sessions,locations,risks,actions,wins,confidence,riskCount,readiness};
  }

  function titleFor(type){
    return {
      morning:"Morning Executive Briefing",
      pre_shift:"Pre-Shift Executive Briefing",
      post_shift:"Post-Shift Executive Recap",
      portfolio:"Portfolio Executive Briefing"
    }[type]||"Executive Briefing";
  }

  function generate(){
    const data=collect();
    const type=byId("autonomousBriefingType").value;
    const audience=byId("autonomousBriefingAudience").value;
    const cadence=byId("autonomousBriefingCadence").value;

    const best=data.locations.slice().sort((a,b)=>b.score-a.score)[0];
    const weakest=data.locations.slice().sort((a,b)=>a.score-b.score)[0];

    const summary=[
      `${data.riskCount} material risk signal${data.riskCount===1?"":"s"} and ${data.open.length} open leadership action${data.open.length===1?"":"s"} are currently visible.`,
      data.verified.length?`${data.verified.length} action${data.verified.length===1?" has":"s have"} verified results.`:"No completed action has a verified result yet.",
      best&&weakest?`${best.name} leads the portfolio at ${best.score}; ${weakest.name} is lowest at ${weakest.score}.`:"Portfolio comparison data is limited."
    ].join(" ");

    currentBrief={
      id:`brief_${Date.now()}`,
      type,
      title:titleFor(type),
      audience,
      cadence,
      summary,
      risks:data.risks,
      actions:data.actions,
      wins:data.wins,
      confidence:data.confidence,
      readiness:data.readiness,
      createdAt:new Date().toISOString()
    };

    renderCurrent();
    byId("autonomousBriefingStatus").textContent="Briefing generated.";
  }

  function renderList(rootId,items){
    const root=byId(rootId);root.replaceChildren();
    items.forEach(text=>{
      const item=document.createElement("div");
      item.className="autonomous-briefing-item";
      item.textContent=text;
      root.append(item);
    });
  }

  function renderCurrent(){
    const data=collect();

    byId("autonomousBriefingRiskCount").textContent=String(data.riskCount);
    byId("autonomousBriefingActionCount").textContent=String(data.open.length);
    byId("autonomousBriefingWinCount").textContent=String(data.verified.length);
    byId("autonomousBriefingLocationCount").textContent=String(data.locations.length);
    byId("autonomousBriefingConfidence").textContent=`${data.confidence}%`;
    byId("autonomousBriefingScore").textContent=String(data.readiness);
    byId("autonomousBriefingLabel").textContent=data.readiness>=85?"Ready for distribution":data.readiness>=65?"Review before distribution":"Leadership review required";
    byId("autonomousBriefingScoreCard").dataset.tone=data.readiness>=85?"stable":data.readiness>=65?"watch":"risk";

    if(!currentBrief){
      byId("autonomousBriefingUpdated").textContent="Generate a briefing to create the current executive communication.";
      return;
    }

    byId("autonomousBriefingTitle").textContent=currentBrief.title;
    byId("autonomousBriefingTimestamp").textContent=new Date(currentBrief.createdAt).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
    byId("autonomousBriefingSummary").textContent=currentBrief.summary;
    renderList("autonomousBriefingRiskList",currentBrief.risks);
    renderList("autonomousBriefingActionList",currentBrief.actions);
    renderList("autonomousBriefingWinList",currentBrief.wins);
    byId("autonomousBriefingUpdated").textContent=`Generated for ${currentBrief.audience} · ${currentBrief.cadence} cadence.`;
  }

  function briefingText(){
    if(!currentBrief)return"";
    return[
      currentBrief.title,
      `Audience: ${currentBrief.audience}`,
      `Confidence: ${currentBrief.confidence}%`,
      "",
      currentBrief.summary,
      "",
      "Top risks:",
      ...currentBrief.risks.map((x,i)=>`${i+1}. ${x}`),
      "",
      "Priority actions:",
      ...currentBrief.actions.map((x,i)=>`${i+1}. ${x}`),
      "",
      "Verified wins:",
      ...currentBrief.wins.map((x,i)=>`${i+1}. ${x}`)
    ].join("\n");
  }

  function copyBrief(){
    if(!currentBrief){byId("autonomousBriefingStatus").textContent="Generate a briefing first.";return}
    navigator.clipboard?.writeText(briefingText()).then(()=>byId("autonomousBriefingStatus").textContent="Briefing copied.").catch(()=>byId("autonomousBriefingStatus").textContent="Copy unavailable in this browser.");
  }

  function saveBrief(){
    if(!currentBrief){byId("autonomousBriefingStatus").textContent="Generate a briefing first.";return}
    const stored=read(KEYS.history);
    const history=Array.isArray(stored.history)?stored.history:[];
    history.push({...currentBrief});
    localStorage.setItem(KEYS.history,JSON.stringify({history:history.slice(-50)}));
    byId("autonomousBriefingStatus").textContent="Briefing saved.";
    renderHistory();
    window.dispatchEvent(new CustomEvent("bluecurrent:autonomous-briefing-saved",{detail:{briefing:currentBrief}}));
  }

  function renderHistory(){
    const stored=read(KEYS.history);
    const history=Array.isArray(stored.history)?stored.history:[];
    const root=byId("autonomousBriefingHistoryList");root.replaceChildren();

    if(!history.length){
      const empty=document.createElement("div");
      empty.className="autonomous-briefing-empty";
      empty.textContent="Saved executive briefings will appear here.";
      root.append(empty);return;
    }

    history.slice().reverse().forEach(entry=>{
      const item=document.createElement("article");
      item.className="autonomous-briefing-history-item";
      item.innerHTML="<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent=entry.title;
      item.querySelector("span").textContent=`${entry.audience} · ${entry.cadence} · ${entry.confidence}% confidence`;
      item.querySelector("time").textContent=new Date(entry.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
      item.addEventListener("click",()=>{currentBrief=entry;renderCurrent()});
      root.append(item);
    });
  }

  function init(){
    if(!byId("autonomousExecutiveBriefings"))return;
    byId("autonomousBriefingGenerate")?.addEventListener("click",generate);
    byId("autonomousBriefingCopy")?.addEventListener("click",copyBrief);
    byId("autonomousBriefingSave")?.addEventListener("click",saveBrief);
    byId("autonomousBriefingClearHistory")?.addEventListener("click",()=>{
      localStorage.setItem(KEYS.history,JSON.stringify({history:[]}));
      renderHistory();
    });

    window.addEventListener("storage",event=>{
      if(Object.values(KEYS).includes(event.key))renderCurrent();
    });

    renderCurrent();
    renderHistory();
  }

  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();