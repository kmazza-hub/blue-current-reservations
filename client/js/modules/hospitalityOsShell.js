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


const shiftBridgeState={mode:"start",actionSummary:null};

function renderShiftBridge(){
  const data=commandState.currentData||{},priority=data.prioritization||{},items=priority.topPriorities||data.attention||[];
  const actions=shiftBridgeState.actionSummary||{},open=actions.openActions||[],mode=shiftBridgeState.mode;
  const bridge=el("bcShiftBridge");if(bridge)bridge.dataset.mode=mode;
  const start=el("bcShiftStartView"),handoff=el("bcShiftHandoffView");
  if(start)start.setAttribute("aria-pressed",mode==="start"?"true":"false");
  if(handoff)handoff.setAttribute("aria-pressed",mode==="handoff"?"true":"false");
  const top=items[0];
  const decision=(priority.state||"STABLE").replaceAll("_"," ");
  setText("bcShiftBridgeTitle",mode==="start"?"Take control of the shift":"Prepare the next manager");
  setText("bcShiftStatus",decision);
  setText("bcShiftStatusDetail",mode==="start"?"Current verified operating state.":"State the next manager inherits.");
  setText("bcShiftFirstPriority",top?.title||"No urgent verified priority");
  setText("bcShiftFirstPriorityDetail",top?.detail||top?.description||"Continue normal service monitoring.");
  setText("bcShiftOpenOwnership",`${actions.counts?.open||open.length||0} open action${(actions.counts?.open||open.length)===1?"":"s"}`);
  setText("bcShiftOwnerDetail",open.length?`${open[0].owner||"Manager"} · ${open[0].title}`:"No unresolved manager ownership.");
  if(mode==="start"){
    setText("bcShiftBriefTitle","Before service");
    setText("bcShiftBriefCopy",top?`Review ${top.title.toLowerCase()}, then take ownership of any unresolved actions before the next demand wave.`:"Operating picture is stable. Confirm readiness and unresolved ownership before service builds.");
  }else{
    setText("bcShiftBriefTitle","Handoff");
    const ownership=open.length?`${open.length} unresolved action${open.length===1?"":"s"} remain. First: ${open[0].title}.`:"No unresolved manager actions are currently recorded.";
    setText("bcShiftBriefCopy",`${decision} operating state. ${top?`Top live priority: ${top.title}. `:""}${ownership}`);
  }
}
function setShiftBridgeMode(mode){
  shiftBridgeState.mode=mode==="handoff"?"handoff":"start";
  renderShiftBridge();
}


function renderPostShiftReview(review){
  const root=el("bcPostShiftReview");if(!root)return;root.hidden=!review;if(!review)return;
  setText("bcPostShiftOutcome",String(review.outcome||"CLOSED").replaceAll("_"," "));
  setText("bcPostShiftIncidents",String(review.incidentCount||0));setText("bcPostShiftRecovered",String(review.resolvedIncidentCount||0));
  setText("bcPostShiftClosedAt",review.closedAt?`Closed ${new Date(review.closedAt).toLocaleString()}`:"Closed session");
  setText("bcPostShiftSummary",review.operatorSummary||"Session closed with captured evidence.");
  setText("bcPostShiftLearning",review.lessonsLearned?`Carry forward · ${review.lessonsLearned}`:(review.followUp?`Follow-up · ${review.followUp}`:"No additional learning note recorded."));
  const list=el("bcRecoveryEvidenceList");if(!list)return;list.replaceChildren();
  (review.recoveryEvidence||[]).forEach(item=>{
    const row=document.createElement("div");row.className="bc-recovery-evidence-row";
    const sev=document.createElement("span"),copy=document.createElement("strong"),meta=document.createElement("small");
    sev.textContent=item.severity||"INFO";copy.textContent=item.title||"Recovered exception";
    meta.textContent=item.resolvedAt?`Verified ${new Date(item.resolvedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`:"Verified recovered";
    row.append(sev,copy,meta);list.append(row);
  });
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
  renderShiftBridge();
  renderPostShiftReview(data.evidence?.postShiftReview||null);
  buildIntelligence(data);
  loadManagerActions();
  loadOutcomeLearning();
  loadPlaybooks();
  loadShiftMemory();

  const rail=document.querySelector(".bc-os-rail-foot small");
  if(rail)rail.textContent=`V94.0 · ${data.dataMode==="historical-demo"?"Demo data":"Live data"}`;
  commandState.lastLoadedAt=Date.now();
}


function actionStatusLabel(status){
  return ({acknowledged:"Acknowledged",assigned:"Assigned",in_progress:"In progress",resolved:"Resolved",dismissed:"Dismissed"})[status]||status||"Open";
}

function renderManagerActions(summary={}){
  shiftBridgeState.actionSummary=summary;
  renderShiftBridge();
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




let pilotClockTimer=null;
let pilotClockStartedAt=null;

function formatPilotElapsed(startedAt){
  if(!startedAt)return "—";
  const ms=Math.max(0,Date.now()-new Date(startedAt).getTime());
  const total=Math.floor(ms/1000),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  return h>0?`${h}h ${String(m).padStart(2,"0")}m`:`${m}m ${String(s).padStart(2,"0")}s`;
}
function syncPilotClock(startedAt){
  pilotClockStartedAt=startedAt||null;
  if(pilotClockTimer)clearInterval(pilotClockTimer);
  setText("bcPilotSessionClock",formatPilotElapsed(pilotClockStartedAt));
  if(pilotClockStartedAt)pilotClockTimer=setInterval(()=>setText("bcPilotSessionClock",formatPilotElapsed(pilotClockStartedAt)),1000);
}
function requestPilotConfirmation(action){
  const dialog=el("bcPilotConfirmDialog"),title=el("bcPilotConfirmTitle"),copy=el("bcPilotConfirmCopy"),
    wrap=el("bcPilotConfirmReasonWrap"),reason=el("bcPilotConfirmReason"),submit=el("bcPilotConfirmSubmit");
  if(!dialog)return Promise.resolve({confirmed:false,reason:""});
  const requiresReason=["pause","stop"].includes(action);
  title.textContent=action==="stop"?"Stop controlled pilot?":action==="pause"?"Pause controlled pilot?":"Start controlled pilot?";
  copy.textContent=action==="stop"?"Stopping ends this controlled pilot session. Closeout will be required before evidence is complete.":action==="pause"?"Pausing keeps the session open but stops progression until a human resumes it.":"Starting begins a controlled pilot session against the currently approved evidence.";
  wrap.hidden=!requiresReason;reason.value="";
  submit.textContent=action==="stop"?"Stop pilot":action==="pause"?"Pause pilot":"Start pilot";
  submit.dataset.actionTone=action==="stop"?"danger":action==="pause"?"watch":"go";
  return new Promise(resolve=>{
    const handler=()=>{
      dialog.removeEventListener("close",handler);
      resolve({confirmed:dialog.returnValue==="confirm",reason:reason.value.trim()});
    };
    dialog.addEventListener("close",handler);dialog.showModal();
  });
}


function recoveryStageForIncident(item){const s=String(item?.status||"OPEN").toUpperCase(),v=String(item?.severity||"INFO").toUpperCase();if(s==="RESOLVED"||s==="CLOSED")return"verified";if(s==="ESCALATED")return"recovering";if(s==="ACKNOWLEDGED")return"owned";return v==="CRITICAL"?"critical":"open";}
function renderRecoveryCommand(items=[]){const root=el("bcRecoveryCommand");if(!root)return;const active=items.filter(x=>!["RESOLVED","CLOSED"].includes(String(x.status||"").toUpperCase()));root.hidden=!active.length;if(!active.length){root.dataset.state="clear";return;}const critical=active.some(x=>String(x.severity||"").toUpperCase()==="CRITICAL"),owned=active.every(x=>["ACKNOWLEDGED","ESCALATED"].includes(String(x.status||"").toUpperCase()));root.dataset.state=critical?"critical":"open";setText("bcRecoveryState",critical?"Critical exception in recovery":owned?"Exception owned · recovery in progress":"Service exception requires ownership");setText("bcRecoveryGuidance",owned?"Continue recovery and resolve only after the condition is verified stable.":"Acknowledge the exception so human ownership is explicit.");const activeStep=owned?"recover":"own";root.querySelectorAll("[data-step]").forEach(n=>n.dataset.active=(n.dataset.step==="detect"||n.dataset.step===activeStep)?"true":"false");}
function requestIncidentAction(action){const d=el("bcIncidentActionDialog"),t=el("bcIncidentActionTitle"),c=el("bcIncidentActionCopy"),n=el("bcIncidentActionNote"),s=el("bcIncidentActionSubmit");if(!d)return Promise.resolve({confirmed:false,value:""});t.textContent=action==="resolve"?"Verify recovery and resolve":action==="escalate"?"Escalate service exception":"Acknowledge ownership";c.textContent=action==="resolve"?"Resolve only after the operating condition has been checked and service is stable.":action==="escalate"?"Record why additional support or authority is required.":"Record that a human has taken ownership of this exception.";n.placeholder=action==="acknowledge"?"Optional ownership note":"Required · minimum 10 characters";n.value="";s.textContent=action==="resolve"?"Verify & resolve":action==="escalate"?"Escalate":"Acknowledge";return new Promise(resolve=>{const h=()=>{d.removeEventListener("close",h);resolve({confirmed:d.returnValue==="confirm",value:n.value.trim()});};d.addEventListener("close",h);d.showModal();});}

function renderPilotIncidents(items){
  const root=el("bcPilotIncidents"),list=el("bcPilotIncidentList");
  if(!root||!list)return;
  root.hidden=!items.length;setText("bcPilotIncidentCount",String(items.length));list.replaceChildren();renderRecoveryCommand(items);
  items.forEach(item=>{
    const row=document.createElement("div");row.className="bc-pilot-incident-row";row.dataset.recoveryState=recoveryStageForIncident(item);
    const sev=document.createElement("span");sev.textContent=item.severity||"INFO";
    const copy=document.createElement("div"),title=document.createElement("strong"),detail=document.createElement("small");
    title.textContent=item.title||"Pilot incident";detail.textContent=`${item.status||"OPEN"}${item.description?` · ${item.description}`:""}`;copy.append(title,detail);
    const actions=document.createElement("div");actions.className="bc-pilot-incident-actions";
    if(item.status!=="ACKNOWLEDGED"){
      const ack=document.createElement("button");ack.type="button";ack.textContent="Acknowledge";ack.addEventListener("click",()=>pilotIncidentAction(item.id,"acknowledge"));actions.append(ack);
    }
    const esc=document.createElement("button");esc.type="button";esc.textContent="Escalate";esc.addEventListener("click",()=>pilotIncidentAction(item.id,"escalate"));actions.append(esc);
    const res=document.createElement("button");res.type="button";res.textContent="Resolve";res.addEventListener("click",()=>pilotIncidentAction(item.id,"resolve"));actions.append(res);
    row.append(sev,copy,actions);list.append(row);
  });
}

async function pilotControl(action){
  const feedback=el("bcPilotActionFeedback");
  let body={};
  if(["start","pause","stop"].includes(action)){
    const confirmation=await requestPilotConfirmation(action);
    if(!confirmation.confirmed)return;
    if(["pause","stop"].includes(action)){
      if(confirmation.reason.length<10){if(feedback)feedback.textContent="Blocked · enter a meaningful reason of at least 10 characters.";return;}
      body={reason:confirmation.reason};
    }else body={label:"Controlled pilot service"};
  }
  const ids={start:"bcPilotStart",pause:"bcPilotPause",resume:"bcPilotResume",stop:"bcPilotStop",refresh:"bcPilotRefresh"};setPilotControlBusy(true,ids[action]||"");
  if(feedback)feedback.textContent=`${action[0].toUpperCase()+action.slice(1)} requested…`;
  try{
    const response=await commandFetch(`/api/pilot/operator-command/${action}`,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body)});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||`Pilot ${action} returned ${response.status}.`);
    if(feedback)feedback.textContent=payload.message||`Pilot ${action} completed.`;
    await refreshPilotCommand();
  }catch(error){if(feedback)feedback.textContent=`Blocked · ${error.message}`;}finally{setPilotControlBusy(false,"");}
}

async function pilotIncidentAction(incidentId,action){
  const feedback=el("bcPilotActionFeedback"),decision=await requestIncidentAction(action);if(!decision.confirmed)return;
  if(action!=="acknowledge"&&decision.value.length<10){if(feedback)feedback.textContent="Blocked · recovery action requires a meaningful note of at least 10 characters.";return;}
  const body=action==="resolve"?{resolution:decision.value,verifiedStable:true}:{note:decision.value};
  try{const response=await commandFetch(`/api/pilot/operator-command/incidents/${encodeURIComponent(incidentId)}/${action}`,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body)});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`Incident ${action} returned ${response.status}.`);if(feedback)feedback.textContent=action==="resolve"?"Recovery verified · incident resolved.":`Incident ${action} completed.`;await refreshPilotCommand();}catch(error){if(feedback)feedback.textContent=`Blocked · ${error.message}`;}
}

const PILOT_ROLE_KEY="bc-pilot-command-role";
function currentPilotRole(){
  const select=el("bcPilotRole");
  const saved=localStorage.getItem(PILOT_ROLE_KEY);
  const allowed=["HOST","MANAGER","OPERATOR","EXECUTIVE"];
  const value=allowed.includes(select?.value)?select.value:allowed.includes(saved)?saved:"MANAGER";
  if(select&&select.value!==value)select.value=value;
  return value;
}
function applyPilotRolePresentation(data){
  const profile=data.presentation||{};
  const role=profile.role||currentPilotRole();
  const card=el("bcPilotCommandCard");if(card)card.dataset.role=role;
  const launch=el("bcCommandLaunch");if(launch)launch.dataset.role=role;
  setText("bcPilotRoleLabel",`${profile.label||role} view`);
  setText("bcPilotRoleCopy",profile.guidance||"Focus on the information required for this operating role.");
  syncWorkspaceHierarchyForRole(role);
  const controls=el("bcPilotControls");
  if(controls)controls.hidden=profile.showPilotControls===false;
  const incidents=el("bcPilotIncidents");
  if(incidents&&profile.showIncidents===false)incidents.hidden=true;
  const evidence=el("bcPilotEvidence");
  if(evidence)evidence.hidden=profile.showEvidence===false;
}


function setSecondaryWorkspaceDisclosure(open){
  const secondary=el("bcWorkspaceSecondary"),button=el("bcMoreWorkspaces");
  if(!secondary||!button)return;
  secondary.hidden=!open;
  button.setAttribute("aria-expanded",open?"true":"false");
  const label=button.querySelector("span:first-child"),icon=button.querySelector("span:last-child");
  if(label)label.textContent=open?"Fewer tools":"More tools";
  if(icon)icon.textContent=open?"−":"+";
}
function syncWorkspaceHierarchyForRole(role){
  const normalized=String(role||"MANAGER").toUpperCase();
  if(normalized==="EXECUTIVE")setSecondaryWorkspaceDisclosure(false);
  const secondaryExecutive=document.querySelector('[data-secondary-executive="true"]');
  if(secondaryExecutive)secondaryExecutive.hidden=normalized==="EXECUTIVE";
}

function renderServiceNightFocus(data){const r=el("bcServiceNightFocus");if(!r)return;const c=Number(data?.health?.criticalOpen||0),o=Number(data?.health?.openIncidents||0),session=data?.session;r.dataset.state=c?"critical":o?"attention":"ready";setText("bcServiceNightFocusTitle",c?"Critical exception requires manager control":o?"Service exception remains visible":session?"Service picture is stable":"Ready for controlled service");setText("bcServiceNightFocusCopy",c?"Protect service first. Recover and verify before clearing the exception.":o?"Keep recovery visible while the manager works the exception.":session?"Primary control, shift state, and exceptions remain one glance away.":"Start only when the human operator and certified readiness state agree.");setText("bcServiceNightBadge",c?"RECOVERY":o?"ATTENTION":session?"IN SERVICE":"FIELD READY");}
function syncPrimaryPilotAction(data){const m={START:"bcPilotStart",PAUSE:"bcPilotPause",RESUME:"bcPilotResume",STOP:"bcPilotStop",MONITOR:"bcPilotRefresh",REVIEW:"bcPilotRefresh"};document.querySelectorAll("#bcPilotControls button").forEach(b=>b.removeAttribute("data-primary-action"));const b=el(m[String(data?.controls?.primaryAction||"REVIEW").toUpperCase()]||"bcPilotRefresh");if(b)b.dataset.primaryAction="true";}
function setPilotControlBusy(active,ownerId){const c=el("bcPilotControls");if(!c)return;c.dataset.busy=active?"true":"false";c.querySelectorAll("button").forEach(b=>{b.removeAttribute("data-busy-owner");if(active&&b.id===ownerId)b.dataset.busyOwner="true";});}
async function refreshPilotCommand(){
  if(!authenticatedAppState())return;
  try{
    const role=currentPilotRole();
    const response=await commandFetch(`/api/pilot/operator-command?role=${encodeURIComponent(role)}`,{method:"GET",headers:{"Accept":"application/json"}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`Pilot command returned ${response.status}.`);
    applyPilotRolePresentation(data);renderServiceNightFocus(data);syncPrimaryPilotAction(data);
    const state=el("bcPilotState");
    if(state){state.textContent=String(data.status||"UNKNOWN").replaceAll("_"," ");state.dataset.tone=data.tone||"neutral";}
    setText("bcPilotReadiness",String(data.readiness?.decision||"UNKNOWN").replaceAll("_"," "));
    setText("bcPilotReadinessDetail",data.readiness?.explicitHold?"Explicit launch hold is active.":data.readiness?.currentApproval?"Human launch approval is current.":`${data.readiness?.blocking?.length||0} readiness blocker(s).`);
    setText("bcPilotSession",data.session?String(data.session.state||"ACTIVE").replaceAll("_"," "):"No active session");
    setText("bcPilotSessionDetail",data.session?.label||"Controlled start required");
    setText("bcPilotHealth",data.health?.state||"—");
    setText("bcPilotHealthDetail",data.health?`${data.health.openIncidents} open incident(s) · ${data.health.metrics} metric(s)`:"No runtime health yet");
    setText("bcPilotNextAction",data.nextAction||"Review pilot status.");
    setText("bcPilotEvidence",`${data.evidence?.closedSessions||0} closed session(s) · ${data.evidence?.learningDecisions||0} learning decision(s)${data.evidence?.latestDecision?` · Latest ${data.evidence.latestDecision}`:""}`);
    const focus=el("bcPilotFocusStrip");
    const runtimeState=data.session?.state||"IDLE";
    if(focus)focus.dataset.state=data.health?.state==="CRITICAL"?"critical":runtimeState==="ACTIVE"?"active":runtimeState==="PAUSED"?"paused":"idle";
    setText("bcPilotFocusState",data.session?`${runtimeState.replaceAll("_"," ")} · ${data.session.label||"Controlled pilot"}`:"No active pilot");
    setText("bcPilotFocusPriority",data.nextAction||"Review pilot readiness.");
    syncPilotClock(data.session?.startedAt||null);
    ["Start","Pause","Resume","Stop"].forEach(name=>{const b=el(`bcPilot${name}`);if(b)b.disabled=!data.controls?.[`can${name}`];});
    if(data.presentation?.showIncidents!==false)renderPilotIncidents(data.health?.incidents||[]);
    else {const incidentRoot=el("bcPilotIncidents");if(incidentRoot)incidentRoot.hidden=true;}
  }catch(error){
    const state=el("bcPilotState");if(state){state.textContent="Unavailable";state.dataset.tone="hold";}
    setText("bcPilotNextAction","Pilot command data is temporarily unavailable. Core Command remains available.");
  }
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
    refreshPilotCommand();
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
  el("bcPilotStart")?.addEventListener("click",()=>pilotControl("start"));
  el("bcPilotPause")?.addEventListener("click",()=>pilotControl("pause"));
  el("bcPilotResume")?.addEventListener("click",()=>pilotControl("resume"));
  el("bcPilotStop")?.addEventListener("click",()=>pilotControl("stop"));
  el("bcPilotRefresh")?.addEventListener("click",()=>refreshPilotCommand());
  document.addEventListener("keydown",event=>{if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey)return;const tag=String(document.activeElement?.tagName||"").toLowerCase();if(["input","textarea","select"].includes(tag)||document.querySelector("dialog[open]"))return;if(event.key.toLowerCase()==="r"){event.preventDefault();refreshPilotCommand();}});
  el("bcShiftStartView")?.addEventListener("click",()=>setShiftBridgeMode("start"));
  el("bcShiftHandoffView")?.addEventListener("click",()=>setShiftBridgeMode("handoff"));
  el("bcMoreWorkspaces")?.addEventListener("click",()=>{
    const button=el("bcMoreWorkspaces");
    setSecondaryWorkspaceDisclosure(button?.getAttribute("aria-expanded")!=="true");
  });
  el("bcPilotRole")?.addEventListener("change",event=>{
    localStorage.setItem(PILOT_ROLE_KEY,String(event.target.value||"MANAGER"));
    refreshPilotCommand();
  });
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