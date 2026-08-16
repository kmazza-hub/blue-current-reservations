(()=>{
"use strict";

const workspaceMap={
  guests:["host-stand","guest-intelligence","guest-journey-live"],
  service:["service-coordination","operating-current","digital-twin"],
  team:["workforce-foundation","scheduling","time-clock","workforce-intelligence"],
  kitchen:["service-coordination"],
  inventory:["inventory-intelligence"],
  performance:["profit-current","hospitality-analytics"],
  executive:["executive-command-center","portfolio-mode"],
  integrations:["mission-control"],
  system:["production-readiness","cloud-foundation"]
};

const labels={
 command:"Command",guests:"Guests",service:"Service",team:"Team",kitchen:"Kitchen",
 inventory:"Inventory",performance:"Performance",executive:"Executive",
 integrations:"Integrations",system:"System"
};

let commandState={loading:false,locationId:null,lastLoadedAt:null,currentData:null,actionsLoading:false,outcomesLoading:false,playbooksLoading:false,shiftMemoryLoading:false,authRequired:false,transportBackoffUntil:0,lastRequestAt:0};

function directSection(node){
  while(node&&node.parentElement&&node.parentElement.id!=="main")node=node.parentElement;
  return node&&node.parentElement?.id==="main"?node:null;
}

function candidateSections(name){
  const seen=new Set(),result=[];
  (workspaceMap[name]||[]).forEach(id=>{
    const el=document.getElementById(id),section=el?directSection(el):null;
    if(section&&!seen.has(section)){seen.add(section);result.push(section);}
  });
  return result;
}

function hideDeepSurfaces(){
  document.querySelectorAll("#main > section:not(.bc-os-shell)").forEach(section=>{
    section.classList.remove("bc-workspace-visible");
  });
}

function activate(name,{scroll=true}={}){
  if(!labels[name])name="command";
  hideDeepSurfaces();
  document.querySelectorAll("[data-bc-workspace]").forEach(button=>{
    button.classList.toggle("is-active",button.dataset.bcWorkspace===name);
  });

  const shell=document.getElementById("blueCurrentCommand");
  const returnBar=document.getElementById("bcWorkspaceReturn");
  const active=document.getElementById("bcActiveWorkspace");
  const sections=candidateSections(name);

  if(name==="command"){
    shell?.classList.remove("bc-shell-workspace-open");
    if(returnBar)returnBar.hidden=true;
    if(scroll)shell?.scrollIntoView({behavior:"smooth",block:"start"});
    if(authenticatedAppState())refreshCommand();
  }else{
    shell?.classList.add("bc-shell-workspace-open");
    sections.forEach(section=>section.classList.add("bc-workspace-visible"));
    if(returnBar)returnBar.hidden=false;
    if(active)active.textContent=labels[name];
    if(scroll){
      const first=sections[0]||returnBar;
      setTimeout(()=>first?.scrollIntoView({behavior:"smooth",block:"start"}),30);
    }
  }
  document.documentElement.dataset.bcWorkspace=name;
  try{sessionStorage.setItem("bluecurrent.workspace",name)}catch{}
  window.dispatchEvent(new CustomEvent("bluecurrent:workspace",{detail:{workspace:name,sections:sections.map(x=>x.id)}}));
}

const el=id=>document.getElementById(id);
const setText=(id,value)=>{const node=el(id);if(node)node.textContent=value??"—";};
const money=value=>Number.isFinite(Number(value))?new Intl.NumberFormat([],{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value)):"—";
const pct=value=>Number.isFinite(Number(value))?`${Math.round(Number(value))}%`:"—";
const minutes=value=>Number.isFinite(Number(value))?`${Math.round(Number(value))}m`:"—";

function authOverlayOpen(){
  return document.getElementById("authOverlay")?.classList.contains("open")===true;
}

function openAuthFallback(message="Sign in to continue."){
  const overlay=document.getElementById("authOverlay");
  if(overlay)overlay.classList.add("open");
  document.body.classList.add("auth-locked");
  const msg=document.getElementById("authMessage");
  if(msg){msg.textContent=message;msg.classList.add("error");}
}

function setCommandAccessState(mode,detail=""){
  const panel=el("bcCommandAccessState");
  if(!panel)return;

  const title=el("bcCommandAccessTitle");
  const copy=el("bcCommandAccessDetail");

  if(mode==="ready"){
    panel.hidden=true;
    document.body.classList.remove("bc-command-auth-required","bc-command-transport-down");
    return;
  }

  panel.hidden=false;

  if(mode==="auth"){
    document.body.classList.add("bc-command-auth-required");
    document.body.classList.remove("bc-command-transport-down");
    if(title)title.textContent="Sign in to load the operating picture.";
    if(copy)copy.textContent=detail||"Your restaurant data is protected. Sign in to continue using Command.";
    return;
  }

  document.body.classList.add("bc-command-transport-down");
  document.body.classList.remove("bc-command-auth-required");
  if(title)title.textContent="Blue Current is reconnecting.";
  if(copy)copy.textContent=detail||"The local service is temporarily unavailable. Your interface remains available while the connection recovers.";
}

async function commandFetch(url,options={}){
  if(commandState.authRequired || authOverlayOpen()){
    const error=new Error("Sign in required.");
    error.code="AUTH_REQUIRED";
    throw error;
  }
  if(Date.now()<commandState.transportBackoffUntil){
    const error=new Error("Blue Current connection is recovering.");
    error.code="TRANSPORT_BACKOFF";
    throw error;
  }

  const response=await fetch(url,{credentials:"same-origin",...options});
  if(response.status===401){
    commandState.authRequired=true;
    setCommandAccessState("auth","Your Blue Current session is missing or expired. Sign in to load protected restaurant data.");
    openAuthFallback("Your session expired. Please sign in again.");
    window.dispatchEvent(new CustomEvent("bluecurrent:auth-session-expired",{
      detail:{reason:"Command session is unauthorized.",path:url}
    }));
    const error=new Error("Your Blue Current session expired. Please sign in again.");
    error.code="AUTH_REQUIRED";
    throw error;
  }
  if(response.status===502 || response.status===503 || response.status===504){
    commandState.transportBackoffUntil=Date.now()+15000;
    setCommandAccessState("transport","Blue Current cannot currently reach the local service. The interface remains available while it reconnects.");
    const error=new Error("Blue Current is temporarily disconnected from the local service.");
    error.code="UPSTREAM_UNAVAILABLE";
    throw error;
  }
  return response;
}


function severityLabel(severity){
  return severity==="high"?"HIGH":severity==="watch"?"WATCH":severity==="guest"?"GUEST":"CLEAR";
}

function renderAttention(data){
  const priority=data?.prioritization||{};
  const items=priority.topPriorities||data?.attention||[];
  const list=el("bcAttentionList");
  if(!list)return;
  list.replaceChildren();
  setText("bcAttentionCount",String(items.length));
  setText("bcDecisionState",(priority.state||"STABLE").replaceAll("_"," "));
  const confidence=priority.confidence;
  setText("bcPriorityConfidence",confidence
    ? `${confidence.label} confidence · ${confidence.reason} ${priority.counts?.deferred?`${priority.counts.deferred} lower-priority signal(s) deferred.`:""}`
    : "Blue Current is ranking verified operating signals.");

  items.slice(0,3).forEach((item,index)=>{
    const button=document.createElement("button");
    button.type="button";
    button.dataset.bcWorkspace=item.workspace||"service";

    const badge=document.createElement("span");
    badge.className=`bc-priority ${item.severity||"normal"}`;
    badge.textContent=item.rank?`#${item.rank}`:severityLabel(item.severity);

    const copy=document.createElement("div");
    const title=document.createElement("strong");
    const detail=document.createElement("small");
    const why=document.createElement("small");
    why.className="bc-priority-why";
    title.textContent=item.title||"Operational signal";
    detail.textContent=item.detail||"";
    why.textContent=item.dimensions
      ? `Score ${item.score} · urgency ${item.dimensions.urgency} · guest ${item.dimensions.guestImpact} · service ${item.dimensions.serviceRisk} · ${item.owner||"Manager"}`
      : "";
    copy.append(title,detail,why);

    const arrow=document.createElement("b");
    arrow.textContent="→";
    button.append(badge,copy,arrow);
    button.title=item.recommendation||"Open workspace";
    button.addEventListener("click",()=>activate(button.dataset.bcWorkspace));
    list.append(button);
  });
}
function renderLocations(data){
  const select=el("bcCommandLocation");
  if(!select)return;
  const prior=commandState.locationId||select.value;
  select.replaceChildren();
  (data.locations||[]).forEach(location=>{
    const option=document.createElement("option");
    option.value=location.id;
    option.textContent=location.name;
    select.append(option);
  });
  const selected=(data.locations||[]).some(x=>x.id===prior)?prior:data.location?.id;
  if(selected)select.value=selected;
  commandState.locationId=select.value||data.location?.id||null;
}

function buildIntelligence(data){
  const priority=data.prioritization?.topPriorities?.[0]||(data.attention||[])[0];
  const mode=data.dataMode==="historical-demo"?"historical demo snapshot":"current operating state";
  if(priority&&priority.severity!=="normal"){
    setText("bcIntelligenceSummary",
      `Blue Current is reading the ${mode}. Priority #1 is ${priority.title.toLowerCase()}. ${priority.detail}`);
    setText("bcRecommendedFocus",
      priority.recommendation||`Review ${labels[priority.workspace]||"the relevant workspace"} first. Manager confirmation is required.`);
  }else{
    setText("bcIntelligenceSummary",
      `Blue Current is reading the ${mode}. No high-value operating exception currently rises above the prioritization threshold.`);
    setText("bcRecommendedFocus","Maintain service rhythm and monitor the next demand, kitchen, guest, and inventory signals.");
  }
}
function renderSourceTruth(data={}){
  const truth=data.sourceTruth||null;
  const label=el("bcSourceTruthLabel");
  if(!label)return;

  if(!truth){
    label.textContent=data.dataMode==="historical-demo"?"Historical data":"Local data";
    label.title="Provider source truth is unavailable.";
    return;
  }

  const readiness=truth.providerReadiness||null;
  const reconciliation=truth.providerReconciliation||null;
  const continuity=truth.providerContinuity||null;
  label.textContent=
    continuity?.decision==="CONTINUOUS"?"Trusted live":
    continuity?.decision==="DEGRADED"?"Provider degraded":
    continuity?.decision==="LOCAL_FALLBACK"?"Local fallback":
    reconciliation?.decision==="TRUSTED_LIVE"?"Continuity check":
    readiness?.decision==="READY"?"Reconciliation pending":
    truth.status==="LIVE_READY"?"Live sources":
    truth.status==="PARTIALLY_CONNECTED"?"Partial sources":
    "Local data";
  const continuityProvider=continuity?.providers?.find(x=>x.continuity!=="STABLE")||continuity?.providers?.find(x=>x.fallback==="TRUSTED_LIVE")||null;
  const candidate=continuityProvider||reconciliation?.bestCandidate||readiness?.bestCandidate;
  const detail=continuityProvider
    ? ` · ${candidate.provider} ${candidate.continuity.toLowerCase()}${candidate.lastEventAgeMinutes!==null?` · ${candidate.lastEventAgeMinutes}m since event`:""}${candidate.activeDrift?.length?` · ${candidate.activeDrift.length} drift signal(s)`:""}`
    : reconciliation?.bestCandidate
      ? ` · ${candidate.provider} ${candidate.confidence}% confidence${candidate.blockers?.length?` · ${candidate.blockers.length} blocker(s)`:""}`
      : candidate?` · ${candidate.provider} ${candidate.score}% readiness${candidate.blockers?.length?` · ${candidate.blockers.length} blocker(s)`:""}`:"";
  label.title=`${truth.summary?.connectedProviders||0} connected provider(s) · ${truth.summary?.liveDecisionDomains||0}/${truth.summary?.totalDomains||0} live decision domains${detail}`;
}

function renderCommand(data){
  commandState.currentData=data;
  renderLocations(data);
  const s=data.service||{},n=data.next30Minutes||{},f=data.financial||{},inv=data.inventory||{};

  setText("bcCommandContext",`${data.location?.name||"Restaurant"} · Operating Command · ${data.dataMode==="historical-demo"?"Demo snapshot":"Live state"}`);
  setText("bcCommandTruth",
    data.dataMode==="historical-demo"
      ? `Historical seed data · newest operating event is approximately ${data.dataAgeHours}h old · figures below are derived, not presented as live telemetry.`
      : `Live persisted state · updated ${new Intl.DateTimeFormat([],{hour:"numeric",minute:"2-digit",second:"2-digit"}).format(new Date(data.generatedAt))}.`);

  setText("bcCmdRevenue",f.actualsAvailable?money(f.actualRevenue):money(f.salesForecast));
  setText("bcCmdRevenueSub",f.actualsAvailable?"Actual revenue":"Sales forecast · POS actual pending");
  setText("bcCmdGuests",String(s.activeCovers??0));
  setText("bcCmdGuestsSub",`${s.activeTables??0} active table${s.activeTables===1?"":"s"}`);
  setText("bcCmdOccupancy",pct(s.occupancyPercent));
  setText("bcCmdOccupancySub",`${s.activeCovers??0} of ${data.location?.capacity??0} configured seats`);
  setText("bcCmdWait",minutes(s.averageQuotedWaitMinutes));
  setText("bcCmdWaitSub",`${s.waitlistParties??0} waiting part${s.waitlistParties===1?"y":"ies"}`);
  setText("bcCmdKitchen",minutes(s.kitchenTargetMinutes));
  setText("bcCmdKitchenSub",`${s.activeKitchenTickets??0} active ticket${s.activeKitchenTickets===1?"":"s"} · ${s.foodReadyItems??0} ready item${s.foodReadyItems===1?"":"s"}`);
  setText("bcCmdLabor",f.targetLaborPercent!==null?pct(f.targetLaborPercent):"—");
  setText("bcCmdLaborSub",f.targetLaborPercent!==null?"Target labor · actual POS labor pending":`${s.activeStaff??0} active staff`);

  setText("bcNextReservations",String(n.reservations??0));
  setText("bcNextCovers",String(n.covers??0));
  setText("bcNextTurns",n.expectedTurns===null?"Not modeled":String(n.expectedTurns??0));

  const kitchenLoad=(s.activeKitchenTickets??0)>=4?"HIGH":(s.activeKitchenTickets??0)>=2?"MODERATE":"CLEAR";
  const pressure=Math.min(100,(s.activeKitchenTickets??0)*18+(s.foodReadyItems??0)*8);
  setText("bcKitchenPressure",kitchenLoad);
  const bar=el("bcKitchenPressureBar");if(bar)bar.style.width=`${pressure}%`;

  setText("bcSalesForecast",money(f.salesForecast));
  setText("bcLaborBudget",money(f.laborBudget));
  setText("bcLowStock",String(inv.lowStockItems??0));

  renderAttention(data);
  buildIntelligence(data);
  loadManagerActions();
  loadOutcomeLearning();
  loadPlaybooks();
  loadShiftMemory();

  const rail=document.querySelector(".bc-os-rail-foot small");
  if(rail)rail.textContent=`V83.25.1 · ${data.dataMode==="historical-demo"?"Demo data":"Live data"}`;
  commandState.lastLoadedAt=Date.now();
}


function actionStatusLabel(status){
  return ({acknowledged:"Acknowledged",assigned:"Assigned",in_progress:"In progress",resolved:"Resolved",dismissed:"Dismissed"})[status]||status||"Open";
}

function renderManagerActions(summary={}){
  const list=el("bcManagerActionList");
  if(!list)return;
  const open=summary.openActions||[];
  setText("bcOpenActionCount",`${summary.counts?.open||0} open manager action${summary.counts?.open===1?"":"s"}`);
  list.replaceChildren();
  if(!open.length){
    const p=document.createElement("p");p.textContent="No acknowledged Command actions yet.";list.append(p);return;
  }
  open.slice(0,5).forEach(item=>{
    const row=document.createElement("article");row.className="bc-manager-action";
    const copy=document.createElement("div");
    const title=document.createElement("strong");title.textContent=item.title;
    const meta=document.createElement("small");meta.textContent=`${actionStatusLabel(item.status)} · ${item.owner||"Manager"}`;
    copy.append(title,meta);
    const controls=document.createElement("div");
    if(item.status!=="in_progress"){
      const start=document.createElement("button");start.type="button";start.textContent="Start";start.addEventListener("click",()=>updateManagerAction(item.id,{action:"start"}));controls.append(start);
    }
    const resolve=document.createElement("button");resolve.type="button";resolve.textContent="Resolve";resolve.addEventListener("click",()=>updateManagerAction(item.id,{action:"resolve",outcome:"Resolved from Command by manager."}));controls.append(resolve);
    row.append(copy,controls);list.append(row);
  });
}

async function loadManagerActions(){
  if(commandState.actionsLoading)return;
  commandState.actionsLoading=true;
  try{
    const query=commandState.locationId?`?locationId=${encodeURIComponent(commandState.locationId)}`:"";
    const response=await commandFetch(`/api/command/actions${query}`,{method:"GET",headers:{"Accept":"application/json"}});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||`Command actions returned ${response.status}.`);
    renderManagerActions(payload);
  }catch(error){setText("bcActionFeedback",`Action queue unavailable · ${error.message}`);}finally{commandState.actionsLoading=false;}
}

async function acknowledgeTopPriority(){
  const top=commandState.currentData?.prioritization?.topPriorities?.[0];
  if(!top||!commandState.locationId){setText("bcActionFeedback","No active ranked priority is available to acknowledge.");return;}
  setText("bcActionFeedback","Acknowledging priority…");
  try{
    const response=await commandFetch("/api/command/actions",{
      method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","Accept":"application/json","X-Blue-Current-Idempotency-Key":`command-${commandState.locationId}-${top.id}-${Date.now()}`},
      body:JSON.stringify({locationId:commandState.locationId,priorityId:top.id,owner:top.owner,note:"Acknowledged from Blue Current Command."})
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||`Acknowledge returned ${response.status}.`);
    setText("bcActionFeedback",payload.action?.duplicate?"This priority already has an open manager action.":"Priority acknowledged and added to the manager action queue.");
    await loadManagerActions();
  }catch(error){setText("bcActionFeedback",`Unable to acknowledge · ${error.message}`);}
}

async function updateManagerAction(actionId,body){
  setText("bcActionFeedback","Updating manager action…");
  try{
    const response=await commandFetch(`/api/command/actions/${encodeURIComponent(actionId)}`,{
      method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json","Accept":"application/json","X-Blue-Current-Idempotency-Key":`command-action-${actionId}-${body.action}-${Date.now()}`},body:JSON.stringify(body)
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||`Action update returned ${response.status}.`);
    setText("bcActionFeedback",`${payload.action?.title||"Manager action"} · ${actionStatusLabel(payload.action?.status)}.`);
    await loadManagerActions();
  }catch(error){setText("bcActionFeedback",`Unable to update action · ${error.message}`);}
}


function renderOutcomeLearning(summary={}){
  const root=el("bcOutcomeSummary");
  if(!root)return;
  const c=summary.counts||{};
  setText("bcOutcomeCount",`${c.total||0} verified outcome${c.total===1?"":"s"}`);
  root.replaceChildren();

  if(!summary.recent?.length){
    const p=document.createElement("p");
    p.textContent="Resolved actions will be compared against the current operating state.";
    root.append(p);
    return;
  }

  const totals=document.createElement("div");
  totals.className="bc-outcome-totals";
  [
    ["Improved",c.improved||0],
    ["Unchanged",c.unchanged||0],
    ["Worsened",c.worsened||0],
    ["Unverified",c.unverified||0]
  ].forEach(([label,value])=>{
    const item=document.createElement("span");
    const strong=document.createElement("strong");strong.textContent=String(value);
    const small=document.createElement("small");small.textContent=label;
    item.append(strong,small);totals.append(item);
  });
  root.append(totals);

  summary.recent.slice(0,3).forEach(item=>{
    const row=document.createElement("article");
    row.className=`bc-outcome-row ${String(item.verificationStatus||"").toLowerCase()}`;
    const title=document.createElement("strong");
    title.textContent=item.title||"Resolved action";
    const meta=document.createElement("small");
    const delta=item.delta===null||item.delta===undefined?"":` · Δ ${item.delta}`;
    meta.textContent=`${item.verificationStatus||"UNVERIFIED"} · ${item.metricName||"metric"}${delta}`;
    row.append(title,meta);
    root.append(row);
  });
}

async function loadOutcomeLearning(){
  if(commandState.outcomesLoading)return;
  commandState.outcomesLoading=true;
  try{
    const query=commandState.locationId?`?locationId=${encodeURIComponent(commandState.locationId)}`:"";
    const response=await commandFetch(`/api/command/outcomes${query}`,{
      method:"GET",headers:{"Accept":"application/json"}
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||`Command outcomes returned ${response.status}.`);
    renderOutcomeLearning(payload);
  }catch(error){
    const root=el("bcOutcomeSummary");
    if(root)root.textContent=`Outcome learning unavailable · ${error.message}`;
  }finally{
    commandState.outcomesLoading=false;
  }
}



function renderShiftMemory(memory={}){
  const title=el("bcShiftMemoryTitle");
  const meta=el("bcShiftMemoryMeta");
  if(!title||!meta)return;

  const match=memory.match;
  const playbook=memory.playbook;
  const evidence=memory.contextualEvidence||{};
  const phase=memory.currentContext?.servicePhase||"current service";

  if(!memory.currentPriority){
    title.textContent="No active ranked priority to match.";
    meta.textContent=`Shift context: ${phase.replaceAll("-"," ")} · Blue Current will wait for a verified priority.`;
    return;
  }
  if(!playbook){
    title.textContent="No historical playbook is strong enough to apply here.";
    meta.textContent=`${memory.currentPriority.title} · ${phase.replaceAll("-"," ")} · manager judgment remains primary.`;
    return;
  }
  if(!match){
    title.textContent=playbook.recommendation||"Historical playbook available.";
    meta.textContent=`${playbook.guidanceStatus.replaceAll("_"," ")} · no sufficiently comparable shift context has been recorded yet.`;
    return;
  }

  title.textContent=playbook.recommendation||"Relevant historical intervention";
  const improved=evidence.improvedRate===null||evidence.improvedRate===undefined
    ? "outcome rate unavailable"
    : `${evidence.improvedRate}% improved`;
  meta.textContent=`${match.similarityScore}% context match · ${evidence.comparableOutcomes||0} comparable verified outcome${evidence.comparableOutcomes===1?"":"s"} · ${improved} · ${memory.guidance.replaceAll("_"," ")}.`;
}

async function loadShiftMemory(){
  if(commandState.shiftMemoryLoading)return;
  commandState.shiftMemoryLoading=true;
  try{
    const query=commandState.locationId?`?locationId=${encodeURIComponent(commandState.locationId)}`:"";
    const response=await commandFetch(`/api/command/contextual-playbook${query}`,{
      method:"GET",headers:{"Accept":"application/json"}
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||`Contextual playbook returned ${response.status}.`);
    renderShiftMemory(payload);
  }catch(error){
    const title=el("bcShiftMemoryTitle"),meta=el("bcShiftMemoryMeta");
    if(title)title.textContent="Shift memory unavailable.";
    if(meta)meta.textContent=error.message;
  }finally{
    commandState.shiftMemoryLoading=false;
  }
}

function renderPlaybooks(summary={}){
  const root=el("bcPlaybookSummary");
  if(!root)return;
  const items=summary.playbooks||[];
  const c=summary.counts||{};
  setText("bcPlaybookCount",items.length
    ? `${c.evidenceBacked||0} evidence-backed · ${c.promising||0} promising`
    : "No evidence yet");
  root.replaceChildren();

  if(!items.length){
    const p=document.createElement("p");
    p.textContent="No repeated verified intervention pattern exists yet. Blue Current will not invent a playbook from insufficient evidence.";
    root.append(p);
    return;
  }

  items.slice(0,3).forEach(item=>{
    const row=document.createElement("article");
    row.className="bc-playbook-row";

    const head=document.createElement("div");
    const title=document.createElement("strong");
    title.textContent=item.recommendation||`${item.domain} intervention`;
    const badge=document.createElement("span");
    badge.textContent=item.guidanceStatus.replaceAll("_"," ");
    head.append(title,badge);

    const evidence=document.createElement("small");
    evidence.textContent=`${item.sampleSize} observed outcome${item.sampleSize===1?"":"s"} · ${item.improvedRate}% improved · ${item.confidence.label} confidence`;

    const caution=document.createElement("small");
    caution.className="bc-playbook-caution";
    caution.textContent="Observed association only · manager review required.";

    row.append(head,evidence,caution);
    root.append(row);
  });
}

async function loadPlaybooks(){
  if(commandState.playbooksLoading)return;
  commandState.playbooksLoading=true;
  try{
    const query=commandState.locationId?`?locationId=${encodeURIComponent(commandState.locationId)}`:"";
    const response=await commandFetch(`/api/command/playbooks${query}`,{
      method:"GET",headers:{"Accept":"application/json"}
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||`Command playbooks returned ${response.status}.`);
    renderPlaybooks(payload);
  }catch(error){
    const root=el("bcPlaybookSummary");
    if(root)root.textContent=`Playbook intelligence unavailable · ${error.message}`;
  }finally{
    commandState.playbooksLoading=false;
  }
}

function renderCommandError(error){
  if(error?.code==="AUTH_REQUIRED"){
    setCommandAccessState("auth",error.message);
  }else if(error?.code==="UPSTREAM_UNAVAILABLE"||error?.code==="TRANSPORT_BACKOFF"){
    setCommandAccessState("transport",error.message);
  }
  setText("bcCommandTruth",`Operating picture unavailable · ${error?.message||"Unable to load Blue Current data."}`);
  renderAttention([{severity:"high",workspace:"system",title:"Operating picture unavailable",detail:"Sign in or verify API health and location access."}]);
}

async function refreshCommand({force=false}={}){
  const clock=el("bcCommandClock");
  if(clock)clock.textContent=new Intl.DateTimeFormat([],{hour:"numeric",minute:"2-digit"}).format(new Date());

  if(!authenticatedAppState()){
    commandState.authRequired=true;
    setCommandAccessState("auth","Sign in to load protected restaurant data.");
    return;
  }

  const now=Date.now();
  if(commandState.loading)return;
  if(!force && commandState.lastRequestAt && now-commandState.lastRequestAt<1200)return;
  commandState.lastRequestAt=now;
  commandState.loading=true;
  try{
    const query=commandState.locationId?`?locationId=${encodeURIComponent(commandState.locationId)}`:"";
    const response=await commandFetch(`/api/command/operating-picture${query}`,{
      method:"GET",headers:{"Accept":"application/json"}
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||`Operating picture returned ${response.status}.`);
    commandState.authRequired=false;
    setCommandAccessState("ready");
    renderCommand(payload);
  }catch(error){
    renderCommandError(error);
  }finally{
    commandState.loading=false;
  }
}

function authenticatedAppState(){
  try{return Boolean(window.appState?.get?.("authenticatedUser"));}catch{return false;}
}

function startCommandAfterAuth(){
  const start=()=>{
    commandState.authRequired=false;
    commandState.transportBackoffUntil=0;
    setCommandAccessState("ready");
    refreshCommand({force:true});
  };

  const requireAuth=(reason="Sign in to load Blue Current Command.")=>{
    commandState.authRequired=true;
    setCommandAccessState("auth",reason);
  };

  if(authenticatedAppState()){
    start();
    return;
  }

  const bus=window.eventBus;
  if(bus?.on){
    bus.on("auth:restored",start);
    bus.on("auth:signed-in",start);
    bus.on("auth:organization-switched",()=>{
      commandState.locationId=null;
      commandState.lastRequestAt=0;
      start();
    });
    bus.on("auth:required",payload=>requireAuth(
      payload?.reason==="anonymous"
        ? "Sign in to load protected restaurant data."
        : "Your Blue Current session needs to be restored."
    ));
    bus.on("auth:signed-out",()=>requireAuth("You are signed out. Sign in to load protected restaurant data."));
  }

  // Auth restoration is asynchronous. Do not race it with a protected Command GET.
  window.setTimeout(()=>{
    if(authenticatedAppState()){
      start();
    }else if(!commandState.lastLoadedAt){
      requireAuth("Blue Current is waiting for an authenticated session before loading restaurant data.");
    }
  },1800);
}

function init(){
  document.body.classList.add("bc-hospitality-os","bc-consolidated-product-surface");
  const advanced=new URLSearchParams(window.location.search).get("advanced")==="1";
  if(advanced)document.body.classList.add("bc-show-advanced");
  window.addEventListener("bluecurrent:auth-session-expired",()=>{commandState.authRequired=true;});
  document.addEventListener("click",event=>{
    if(event.target?.closest?.("#authLoginForm button[type='submit']")){
      setCommandAccessState("auth","Signing in… Blue Current will load Command after authentication completes.");
    }
  });
  document.querySelectorAll("[data-bc-workspace]").forEach(button=>{
    button.addEventListener("click",()=>activate(button.dataset.bcWorkspace));
  });
  el("bcCommandSignIn")?.addEventListener("click",()=>{
    openAuthFallback("Sign in to load Blue Current Command.");
  });
  el("bcAcknowledgeTop")?.addEventListener("click",acknowledgeTopPriority);
  el("bcCommandLocation")?.addEventListener("change",event=>{
    commandState.locationId=event.target.value;
    refreshCommand();
  });
  hideDeepSurfaces();
  const commandShell=document.getElementById("blueCurrentCommand");
  if(commandShell && !window.location.hash){
    window.scrollTo({top:0,left:0,behavior:"auto"});
    commandShell.scrollIntoView({block:"start",behavior:"auto"});
  }
  startCommandAfterAuth();
  setInterval(()=>{
    if(!commandState.authRequired && authenticatedAppState())refreshCommand();
  },30000);
  activate("command",{scroll:false});
}

document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();