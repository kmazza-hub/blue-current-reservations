(() => {
  "use strict";

  const KEYS={
    accountability:"blueCurrent.executiveAccountabilityCenter.v34.0.14.6",
    briefings:"blueCurrent.autonomousExecutiveBriefings.v34.0.14.9",
    replay:"blueCurrent.executiveReplayAnalytics.v34.0.14.2",
    history:"blueCurrent.restaurantAiBrainV341.v34.1.0"
  };
  const byId=id=>document.getElementById(id);
  let current=null;
  let sourceTarget=null;

  function read(key){try{return JSON.parse(localStorage.getItem(key))||{}}catch{return{}}}

  function evidence(){
    const acc=read(KEYS.accountability);
    const replay=read(KEYS.replay);
    const commitments=Array.isArray(acc.commitments)?acc.commitments:[];
    const sessions=Array.isArray(replay.savedSessions)?replay.savedSessions:[];
    const open=commitments.filter(x=>!["completed","verified"].includes(x.status));
    const overdue=open.filter(x=>new Date(x.dueAt||0).getTime()<Date.now());
    const dueSoon=open.filter(x=>{const d=new Date(x.dueAt||0).getTime();return d>=Date.now()&&d-Date.now()<=86400000});
    const verified=commitments.filter(x=>x.status==="verified");
    const locations=[...document.querySelectorAll("#crossLocationRankingList .cross-location-card")].map(card=>({
      name:card.querySelector(".cross-location-copy strong")?.textContent||"Location",
      score:Number(card.querySelector(".cross-location-score strong")?.textContent||0),
      detail:card.querySelector(".cross-location-copy span")?.textContent||""
    }));
    const risks=overdue.length+dueSoon.length+locations.filter(x=>x.score<75).length;
    const signals=commitments.length+sessions.length+locations.length+
      document.querySelectorAll("#executiveRootCauseList > *").length+
      document.querySelectorAll("#executiveOpportunityList > *").length;
    return{commitments,open,overdue,dueSoon,verified,sessions,locations,risks,signals};
  }

  function priority(data){
    if(data.overdue.length){
      const item=data.overdue[0];
      return{title:`Recover overdue commitment: ${item.title}`,detail:`${item.owner} missed the due date. Reassign a recovery deadline and require measurable proof before the next shift.`,owner:item.owner||"Operations Director",horizon:"Before next shift",value:0,source:"executiveAccountabilityCenter"};
    }
    const weak=data.locations.slice().sort((a,b)=>a.score-b.score)[0];
    if(weak&&weak.score<75){
      return{title:`Stabilize ${weak.name}`,detail:`The location is operating at a ${weak.score} portfolio score. Review its risk drivers and apply a best-practice transfer from the top-performing location.`,owner:"Regional Manager",horizon:"Within 24 hours",value:500,source:"crossLocationIntelligence"};
    }
    if(data.open.length){
      const item=data.open.slice().sort((a,b)=>(a.priority||3)-(b.priority||3))[0];
      return{title:item.title,detail:item.detail||"Complete the highest-priority open executive action.",owner:item.owner||"General Manager",horizon:"Next management review",value:0,source:"executiveAccountabilityCenter"};
    }
    return{title:"Scale verified operating wins",detail:"No urgent risk is visible. Select the strongest verified result and convert it into a repeatable operating standard.",owner:"Operations Director",horizon:"Next 3 shifts",value:data.verified.length*250,source:"aiOperationsCoach"};
  }

  function answer(question,data){
    const q=question.toLowerCase();
    const p=priority(data);
    let title=p.title,text=p.detail,source=p.source,reasons=[];

    if(q.includes("location")){
      const sorted=data.locations.slice().sort((a,b)=>a.score-b.score);
      const weak=sorted[0],best=sorted[sorted.length-1];
      if(weak){title=`${weak.name} needs the most attention`;text=`Its composite portfolio score is ${weak.score}. Compare its current operating pattern with ${best?.name||"the portfolio leader"} and address the largest ticket-time, labor, or alert gap first.`;source="crossLocationIntelligence";reasons=[`${weak.name}: ${weak.score} score`,`${best?.name||"Portfolio leader"}: ${best?.score||0} score`,`${data.locations.filter(x=>x.score<75).length} locations below target`]}
    } else if(q.includes("successful")||q.includes("repeat")||q.includes("best practice")){
      const win=data.verified[0];
      if(win){title=`Repeat the verified action: ${win.title}`;text=win.verifiedResult||"This commitment was completed and verified. Document the behavior, owner, and operating conditions, then repeat it across the next three shifts.";source="aiOperationsCoach";reasons=[`${data.verified.length} verified wins`,`${data.open.length} open commitments`]}
      else{title="Verification is the immediate best-practice gap";text="No action has a verified result yet. Complete one commitment with measurable proof before attempting to scale it.";source="executiveAccountabilityCenter";reasons=["0 verified wins",`${data.open.length} open commitments`]}
    } else if(q.includes("revenue")){
      const revenueText=byId("executiveIntelligenceRevenueOpportunity")?.textContent||"$0";
      title=`Protect the identified ${revenueText} opportunity`;
      text="Review open executive decisions, overdue commitments, and the lowest-performing location. Assign one owner to the highest-value recoverable opportunity and verify the result after the next shift.";
      source="executiveOperationalIntelligence";
      reasons=[`Opportunity estimate: ${revenueText}`,`${data.overdue.length} overdue commitments`,`${data.locations.filter(x=>x.score<75).length} locations below target`];
    } else {
      reasons=[`${data.overdue.length} overdue commitments`,`${data.dueSoon.length} due within 24 hours`,`${data.locations.filter(x=>x.score<75).length} locations below target`,`${data.verified.length} verified wins`];
    }

    return{title,text,source,reasons:reasons.filter(Boolean),priority:p};
  }

  function renderReasons(items){
    const root=byId("restaurantAiBrainV341ReasonList");root.replaceChildren();
    if(!items.length){const e=document.createElement("div");e.className="restaurant-ai-brain-v341-empty";e.textContent="No supporting evidence is available.";root.append(e)}
    items.forEach((text,index)=>{const item=document.createElement("article");item.className="restaurant-ai-brain-v341-reason";item.innerHTML="<strong></strong><span></span>";item.querySelector("strong").textContent=`Evidence ${index+1}`;item.querySelector("span").textContent=text;root.append(item)});
    byId("restaurantAiBrainV341ReasonCount").textContent=`${items.length} reason${items.length===1?"":"s"}`;
  }

  function renderHistory(){
    const stored=read(KEYS.history),history=Array.isArray(stored.history)?stored.history:[];
    const root=byId("restaurantAiBrainV341HistoryList");root.replaceChildren();
    if(!history.length){const e=document.createElement("div");e.className="restaurant-ai-brain-v341-empty";e.textContent="Recent AI Brain questions will appear here.";root.append(e);return}
    history.slice().reverse().slice(0,10).forEach(entry=>{const item=document.createElement("article");item.className="restaurant-ai-brain-v341-history-item";item.innerHTML="<strong></strong><span></span>";item.querySelector("strong").textContent=entry.question;item.querySelector("span").textContent=`${entry.title} · ${new Date(entry.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`;item.addEventListener("click",()=>{current=entry;sourceTarget=entry.source;renderAnswer(entry)});root.append(item)});
  }

  function renderAnswer(result){
    byId("restaurantAiBrainV341AnswerTitle").textContent=result.title;
    byId("restaurantAiBrainV341AnswerText").textContent=result.text;
    byId("restaurantAiBrainV341EvidenceCount").textContent=`${result.reasons.length} evidence point${result.reasons.length===1?"":"s"}`;
    const data=evidence();
    const confidence=Math.max(55,Math.min(97,60+data.signals*2+result.reasons.length*4));
    byId("restaurantAiBrainV341AnswerConfidence").textContent=`${confidence}% confidence`;
    renderReasons(result.reasons);
    byId("restaurantAiBrainV341OpenSource").disabled=!result.source;
  }

  function ask(){
    const question=byId("restaurantAiBrainV341Prompt").value.trim();
    if(!question){byId("restaurantAiBrainV341QueryStatus").textContent="Enter a question";return}
    const data=evidence(),result=answer(question,data);
    current={question,...result,createdAt:new Date().toISOString()};
    sourceTarget=result.source;
    renderAnswer(result);

    const stored=read(KEYS.history),history=Array.isArray(stored.history)?stored.history:[];
    history.push(current);
    localStorage.setItem(KEYS.history,JSON.stringify({history:history.slice(-50)}));
    renderHistory();
    byId("restaurantAiBrainV341QueryStatus").textContent="Answered";
  }

  function refresh(){
    const data=evidence(),p=priority(data);
    const confidence=Math.max(55,Math.min(97,58+data.signals*2+data.verified.length*3));
    byId("restaurantAiBrainV341Score").textContent=String(confidence);
    byId("restaurantAiBrainV341Label").textContent=confidence>=85?"High-confidence operating picture":confidence>=70?"Learning across systems":"More evidence required";
    byId("restaurantAiBrainV341ScoreCard").dataset.tone=confidence>=85?"stable":confidence>=70?"watch":"risk";
    byId("restaurantAiBrainV341Signals").textContent=String(data.signals);
    byId("restaurantAiBrainV341Risks").textContent=String(data.risks);
    byId("restaurantAiBrainV341Actions").textContent=String(data.open.length);
    byId("restaurantAiBrainV341Wins").textContent=String(data.verified.length);
    byId("restaurantAiBrainV341Locations").textContent=String(data.locations.length);
    byId("restaurantAiBrainV341PriorityTitle").textContent=p.title;
    byId("restaurantAiBrainV341PriorityDetail").textContent=p.detail;
    byId("restaurantAiBrainV341Owner").textContent=p.owner;
    byId("restaurantAiBrainV341Horizon").textContent=p.horizon;
    byId("restaurantAiBrainV341Value").textContent=`$${Number(p.value||0).toLocaleString()}`;
    byId("restaurantAiBrainV341Source").textContent=p.source.replace(/([A-Z])/g," $1").trim();
    sourceTarget=p.source;
    byId("restaurantAiBrainV341OpenSource").disabled=false;
    byId("restaurantAiBrainV341Updated").textContent=`Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
  }

  function copy(){
    if(!current){byId("restaurantAiBrainV341Status").textContent="Ask a question first.";return}
    const text=[current.question,current.title,current.text,"",...current.reasons.map((x,i)=>`${i+1}. ${x}`)].join("\n");
    navigator.clipboard?.writeText(text).then(()=>byId("restaurantAiBrainV341Status").textContent="AI response copied.").catch(()=>byId("restaurantAiBrainV341Status").textContent="Copy unavailable in this browser.");
  }

  function init(){
    if(!byId("restaurantAiBrainV341"))return;
    byId("restaurantAiBrainV341Ask")?.addEventListener("click",ask);
    byId("restaurantAiBrainV341Prompt")?.addEventListener("keydown",e=>{if(e.key==="Enter")ask()});
    document.querySelectorAll("[data-brain-question]").forEach(button=>button.addEventListener("click",()=>{byId("restaurantAiBrainV341Prompt").value=button.dataset.brainQuestion;ask()}));
    byId("restaurantAiBrainV341OpenSource")?.addEventListener("click",()=>byId(sourceTarget)?.scrollIntoView({behavior:"smooth",block:"start"}));
    byId("restaurantAiBrainV341Copy")?.addEventListener("click",copy);
    byId("restaurantAiBrainV341ClearHistory")?.addEventListener("click",()=>{localStorage.setItem(KEYS.history,JSON.stringify({history:[]}));renderHistory()});
    window.addEventListener("storage",e=>{if(Object.values(KEYS).includes(e.key))refresh()});
    refresh();renderHistory();
  }

  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();