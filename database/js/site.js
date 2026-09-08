(()=>{"use strict";const b=document.querySelector(".menu-button"),n=document.getElementById("mobileNav");b?.addEventListener("click",()=>{const o=b.getAttribute("aria-expanded")==="true";b.setAttribute("aria-expanded",String(!o));if(n)n.hidden=o});n?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{n.hidden=true;b?.setAttribute("aria-expanded","false")}));document.querySelectorAll("#year").forEach(x=>x.textContent=new Date().getFullYear());const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("is-visible");io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll(".reveal").forEach(x=>io.observe(x))})();
(() => {"use strict";function animate(n){const t=Number(n.dataset.counter||0),s=n.dataset.suffix||"",d=1100,a=performance.now();function f(x){const p=Math.min(1,(x-a)/d),e=1-Math.pow(1-p,3);n.textContent=Math.round(t*e)+s;if(p<1)requestAnimationFrame(f)}requestAnimationFrame(f)}const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&!e.target.dataset.counted){e.target.dataset.counted="1";animate(e.target);o.unobserve(e.target)}}),{threshold:.35});document.querySelectorAll("[data-counter]").forEach(n=>o.observe(n));const day=document.getElementById("heroExperienceDay"),clock=document.getElementById("heroExperienceTime");function tick(){const n=new Date();if(day)day.textContent=new Intl.DateTimeFormat("en-US",{weekday:"long"}).format(n);if(clock)clock.textContent=new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(n)}tick();setInterval(tick,30000);const cards=[...document.querySelectorAll(".hero-attention-card")],msg=document.getElementById("heroBrainMessage"),btn=document.getElementById("heroNextRecommendation"),messages=["Recommending a host redeployment based on arrival pace and table readiness.","Recommending a twelve-minute reservation release hold to protect kitchen throughput.","Recommending a manager follow-up on seven high-value guest requests."];let i=0;function show(x){i=(x+cards.length)%cards.length;cards.forEach((c,j)=>c.classList.toggle("is-active",j===i));if(msg)msg.textContent=messages[i]}btn?.addEventListener("click",()=>show(i+1));cards.forEach((c,j)=>c.addEventListener("mouseenter",()=>show(j)));setInterval(()=>show(i+1),6500);const stream=document.getElementById("heroEventStream"),events=[["AI Concierge","Birthday preference attached to guest profile."],["Reservation Operations","Two-top inventory opened after an early turn."],["Kitchen Command","Station load balanced after menu-mix change."],["Executive Command","Service pressure returned to normal range."]];let k=0;setInterval(()=>{if(!stream)return;const [t,d]=events[k++%events.length],a=document.createElement("article");a.innerHTML="<i></i><div><strong></strong><span></span></div><time>Now</time>";a.querySelector("strong").textContent=t;a.querySelector("span").textContent=d;stream.prepend(a);while(stream.children.length>4)stream.lastElementChild.remove()},7200)})();

(() => {
"use strict";
const platformData=[
["Guest Experience","Every guest request enters one intelligent operating flow.","AI Concierge answers calls, captures intent, confirms reservations, and preserves guest preferences while keeping the host stand synchronized.",[["Answer","Every guest receives immediate acknowledgment."],["Understand","Intent and preferences are captured."],["Coordinate","The reservation view updates instantly."]],["Guest line","AI Concierge is handling an incoming reservation call.","Live"],[["Party","6 guests"],["Time","7:15 PM"],["Preference","Waterfront"],["Occasion","Birthday"]]],
["Restaurant Operations","The floor, kitchen, staff, and reservations share one service state.","Blue Current coordinates the moving parts of service so managers can act before local pressure becomes a guest-facing problem.",[["Observe","Track table readiness, arrivals, kitchen load, and staffing."],["Coordinate","Send the right action to the right owner."],["Recover","Verify whether the intervention improved service."]],["Live floor","Section pressure is increasing near the waterfront arrival window.","Watch"],[["Occupancy","78%"],["Tables turning","7"],["Kitchen load","74%"],["Coverage","94%"]]],
["Executive Intelligence","Leadership sees the moments that require attention—not another wall of data.","Blue Current converts operating signals into a ranked executive queue with urgency, owner, confidence, expected value, and evidence.",[["Prioritize","Separate immediate actions from items to watch."],["Assign","Attach a clear owner and checkpoint."],["Measure","Compare expected value with observed outcome."]],["Decision queue","Two operating moments require leadership attention.","2 active"],[["Urgency","Today"],["Owner","Regional Manager"],["Confidence","91%"],["Expected value","$1,100"]]],
["Governed Autonomy","Autonomous action expands only when evidence proves it is safe.","Guardrails, rollout controls, outcome verification, incident response, recovery, certification, and audit evidence keep automated operations accountable.",[["Constrain","Set confidence, value, urgency, and certification limits."],["Verify","Measure observed results against expectations."],["Govern","Pause, recover, certify, and audit every domain."]],["Autonomy guardrail","Kitchen pacing recommendation requires supervised approval.","Approval"],[["Mode","Supervised"],["Confidence floor","88%"],["Max value","$500"],["Certification","Conditional"]]]
];
const operationsData=[
["Reservation Pace","Protect the service before demand becomes pressure.","Blue Current compares arrivals, table readiness, kitchen throughput, staffing coverage, and current reservations before recommending whether to release, hold, or reshape demand.",[["Forecast","Compare reservations to the expected service curve."],["Detect","Identify arrival compression early."],["Act","Hold, release, or redirect demand."]],["Arrival curve","7:00–7:30 PM is approaching the safe service threshold.","Watch"],[["Reservations","86% of forecast"],["Floor readiness","78%"],["Kitchen capacity","74%"],["Staff coverage","94%"]],"Hold large-party reservation releases for twelve minutes.","The arrival curve and kitchen load are temporarily outpacing table readiness.","91% confidence",[32,48,63,82,94,88,67,42]],
["Live Floor","Keep seating decisions aligned with the real dining-room state.","Table status, section pressure, arrival timing, server load, and guest needs stay visible in one shared operating picture.",[["See","Track every active table and section."],["Balance","Distribute arrivals according to service capacity."],["Recover","Protect the guest experience when a section falls behind."]],["Section pressure","Waterfront demand is exceeding current host coverage.","Act now"],[["Occupancy","78%"],["Ready tables","4"],["Turns due","7"],["Host coverage","2 of 3"]],"Move one host to waterfront arrivals for twenty minutes.","Demand is concentrated in one seating zone.","94% confidence",[44,58,72,86,78,69,55,47]],
["Kitchen Command","Coordinate pacing before ticket pressure affects the dining room.","Blue Current connects menu mix, station load, ticket age, reservation pace, and table flow so kitchen leaders can rebalance early.",[["Monitor","See ticket pressure and station load."],["Rebalance","Shift work before expo becomes unstable."],["Communicate","Keep floor and reservations aligned."]],["Ticket pressure","Expo pressure is rising as large-party entrées enter the line.","High"],[["Avg ticket","14.2 min"],["Oldest ticket","21 min"],["Station load","88%"],["Expo pressure","High"]],"Rebalance one cook to sauté and hold releases for eight minutes.","Current station load may add six minutes to the next reservation wave.","89% confidence",[35,46,58,71,84,96,90,74]],
["Workforce","Deploy the team according to the live service state.","Coverage, clock-in status, role demand, section pressure, and kitchen load become one workforce coordination layer.",[["Confirm","See who is present and available."],["Deploy","Move coverage where it is needed."],["Verify","Measure whether the staffing move reduced pressure."]],["Coverage plan","Current staffing is sufficient, but the host stand needs temporary support.","Stable"],[["Clocked in","42"],["Coverage","94%"],["Open roles","1"],["Redeployments","2"]],"Move one service assistant to host support until 7:40 PM.","A short redeployment protects arrivals without increasing scheduled labor.","93% confidence",[60,68,76,89,94,91,80,66]]
];
function points(items){const root=document.getElementById("tourPoints");root.replaceChildren();items.forEach((item,i)=>{const a=document.createElement("article");a.innerHTML="<b></b><span><strong></strong><small></small></span>";a.querySelector("b").textContent=String(i+1).padStart(2,"0");a.querySelector("strong").textContent=item[0];a.querySelector("small").textContent=item[1];root.append(a);});}
function details(items){const root=document.getElementById("tourDetails");root.replaceChildren();items.forEach(item=>{const a=document.createElement("article");a.innerHTML="<span></span><b></b>";a.querySelector("span").textContent=item[0];a.querySelector("b").textContent=item[1];root.append(a);});}
const section=document.querySelector("[data-product-tour]");if(!section)return;const data=section.dataset.productTour==="platform"?platformData:operationsData;const tabs=[...document.querySelectorAll("[data-tour-tab]")];const orbit=[...document.querySelectorAll("[data-orbit-panel]")];let active=0;
function render(i){active=i;const d=data[i];tabs.forEach((t,x)=>t.classList.toggle("is-active",x===i));orbit.forEach((t,x)=>t.classList.toggle("is-active",x===i));document.getElementById("tourKicker").textContent=d[0];document.getElementById("tourTitle").textContent=d[1];document.getElementById("tourDescription").textContent=d[2];points(d[3]);document.getElementById("tourPanelEyebrow").textContent=d[4][0];document.getElementById("tourPanelTitle").textContent=d[4][1];document.getElementById("tourPanelStatus").textContent=d[4][2];document.getElementById("tourScreenLabel").textContent=d[0];details(d[5]);if(section.dataset.productTour==="operations"){document.getElementById("tourRecommendation").textContent=d[6];document.getElementById("tourReason").textContent=d[7];document.getElementById("tourConfidence").textContent=d[8];document.querySelectorAll("#arrivalChart span").forEach((b,x)=>b.style.setProperty("--height",`${d[9][x]}%`));}}
tabs.forEach((t,i)=>t.addEventListener("click",()=>render(i)));orbit.forEach((t,i)=>t.addEventListener("click",()=>{render(i);section.scrollIntoView({behavior:"smooth"});}));setInterval(()=>render((active+1)%data.length),11000);
})();


(() => {
  "use strict";

  const conciergeScenarios = [
    {
      caller:"Private caller · Marina Grille",
      state:"In progress",
      intent:"Reservation request",
      confidence:"96% confidence",
      transcript:[
        ["Guest","Hi, I’m looking for a table for six this Saturday around seven. It’s my wife’s birthday."],
        ["Blue Current","I can help with that. Would you prefer waterfront seating or the main dining room?"]
      ],
      details:[["Party size","6 guests"],["Requested time","7:00–7:30 PM"],["Preference","Waterfront"],["Occasion","Birthday"]],
      outcome:"Offer 7:15 PM waterfront and send immediate confirmation."
    },
    {
      caller:"Returning guest · Harbor House",
      state:"In progress",
      intent:"Reservation change",
      confidence:"93% confidence",
      transcript:[
        ["Guest","Can we move our reservation from six thirty to seven? We’re running late."],
        ["Blue Current","I can check that. Your reservation is for four guests under Morgan, correct?"]
      ],
      details:[["Party size","4 guests"],["Current time","6:30 PM"],["Requested time","7:00 PM"],["Guest status","Returning"]],
      outcome:"Move reservation to 7:00 PM and notify the host stand."
    },
    {
      caller:"Private caller · River & Rail",
      state:"Escalation",
      intent:"Private dining inquiry",
      confidence:"89% confidence",
      transcript:[
        ["Guest","I’m planning a rehearsal dinner for about forty people in October."],
        ["Blue Current","I can collect the details and connect you with the events manager. Do you have a preferred date?"]
      ],
      details:[["Event","Rehearsal dinner"],["Guests","Approx. 40"],["Timing","October"],["Priority","High value"]],
      outcome:"Capture event requirements and escalate to the events manager."
    }
  ];

  const nextScenario = document.getElementById("conciergeNextScenario");
  let conciergeIndex = 0;

  function renderConcierge(index) {
    const scenario = conciergeScenarios[index];
    if (!scenario) return;

    document.getElementById("conciergeCallerName").textContent = scenario.caller;
    document.getElementById("conciergeCallState").textContent = scenario.state;
    document.getElementById("conciergeIntentLabel").textContent = scenario.intent;
    document.getElementById("conciergeIntentConfidence").textContent = scenario.confidence;
    document.getElementById("conciergeOutcome").textContent = scenario.outcome;

    const transcript = document.getElementById("conciergeTranscript");
    transcript.replaceChildren();
    scenario.transcript.forEach((entry,entryIndex) => {
      const article = document.createElement("article");
      article.className = entryIndex === 0 ? "guest" : "ai";
      article.innerHTML = "<b></b><p></p>";
      article.querySelector("b").textContent = entry[0];
      article.querySelector("p").textContent = entry[1];
      transcript.append(article);
    });

    const details = document.getElementById("conciergeDetails");
    details.replaceChildren();
    scenario.details.forEach(entry => {
      const article = document.createElement("article");
      article.innerHTML = "<span></span><b></b>";
      article.querySelector("span").textContent = entry[0];
      article.querySelector("b").textContent = entry[1];
      details.append(article);
    });
  }

  nextScenario?.addEventListener("click",() => {
    conciergeIndex = (conciergeIndex+1)%conciergeScenarios.length;
    renderConcierge(conciergeIndex);
  });

  let callSeconds = 42;
  const timer = document.getElementById("conciergeCallTimer");
  if (timer) {
    setInterval(() => {
      callSeconds += 1;
      const minutes = String(Math.floor(callSeconds/60)).padStart(2,"0");
      const seconds = String(callSeconds%60).padStart(2,"0");
      timer.textContent = `${minutes}:${seconds}`;
    },1000);
  }

  const executiveDecisions = [
    {
      title:"Marina Grille arrival compression",
      detail:"Move one host to waterfront arrivals before 7:30 PM to protect the guest arrival experience.",
      owner:"Regional Manager",
      urgency:"Today",
      confidence:"94%",
      value:"$1,100"
    },
    {
      title:"Harbor House kitchen pacing",
      detail:"Hold large-party reservation releases for twelve minutes while expo pressure normalizes.",
      owner:"General Manager",
      urgency:"Now",
      confidence:"91%",
      value:"$850"
    },
    {
      title:"River & Rail guest opportunity",
      detail:"Assign a manager to follow up on seven high-value guest requests captured by AI Concierge.",
      owner:"Events Manager",
      urgency:"Today",
      confidence:"89%",
      value:"$2,400"
    }
  ];

  const decisionCards = Array.from(document.querySelectorAll("[data-executive-decision]"));
  const nextDecision = document.getElementById("executiveNextDecision");
  let decisionIndex = 0;

  function renderDecision(index) {
    decisionIndex = index;
    const item = executiveDecisions[index];
    decisionCards.forEach((card,cardIndex) => card.classList.toggle("is-active",cardIndex === index));
    document.getElementById("executiveDecisionTitle").textContent = item.title;
    document.getElementById("executiveDecisionDetail").textContent = item.detail;
    document.getElementById("executiveDecisionOwner").textContent = item.owner;
    document.getElementById("executiveDecisionUrgency").textContent = item.urgency;
    document.getElementById("executiveDecisionConfidence").textContent = item.confidence;
    document.getElementById("executiveDecisionValue").textContent = item.value;
  }

  decisionCards.forEach((card,index) => card.addEventListener("click",() => renderDecision(index)));
  nextDecision?.addEventListener("click",() => renderDecision((decisionIndex+1)%executiveDecisions.length));

  const portfolioTime = document.getElementById("executivePortfolioTime");
  if (portfolioTime) {
    const update = () => {
      const now = new Date();
      portfolioTime.textContent = `${new Intl.DateTimeFormat("en-US",{weekday:"long"}).format(now)} · ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(now)}`;
    };
    update();
    setInterval(update,30000);
  }
})();


(() => {
  "use strict";

  const locations = [
    {title:"Marina Grille",detail:"Local policies, operating limits, access roles, and rollout state remain visible at the enterprise level.",mode:"Supervised",roles:"18",rollout:"25% pilot",compliance:"Certified"},
    {title:"Harbor House",detail:"Kitchen pacing and reservation release controls are under active review during peak service.",mode:"Advisory",roles:"22",rollout:"10% canary",compliance:"Conditional"},
    {title:"River & Rail",detail:"Private-event demand and manager escalation workflows are active for the current service period.",mode:"Supervised",roles:"16",rollout:"50% controlled",compliance:"Certified"},
    {title:"Shoreline Kitchen",detail:"High-volume service workflows are operating under a measured bounded-autonomy pilot.",mode:"Bounded",roles:"14",rollout:"25% pilot",compliance:"Certified"}
  ];

  const locationCards = Array.from(document.querySelectorAll("[data-enterprise-location]"));
  function renderLocation(index) {
    const item = locations[index];
    if (!item) return;
    locationCards.forEach((card,cardIndex) => card.classList.toggle("is-active",cardIndex === index));
    document.getElementById("enterpriseLocationTitle").textContent = item.title;
    document.getElementById("enterpriseLocationDetail").textContent = item.detail;
    document.getElementById("enterpriseLocationMode").textContent = item.mode;
    document.getElementById("enterpriseLocationRoles").textContent = item.roles;
    document.getElementById("enterpriseLocationRollout").textContent = item.rollout;
    document.getElementById("enterpriseLocationCompliance").textContent = item.compliance;
  }
  locationCards.forEach((card,index) => card.addEventListener("click",() => renderLocation(index)));

  const trustSteps = [
    ["Guardrails","Set the operating boundaries before automation begins.","Confidence, value, urgency, ownership, rollout, and certification requirements determine whether an action is blocked, approval-required, or eligible for bounded execution.","Policy active"],
    ["Outcome verification","Measure whether the autonomous action delivered the expected result.","Observed value, success classification, and operating impact determine whether trust should expand, hold, or decline.","Verification required"],
    ["Incident response","Contain failures before they spread through the operation.","Critical incidents pause affected domains, assign an owner, preserve evidence, and create a structured response path.","Containment ready"],
    ["Recovery & requalification","Require proof before autonomy returns.","Corrective actions, successful outcomes, value thresholds, and accountable ownership must be satisfied before reinstatement.","Recovery controlled"],
    ["Certification","Authorize each operating domain with evidence and controls.","Outcome quality, rollout posture, incident state, recovery readiness, governor authorization, and audit continuity determine certification.","Certification monitored"],
    ["Evidence integrity","Keep the full governance record audit-ready.","Certificates, renewals, outcomes, incidents, recovery plans, rollouts, and policy decisions are indexed and integrity-verified.","Evidence indexed"]
  ];

  const trustButtons = Array.from(document.querySelectorAll("[data-trust-step]"));
  function renderTrust(index) {
    const item = trustSteps[index];
    trustButtons.forEach((button,buttonIndex) => button.classList.toggle("is-active",buttonIndex === index));
    document.getElementById("trustInspectorKicker").textContent = item[0];
    document.getElementById("trustInspectorTitle").textContent = item[1];
    document.getElementById("trustInspectorDetail").textContent = item[2];
    document.getElementById("trustInspectorStatus").textContent = item[3];
  }
  trustButtons.forEach((button,index) => button.addEventListener("click",() => renderTrust(index)));

  const storySteps = Array.from(document.querySelectorAll(".about-story-step"));
  let storyIndex = 0;
  function renderStory(index) {
    storyIndex = index;
    storySteps.forEach((step,stepIndex) => step.classList.toggle("is-active",stepIndex === index));
  }
  storySteps.forEach((step,index) => step.addEventListener("click",() => renderStory(index)));
  if (storySteps.length) setInterval(() => renderStory((storyIndex+1)%storySteps.length),7000);
})();


(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const updateHeader = () => header?.classList.toggle("is-scrolled",window.scrollY > 12);
  updateHeader();
  addEventListener("scroll",updateHeader,{passive:true});

  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".desktop-nav a,.mobile-nav a").forEach(link => {
    const target = (link.getAttribute("href") || "").split("#")[0];
    if (target === current || (current === "" && target === "index.html")) {
      link.setAttribute("aria-current","page");
    }
  });

  const menuButton = document.querySelector(".menu-button");
  const mobileNav = document.getElementById("mobileNav");

  function closeMenu() {
    if (!menuButton || !mobileNav) return;
    menuButton.setAttribute("aria-expanded","false");
    mobileNav.hidden = true;
  }

  document.addEventListener("keydown",event => {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click",event => {
    if (!mobileNav || mobileNav.hidden) return;
    if (!mobileNav.contains(event.target) && !menuButton?.contains(event.target)) closeMenu();
  });

  if ("IntersectionObserver" in window) {
    document.querySelectorAll("img:not([loading])").forEach((img,index) => {
      if (index > 0) img.loading = "lazy";
      img.decoding = "async";
    });
  }

  document.documentElement.classList.add("js");
  addEventListener("load",() => document.body.classList.add("loading-complete"),{once:true});

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) {
    document.querySelectorAll(".reveal").forEach(node => node.classList.add("is-visible"));
  }
})();

(() => {
  "use strict";
  const buttons = Array.from(document.querySelectorAll("[data-product-view]"));
  if (!buttons.length) return;
  const views = [
    {
      kicker:"AI Concierge", title:"Turn every guest conversation into structured demand.", detail:"Answer calls, preserve context, capture intent, and route the next action without forcing the guest or the operator through another disconnected workflow.",
      list:["Natural guest conversations with location-specific policies","Reservation, event, and follow-up intent captured in one record","Escalation rules for high-value or sensitive requests"], link:"concierge.html", linkText:"Explore AI Concierge", mode:"Guest demand", eyebrow:"Guest intelligence", uiTitle:"Saturday demand stream", metrics:[["98%","176 conversations"],["42","Today"],["6","Manager review"]],
      feed:[["Reservation","Anniversary dinner · 6 guests","Preferred waterfront seating noted","Confirmed"],["Private event","Corporate dinner · 28 guests","Budget and date flexibility captured","Qualified"],["Guest recovery","Manager follow-up requested","Escalated with full conversation context","Priority"]]
    },
    {
      kicker:"Live Operations", title:"Coordinate tonight before pressure becomes disruption.", detail:"Combine arrival pace, table readiness, kitchen throughput, staffing coverage, and guest context in a single manager command view.",
      list:["Real-time service pressure across floor, kitchen, and workforce","Recommended interventions with ownership and urgency","Shared handoffs that remain visible across teams"], link:"operations.html", linkText:"Explore Live Operations", mode:"Live service", eyebrow:"Service coordination", uiTitle:"Saturday service command", metrics:[["86%","Reservation pace"],["14.2m","Average ticket"],["94%","Staffing coverage"]],
      feed:[["Arrival pace","Waterfront arrivals compressing","Move one host before 7:30 PM","Act now"],["Kitchen","Expo pressure trending upward","Hold large-party releases for 12 minutes","Watch"],["Floor","Table 14 reset complete","Priority party cleared for seating","Resolved"]]
    },
    {
      kicker:"Executive Command", title:"Manage the portfolio by exception—not by spreadsheet.", detail:"Give leadership a live view of performance, risk, opportunity, and accountability across every location without losing the operating context behind the number.",
      list:["Location-level health and portfolio-wide comparisons","AI-generated briefings tied to source evidence","Decisions, owners, outcomes, and follow-through in one ledger"], link:"executive.html", linkText:"Explore Executive Command", mode:"Executive command", eyebrow:"Portfolio intelligence", uiTitle:"Leadership attention queue", metrics:[["92","Portfolio health"],["4","Locations live"],["2","Need attention"]],
      feed:[["Operational risk","Marina Grille arrival compression","Regional manager assigned","Owned"],["Revenue opportunity","Seven qualified event requests","Estimated opportunity $2,400","Review"],["Service recovery","Harbor House pacing normalized","Intervention outcome verified","Closed"]]
    }
  ];
  const $ = id => document.getElementById(id);
  function render(index){
    const v=views[index];
    buttons.forEach((b,i)=>{b.classList.toggle("is-active",i===index);b.setAttribute("aria-selected",String(i===index));});
    $("productProofKicker").textContent=v.kicker; $("productProofTitle").textContent=v.title; $("productProofDetail").textContent=v.detail;
    $("productProofList").innerHTML=v.list.map(x=>`<li>${x}</li>`).join("");
    $("productProofLink").href=v.link; $("productProofLink").innerHTML=`${v.linkText} <span>↗</span>`;
    $("productProofMode").textContent=v.mode; $("productUiEyebrow").textContent=v.eyebrow; $("productUiTitle").textContent=v.uiTitle;
    [["productMetricOne","productMetricOneLabel"],["productMetricTwo","productMetricTwoLabel"],["productMetricThree","productMetricThreeLabel"]].forEach((ids,i)=>{$(ids[0]).textContent=v.metrics[i][0];$(ids[1]).textContent=v.metrics[i][1];});
    $("productUiFeed").innerHTML=v.feed.map(row=>`<article><span>${row[0]}</span><div><strong>${row[1]}</strong><small>${row[2]}</small></div><b>${row[3]}</b></article>`).join("");
  }
  buttons.forEach((button,index)=>button.addEventListener("click",()=>render(index)));
})();

// Website SaaS Upgrade 04 — illustrative ROI estimator
(() => {
  const calls = document.getElementById('roiCalls');
  const conversion = document.getElementById('roiConversion');
  const ticket = document.getElementById('roiTicket');
  if (!calls || !conversion || !ticket) return;
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const render = () => {
    const weeklyCalls = Number(calls.value);
    const rate = Number(conversion.value) / 100;
    const averageTicket = Number(ticket.value);
    const recovered = Math.round(weeklyCalls * rate);
    const annual = recovered * averageTicket * 52;
    document.getElementById('roiCallsValue').textContent = weeklyCalls;
    document.getElementById('roiConversionValue').textContent = `${conversion.value}%`;
    document.getElementById('roiTicketValue').textContent = money.format(averageTicket);
    document.getElementById('roiRecovered').textContent = recovered;
    document.getElementById('roiMonthly').textContent = money.format(annual / 12);
    document.getElementById('roiAnnualValue').textContent = money.format(annual);
  };
  [calls, conversion, ticket].forEach((input) => input.addEventListener('input', render));
  render();
})();

// Website SaaS Upgrade 05 — pilot outcome scorecard
(() => {
  const buttons = Array.from(document.querySelectorAll('[data-pilot-view]'));
  if (!buttons.length) return;
  const views = [
    {
      kicker:'Example scorecard', title:'Recover high-intent guest demand.',
      metrics:[['Baseline','31%','Calls unanswered during peak windows'],['Target','<10%','Unanswered high-intent demand'],['Review','Weekly','Conversion, escalation, and guest quality']],
      deploy:['Location-specific AI call handling','Reservation and event intent capture','Manager escalation and review rules'],
      receive:['Baseline and outcome comparison','Conversation-level evidence','Expansion recommendation with risks'],
      outcome:'Decision: expand only if captured demand, guest quality, and manager confidence improve against the agreed baseline.'
    },
    {
      kicker:'Example scorecard', title:'Reduce service pressure before it becomes disruption.',
      metrics:[['Baseline','18m','Average peak seating delay'],['Target','<10m','Average peak seating delay'],['Review','Nightly','Pacing, handoffs, and intervention quality']],
      deploy:['Live arrival and table-readiness view','Service-pressure alerts with ownership','Floor, kitchen, and host handoff workflow'],
      receive:['Delay and throughput comparison','Intervention timeline and accountability','Operational playbook for repeatability'],
      outcome:'Decision: expand only if service delays fall without transferring pressure to guests, staff, or kitchen throughput.'
    },
    {
      kicker:'Example scorecard', title:'Give leadership a reliable daily operating picture.',
      metrics:[['Baseline','6 hrs','Weekly manual reporting effort'],['Target','<1 hr','Weekly manual reporting effort'],['Review','Daily','Accuracy, exceptions, and follow-through']],
      deploy:['Location-level operating health model','Evidence-backed executive briefing','Decision, owner, and outcome ledger'],
      receive:['Time-to-insight comparison','Exception quality and source traceability','Portfolio rollout recommendation'],
      outcome:'Decision: expand only if leaders receive faster, more trustworthy insight with clear ownership and less reporting overhead.'
    }
  ];
  const byId = id => document.getElementById(id);
  const render = index => {
    const view = views[index];
    buttons.forEach((button,i) => {
      button.classList.toggle('is-active',i === index);
      button.setAttribute('aria-selected',String(i === index));
    });
    byId('pilotScoreKicker').textContent = view.kicker;
    byId('pilotScoreTitle').textContent = view.title;
    byId('pilotScoreMetrics').innerHTML = view.metrics.map(metric => `<article><small>${metric[0]}</small><strong>${metric[1]}</strong><span>${metric[2]}</span></article>`).join('');
    byId('pilotScoreDeploy').innerHTML = view.deploy.map(item => `<li>${item}</li>`).join('');
    byId('pilotScoreReceive').innerHTML = view.receive.map(item => `<li>${item}</li>`).join('');
    byId('pilotScoreOutcome').textContent = view.outcome;
  };
  buttons.forEach((button,index) => button.addEventListener('click',() => render(index)));
})();

// Website SaaS Upgrade 06 — enterprise readiness explorer
(() => {
  const buttons = Array.from(document.querySelectorAll('[data-readiness-view]'));
  if (!buttons.length) return;
  const views = [
    { kicker:'Connect the demand layer', title:'Preserve the systems guests and teams already know.', detail:'Blue Current can sit above phone, reservation, CRM, and loyalty workflows while creating one structured guest-intelligence layer for operators.', inputs:['Voice and telephony','Reservation and waitlist systems','CRM, loyalty, and guest profiles'], outputs:['Intent capture and routing','Conversation context','Manager escalation controls'], source:'Voice · Reservations · CRM', core:'Guest intelligence layer', result:'Structured demand · Escalations · Evidence' },
    { kicker:'Coordinate the operating layer', title:'Unify service signals without rebuilding the restaurant stack.', detail:'Blue Current can connect floor, kitchen, staffing, and reservation signals into one manager view while leaving transactional systems in place.', inputs:['POS and kitchen systems','Scheduling and timekeeping','Floor and reservation workflows'], outputs:['Live service-pressure model','Recommended interventions','Shared ownership and handoffs'], source:'POS · Kitchen · Workforce', core:'Operations coordination layer', result:'Pressure signals · Actions · Accountability' },
    { kicker:'Govern the enterprise layer', title:'Add control, evidence, and portfolio visibility above every location.', detail:'Blue Current gives enterprise teams scoped access, policy boundaries, audit history, and executive reporting across locations and brands.', inputs:['Identity and SSO','Business intelligence and data exports','Compliance and incident workflows'], outputs:['Portfolio health and exception views','Approval and policy controls','Traceable decisions and outcomes'], source:'Identity · BI · Compliance', core:'Enterprise control layer', result:'Portfolio insight · Governance · Audit evidence' }
  ];
  const byId = id => document.getElementById(id);
  const render = index => {
    const view = views[index];
    buttons.forEach((button,i) => { button.classList.toggle('is-active',i===index); button.setAttribute('aria-selected',String(i===index)); });
    byId('readinessKicker').textContent=view.kicker; byId('readinessTitle').textContent=view.title; byId('readinessDetail').textContent=view.detail;
    byId('readinessInputs').innerHTML=view.inputs.map(item=>`<li>${item}</li>`).join(''); byId('readinessOutputs').innerHTML=view.outputs.map(item=>`<li>${item}</li>`).join('');
    byId('readinessSource').innerHTML=`<span>Existing stack</span><b>${view.source}</b>`; byId('readinessCoreLabel').textContent=view.core; byId('readinessResult').innerHTML=`<span>Operating output</span><b>${view.result}</b>`;
  };
  buttons.forEach((button,index)=>button.addEventListener('click',()=>render(index)));
})();


// Website SaaS Upgrade 07 — operational evidence room
(() => {
  const buttons = Array.from(document.querySelectorAll('[data-evidence-view]'));
  if (!buttons.length) return;
  const views = [
    {
      kicker:'Illustrative deployment narrative',
      title:'Recover demand that disappears during peak call windows.',
      signal:'Peak-period calls are going unanswered while hosts are managing arrivals.',
      decision:'Route qualified reservation demand through a policy-controlled AI Concierge.',
      outcome:'Compare captured demand, guest quality, and manager confidence against baseline.',
      ledger:['Original guest request and intent','Policy applied and escalation path','Reservation or follow-up outcome','Manager review and disposition'],
      expansion:'Did the workflow recover valuable demand without creating service or governance risk?'
    },
    {
      kicker:'Illustrative deployment narrative',
      title:'Intervene before arrival pressure becomes a guest-facing delay.',
      signal:'Arrival pace, table readiness, and kitchen throughput are diverging during peak service.',
      decision:'Recommend a timed host redeployment and controlled reservation-release hold.',
      outcome:'Compare seating delay, throughput, intervention quality, and staff impact.',
      ledger:['Source operating signals','Recommendation and confidence','Owner acknowledgment and action','Observed service outcome'],
      expansion:'Did the intervention improve flow without shifting pressure elsewhere in the operation?'
    },
    {
      kicker:'Illustrative deployment narrative',
      title:'Replace fragmented reporting with an evidence-backed operating brief.',
      signal:'Leadership receives delayed summaries without the operating context behind exceptions.',
      decision:'Generate a portfolio briefing linked to source events, owners, and open decisions.',
      outcome:'Compare reporting effort, exception quality, decision speed, and follow-through.',
      ledger:['Location-level source evidence','Exception classification','Decision owner and due date','Resolution and verified outcome'],
      expansion:'Did leadership gain faster insight while preserving trust, traceability, and accountability?'
    }
  ];
  const byId = id => document.getElementById(id);
  const render = index => {
    const view = views[index];
    buttons.forEach((button,i) => {
      button.classList.toggle('is-active',i === index);
      button.setAttribute('aria-selected',String(i === index));
    });
    byId('evidenceKicker').textContent = view.kicker;
    byId('evidenceTitle').textContent = view.title;
    byId('evidenceSignal').textContent = view.signal;
    byId('evidenceDecision').textContent = view.decision;
    byId('evidenceOutcome').textContent = view.outcome;
    byId('evidenceLedger').innerHTML = view.ledger.map(item => `<li>${item}</li>`).join('');
    byId('evidenceExpansion').textContent = view.expansion;
  };
  buttons.forEach((button,index) => button.addEventListener('click',() => render(index)));
})();


// Website SaaS Upgrade 08 — enterprise buyer-path explorer
(() => {
  const buttons = Array.from(document.querySelectorAll('[data-buyer-path]'));
  if (!buttons.length) return;
  const views = [
    {
      kicker:'For operations leaders',
      title:'Where is execution breaking down across the guest journey?',
      detail:'We map the moments where demand, service, staffing, and accountability disconnect—then define one workflow a pilot can improve without disrupting the operation.',
      question:'Can Blue Current reduce friction while giving managers clearer control?',
      review:['Current operating workflow and ownership','Baseline service and demand signals','Manager interventions and handoffs'],
      leave:['A defined pilot use case','A measurable success scorecard','A practical deployment sequence']
    },
    {
      kicker:'For technology leaders',
      title:'How can Blue Current fit the stack without creating another silo?',
      detail:'We review system boundaries, data flow, identity, permissions, integration options, and operational resilience before proposing any live deployment.',
      question:'Can the platform connect safely, remain governable, and scale with the enterprise architecture?',
      review:['Current systems and integration surfaces','Identity, access, and data boundaries','Reliability, audit, and deployment controls'],
      leave:['A high-level architecture map','Integration and governance assumptions','A phased technical validation plan']
    },
    {
      kicker:'For executive sponsors',
      title:'Which operating outcome is important enough to prove now?',
      detail:'We translate portfolio priorities into one measurable deployment thesis, with explicit ownership, review criteria, and a go-or-no-go expansion decision.',
      question:'Can Blue Current produce credible operating leverage with evidence leadership can trust?',
      review:['Strategic priority and economic rationale','Current baseline and decision cadence','Risk tolerance and expansion criteria'],
      leave:['An executive pilot thesis','Defined outcome and evidence standards','A decision-ready 30-day review structure']
    }
  ];
  const byId = id => document.getElementById(id);
  const render = index => {
    const view = views[index];
    buttons.forEach((button,i) => {
      button.classList.toggle('is-active',i === index);
      button.setAttribute('aria-selected',String(i === index));
    });
    byId('buyerPathKicker').textContent = view.kicker;
    byId('buyerPathTitle').textContent = view.title;
    byId('buyerPathDetail').textContent = view.detail;
    byId('buyerPathQuestion').textContent = view.question;
    byId('buyerPathReview').innerHTML = view.review.map(item => `<li>${item}</li>`).join('');
    byId('buyerPathLeave').innerHTML = view.leave.map(item => `<li>${item}</li>`).join('');
  };
  buttons.forEach((button,index) => button.addEventListener('click',() => render(index)));
})();


// Website SaaS Upgrade 09 — interactive operating loop
(() => {
  const buttons = Array.from(document.querySelectorAll('[data-loop-view]'));
  if (!buttons.length) return;
  const views = [
    {kicker:'Guest demand enters the system',title:'Capture the request without losing context.',detail:'A guest call, reservation request, or event inquiry becomes a structured operating signal instead of an isolated conversation.',owner:'AI Concierge + host team',evidence:'Intent, policy, disposition',status:'Captured',type:'Guest request',event:'Anniversary dinner · party of six',eventDetail:'Waterfront preference, date flexibility, and celebration context preserved.',source:'AI Concierge',action:'Create reservation record',control:'Policy checked · escalation not required'},
    {kicker:'Context is assembled in real time',title:'Understand what the operation can support.',detail:'Reservation pace, table readiness, kitchen pressure, staffing, and guest history are evaluated together before the next action is recommended.',owner:'Restaurant Brain',evidence:'Source signals + confidence',status:'Interpreted',type:'Operating context',event:'7:30 PM arrival window tightening',eventDetail:'Three large parties, slower table turns, and elevated kitchen load detected.',source:'Live operations',action:'Assess capacity and risk',control:'Confidence 92% · manager visibility enabled'},
    {kicker:'The right team receives the next move',title:'Coordinate action without another group chat.',detail:'Blue Current routes the recommendation, owner, timing, and supporting context to the people responsible for the outcome.',owner:'Manager + service teams',evidence:'Owner, action, acknowledgement',status:'Assigned',type:'Recommended action',event:'Hold two reservation releases for 12 minutes',eventDetail:'Redeploy one host to arrivals and protect kitchen pacing during the peak window.',source:'Restaurant Brain',action:'Manager acknowledgement',control:'Human approval required · timer active'},
    {kicker:'The operation closes the loop',title:'Verify whether the intervention actually worked.',detail:'The platform compares the observed result against the expected outcome so recommendations become evidence—not just alerts.',owner:'Operations intelligence',evidence:'Action + observed outcome',status:'Verified',type:'Outcome review',event:'Arrival delay reduced by 8 minutes',eventDetail:'Kitchen pressure stabilized and reservation releases resumed without guest escalation.',source:'Service telemetry',action:'Record verified outcome',control:'Outcome linked to source decision'},
    {kicker:'Leadership sees only what matters',title:'Brief the portfolio with traceable evidence.',detail:'Executives receive exceptions, decisions, owners, and results across locations without waiting for fragmented end-of-day reporting.',owner:'Executive command',evidence:'Exception, owner, result',status:'Briefed',type:'Portfolio insight',event:'One pacing intervention worth replicating',eventDetail:'Workflow, decision evidence, and measured outcome packaged for multi-location review.',source:'Executive command',action:'Review expansion candidate',control:'Audit history available · rollout not automatic'}
  ];
  const byId = id => document.getElementById(id);
  const render = index => {
    const view = views[index];
    buttons.forEach((button,i) => { button.classList.toggle('is-active',i===index); button.setAttribute('aria-selected',String(i===index)); });
    byId('loopKicker').textContent=view.kicker; byId('loopTitle').textContent=view.title; byId('loopDetail').textContent=view.detail; byId('loopOwner').textContent=view.owner; byId('loopEvidence').textContent=view.evidence; byId('loopStatus').textContent=view.status; byId('loopEventType').textContent=view.type; byId('loopEventTitle').textContent=view.event; byId('loopEventDetail').textContent=view.eventDetail; byId('loopSource').textContent=view.source; byId('loopAction').textContent=view.action; byId('loopControl').textContent=view.control;
  };
  buttons.forEach((button,index)=>button.addEventListener('click',()=>render(index)));
})();


// Website SaaS Upgrade 10 — homepage journey navigation and conversion dock
(() => {
  const journeyLinks = Array.from(document.querySelectorAll('[data-journey-link]'));
  const sections = journeyLinks.map(link => document.getElementById(link.dataset.journeyLink)).filter(Boolean);
  if (journeyLinks.length && sections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
      if (!visible) return;
      journeyLinks.forEach(link => {
        const active = link.dataset.journeyLink === visible.target.id;
        link.classList.toggle('is-active',active);
        if (active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
      });
    },{rootMargin:'-30% 0px -55% 0px',threshold:[0,.2,.5,.8]});
    sections.forEach(section => observer.observe(section));
  }

  const dock = document.getElementById('conversionDock');
  const close = document.getElementById('conversionDockClose');
  const demo = document.getElementById('demo');
  if (!dock || !close || !demo) return;
  let dismissed = sessionStorage.getItem('bcConversionDockDismissed') === '1';
  const updateDock = () => {
    const demoTop = demo.getBoundingClientRect().top;
    const shouldShow = !dismissed && window.scrollY > Math.max(900,window.innerHeight*.9) && demoTop > window.innerHeight*.85;
    dock.classList.toggle('is-visible',shouldShow);
  };
  close.addEventListener('click',() => {
    dismissed = true;
    sessionStorage.setItem('bcConversionDockDismissed','1');
    dock.classList.remove('is-visible');
  });
  window.addEventListener('scroll',updateDock,{passive:true});
  window.addEventListener('resize',updateDock,{passive:true});
  updateDock();
})();

// WEB-011 — Platform architecture explorer
(() => {
  const buttons = [...document.querySelectorAll('[data-platform-layer]')];
  if (!buttons.length) return;
  const layers = [
    {kicker:'Guest demand and context',title:'Turn every guest interaction into structured operating context.',detail:'Calls, reservation requests, preferences, celebrations, and service recovery moments enter one connected record that can move safely across the operation.',points:['Voice and reservation intent','Guest profile and visit context','Escalations with clear ownership'],source:'Phone · Reservations · CRM',core:'Guest intelligence',output:'Context · Routing · Evidence'},
    {kicker:'Live restaurant execution',title:'Give every operator the same live operating picture.',detail:'Reservation pace, floor readiness, kitchen pressure, staffing coverage, and manager interventions remain connected as service conditions change.',points:['Live floor and pacing signals','Kitchen and workforce coordination','Manager decisions and handoffs'],source:'POS · Floor · Kitchen · Labor',core:'Operational coordination',output:'Priorities · Ownership · Action'},
    {kicker:'Portfolio intelligence',title:'Translate operating activity into leadership clarity.',detail:'Blue Current identifies exceptions, compares locations, preserves decision context, and produces concise operating briefings for regional and executive teams.',points:['Portfolio health and exceptions','Cross-location trends','Executive-ready briefing'],source:'Location events · KPIs · Outcomes',core:'Executive intelligence',output:'Risk · Opportunity · Briefing'},
    {kicker:'Governed AI and automation',title:'Allow AI to act only inside explicit operating boundaries.',detail:'Permissions, approval thresholds, audit history, versioning, and incident controls create a reliable framework for human-supervised automation.',points:['Role and policy enforcement','Human approval boundaries','Immutable evidence and recovery'],source:'Policies · Roles · Runbooks',core:'Governed autonomy',output:'Approved action · Audit · Recovery'}
  ];
  const els = {
    kicker:document.getElementById('platformLayerKicker'),title:document.getElementById('platformLayerTitle'),detail:document.getElementById('platformLayerDetail'),points:document.getElementById('platformLayerPoints'),source:document.getElementById('platformLayerSource'),core:document.getElementById('platformLayerCore'),output:document.getElementById('platformLayerOutput')
  };
  const render = index => {
    const layer = layers[index];
    buttons.forEach((button,i)=>{button.classList.toggle('is-active',i===index);button.setAttribute('aria-selected',String(i===index));});
    els.kicker.textContent=layer.kicker; els.title.textContent=layer.title; els.detail.textContent=layer.detail;
    els.points.innerHTML=layer.points.map(point=>`<li>${point}</li>`).join('');
    els.source.textContent=layer.source; els.core.textContent=layer.core; els.output.textContent=layer.output;
  };
  buttons.forEach((button,index)=>button.addEventListener('click',()=>render(index)));
})();


// WEB-012 — Solutions audience explorer
(() => {
  const buttons=[...document.querySelectorAll('[data-solution-view]')];
  if(!buttons.length)return;
  const views=[
    {kicker:'For operations leaders',title:'See pressure earlier and coordinate the next move.',detail:'Bring reservations, floor conditions, kitchen pressure, staffing, and manager decisions into one live operating picture.',outcome:'More consistent service execution',pilot:'Peak-period pacing and guest recovery',points:['One shared picture of service conditions','Clear ownership for interventions and handoffs','Measured outcomes instead of untracked alerts'],cta:'Plan an operations pilot',label:'Live service command',signal:'Arrival demand is outpacing table readiness.',signalDetail:'The system connects reservation flow, floor status, and kitchen pressure before recommending an intervention.',owner:'General manager',decision:'Adjust release pacing',control:'Human approval required',evidence:'Action and outcome linked'},
    {kicker:'For technology leaders',title:'Add intelligence without creating another disconnected system.',detail:'Connect the signals Blue Current needs, preserve existing systems of record, and keep identity, permissions, audit, reliability, and recovery visible.',outcome:'A governable operating layer',pilot:'One workflow with scoped integrations',points:['API-first connection to existing systems','Role, policy, and approval enforcement','Observable services with rollback and audit evidence'],cta:'Plan a technology review',label:'Enterprise control plane',signal:'A pilot workflow needs access to reservation and labor signals.',signalDetail:'Blue Current scopes the integration, enforces permissions, and records every automated and human decision.',owner:'Platform administrator',decision:'Approve scoped connector',control:'RBAC + policy boundary',evidence:'Versioned access and audit trail'},
    {kicker:'For executive sponsors',title:'Turn operating activity into portfolio-level clarity.',detail:'See exceptions, accountable owners, repeatable wins, and emerging risk across locations without waiting for fragmented reports.',outcome:'Faster, evidence-backed decisions',pilot:'Executive briefing for one operating domain',points:['Portfolio health and exception visibility','Location comparisons with operating context','Expansion decisions tied to measured outcomes'],cta:'Plan an executive review',label:'Executive command',signal:'Three locations show the same preventable demand-loss pattern.',signalDetail:'Blue Current packages the pattern, owner, intervention history, and expansion recommendation into one review.',owner:'Regional leadership',decision:'Approve next-location pilot',control:'Evidence threshold met',evidence:'Baseline, result, and rollout decision'}
  ];
  const ids=['Kicker','Title','Detail','Outcome','Pilot','Cta','ConsoleLabel','Signal','SignalDetail','Owner','Decision','Control','Evidence'];
  const render=i=>{const v=views[i];buttons.forEach((b,n)=>{b.classList.toggle('is-active',n===i);b.setAttribute('aria-selected',String(n===i));});ids.forEach(k=>{const el=document.getElementById('solution'+k);if(el)el.textContent=v[k.charAt(0).toLowerCase()+k.slice(1)];});const list=document.getElementById('solutionPoints');if(list)list.innerHTML=v.points.map(p=>`<li>${p}</li>`).join('');};
  buttons.forEach((b,i)=>b.addEventListener('click',()=>render(i)));
})();

// WEB-013 — Security & Trust Center control explorer
(() => {
  const buttons=[...document.querySelectorAll('[data-security-view]')];
  if(!buttons.length)return;
  const views=[
    {kicker:'Identity and access',title:'Give every user only the authority their work requires.',detail:'Role, location, session, and permission boundaries keep sensitive actions scoped to the people responsible for them.',points:['Role-based access and location scope','Session controls and permission enforcement','Administrative ownership and access history'],buyer:'Technology and security leadership',evidence:'Access decisions and permission history',consoleLabel:'Identity control plane',policy:'Regional managers can review location performance but cannot modify system policy.',policyDetail:'The platform evaluates role, location scope, requested action, and approval requirements before access is granted.',owner:'Platform administrator',enforcement:'RBAC + location scope',verification:'Session and permission check',record:'Access event preserved'},
    {kicker:'Audit evidence and integrity',title:'Connect every operating action to the reason it happened.',detail:'Blue Current preserves the source signal, policy decision, human approval, executed action, and observed outcome as linked evidence.',points:['Immutable activity and decision history','Policy, approval, and outcome linkage','Exportable evidence for review'],buyer:'Security, compliance, and operations',evidence:'Decision chain and outcome record',consoleLabel:'Evidence ledger',policy:'A pacing intervention must retain its source signal, approving owner, and measured service result.',policyDetail:'Records remain connected so leaders can reconstruct what happened without relying on screenshots or separate reports.',owner:'Workflow owner',enforcement:'Append-only evidence chain',verification:'Integrity and completeness check',record:'Decision package available'},
    {kicker:'Operational resilience',title:'Keep the operation recoverable when services or connectivity degrade.',detail:'Offline continuity, version reconciliation, observability, incident command, and runbooks create a controlled path through degraded conditions.',points:['Offline operation and safe synchronization','Service health, SLOs, and alerting','Incident ownership and recovery workflows'],buyer:'Technology and operating leadership',evidence:'Health, incident, and recovery history',consoleLabel:'Reliability command',policy:'If the reservation service degrades, locations continue approved workflows and reconcile changes when connectivity returns.',policyDetail:'The platform separates continuity from recovery so teams can keep serving guests while technical owners restore normal operation.',owner:'Incident commander',enforcement:'Runbook + service controls',verification:'Health and reconciliation check',record:'Incident timeline preserved'},
    {kicker:'Governed AI',title:'Allow AI to act only inside explicit operating boundaries.',detail:'Operating mode, confidence, value, permission, approval, and rollback requirements determine whether an AI recommendation is advisory, supervised, or eligible for bounded execution.',points:['Human approval for high-impact actions','Confidence and policy thresholds','Emergency stop, rollback, and requalification'],buyer:'Executive, operations, and security leadership',evidence:'Recommendation, approval, and result',consoleLabel:'AI governance layer',policy:'A guest recovery offer above the approved threshold requires manager authorization before execution.',policyDetail:'AI can prepare the recommendation and evidence, but authority remains with the designated human owner.',owner:'General manager',enforcement:'Policy + approval boundary',verification:'Outcome and confidence review',record:'AI action fully traceable'}
  ];
  const map={Kicker:'kicker',Title:'title',Detail:'detail',Buyer:'buyer',Evidence:'evidence',ConsoleLabel:'consoleLabel',Policy:'policy',PolicyDetail:'policyDetail',Owner:'owner',Enforcement:'enforcement',Verification:'verification',Record:'record'};
  const render=i=>{const v=views[i];buttons.forEach((b,n)=>{b.classList.toggle('is-active',n===i);b.setAttribute('aria-selected',String(n===i));});Object.entries(map).forEach(([id,key])=>{const el=document.getElementById('security'+id);if(el)el.textContent=v[key];});const list=document.getElementById('securityPoints');if(list)list.innerHTML=v.points.map(p=>`<li>${p}</li>`).join('');};
  buttons.forEach((b,i)=>b.addEventListener('click',()=>render(i)));
})();

// WEB-014 — Integration architecture explorer
(() => {
  const buttons=[...document.querySelectorAll('[data-integration-view]')];
  if(!buttons.length)return;
  const views=[
    {kicker:'Guest demand systems',title:'Turn fragmented guest signals into one coordinated demand workflow.',detail:'Connect phone, reservation, waitlist, and messaging signals so Blue Current can understand intent, preserve context, and route the next action.',points:['Reservation and waitlist events','Guest communication context','Demand conversion and recovery evidence'],pilot:'Missed-call recovery and reservation capture',ownership:'Reservation platform remains system of record',consoleLabel:'Guest demand connector',inputs:'Calls · reservations · waitlist',core:'Intent and demand orchestration',outputs:'Booking · follow-up · escalation',boundary:'Only approved guest and availability fields are used for the pilot.',evidence:'Every recommendation, human decision, and resulting reservation event is linked for review.'},
    {kicker:'Service operations systems',title:'Coordinate floor, kitchen, and commerce signals during live service.',detail:'Bring together covers, checks, table state, preparation pressure, and service milestones so managers see emerging friction before it becomes guest impact.',points:['POS and cover activity','Floor and table state','Kitchen and service-pressure signals'],pilot:'Peak-period pacing and intervention workflow',ownership:'POS and operational systems retain transaction authority',consoleLabel:'Live service connector',inputs:'Checks · covers · tables · kitchen',core:'Pressure detection and coordination',outputs:'Priority · owner · intervention',boundary:'Blue Current reads approved operating signals and routes recommendations through defined owners.',evidence:'The source condition, manager response, and observed service outcome remain connected.'},
    {kicker:'Workforce systems',title:'Match staffing decisions to the operating conditions teams are facing.',detail:'Connect schedule, attendance, role, coverage, and workload context to surface staffing gaps and coordinate manager-approved adjustments.',points:['Schedules and role assignments','Attendance and coverage','Workload and service context'],pilot:'Coverage-risk detection for one service period',ownership:'Labor platform remains system of record',consoleLabel:'Workforce connector',inputs:'Schedule · attendance · roles',core:'Coverage and workload intelligence',outputs:'Alert · reassignment · approval',boundary:'Schedule changes and labor actions remain inside explicit role and approval permissions.',evidence:'Coverage signal, approving manager, action, and operating result are preserved.'},
    {kicker:'Enterprise systems',title:'Connect portfolio structure, identity, and analytics without losing governance.',detail:'Map organizations, locations, roles, policy, and governed data outputs so Blue Current can scale across an enterprise with consistent control.',points:['Identity and organizational hierarchy','Policy and location scope','Analytics and governed data outputs'],pilot:'One region, role model, and executive briefing',ownership:'Enterprise identity and data platforms retain authority',consoleLabel:'Enterprise integration layer',inputs:'Identity · hierarchy · policy · metrics',core:'Governed portfolio intelligence',outputs:'Access · briefing · evidence package',boundary:'Identity, scope, exports, and administrative actions are enforced through enterprise policy.',evidence:'Access decisions, data lineage, briefing inputs, and leadership actions remain auditable.'}
  ];
  const map={Kicker:'kicker',Title:'title',Detail:'detail',Pilot:'pilot',Ownership:'ownership',ConsoleLabel:'consoleLabel',Inputs:'inputs',Core:'core',Outputs:'outputs',Boundary:'boundary',Evidence:'evidence'};
  const render=i=>{const v=views[i];buttons.forEach((b,n)=>{b.classList.toggle('is-active',n===i);b.setAttribute('aria-selected',String(n===i));});Object.entries(map).forEach(([id,key])=>{const el=document.getElementById('integration'+id);if(el)el.textContent=v[key];});const list=document.getElementById('integrationPoints');if(list)list.innerHTML=v.points.map(p=>`<li>${p}</li>`).join('');};
  buttons.forEach((b,i)=>b.addEventListener('click',()=>render(i)));
})();


// WEB-015 — Developers and API explorer
(() => {
  const buttons=[...document.querySelectorAll('[data-api-view]')];
  if(!buttons.length)return;
  const views=[
    {kicker:'Operating events',title:'Normalize signals from the systems already running the restaurant.',detail:'Events capture what happened, where it happened, when it happened, and the minimum approved context required for evaluation.',points:['Versioned event schemas','Idempotency and source identifiers','Location, tenant, and permission scope'],contract:'POST /v1/operating-events',boundary:'Accepted fields are limited by tenant policy',codeLabel:'Event ingestion',code:'POST /v1/operating-events\nIdempotency-Key: 61ea...\nAuthorization: Bearer ••••••\n\n{\n  "type": "service.pressure.detected",\n  "location_id": "loc_1042",\n  "severity": "elevated"\n}',result:'Validated event enters the governed workflow engine.',evidence:'The source, schema version, identity, timestamp, and evaluation result are preserved.'},
    {kicker:'Workflow orchestration',title:'Turn a validated signal into a controlled operating response.',detail:'Workflow state connects policy evaluation, intelligence, ownership, approval, execution, retry behavior, and completion.',points:['Deterministic state transitions','Human approval and policy gates','Retry, timeout, and compensation behavior'],contract:'POST /v1/workflows/{type}/runs',boundary:'Execution authority is evaluated before every action',codeLabel:'Workflow run',code:'POST /v1/workflows/guest-recovery/runs\n\n{\n  "event_id": "evt_8d21c",\n  "mode": "supervised",\n  "owner_role": "manager"\n}',result:'Workflow is created with an explicit owner and operating mode.',evidence:'Each recommendation, approval, action, retry, and completion state remains linked.'},
    {kicker:'Evidence and outcomes',title:'Reconstruct why an action happened and what changed afterward.',detail:'Evidence endpoints connect the original signal to the policy decision, human intervention, executed action, and measured operating result.',points:['Linked decision and action history','Outcome and verification records','Governed export packages'],contract:'GET /v1/evidence/{workflow_id}',boundary:'Evidence access follows role and location scope',codeLabel:'Evidence package',code:'GET /v1/evidence/wf_24a91\n\n200 OK\n{\n  "signal": "evt_8d21c",\n  "decision": "manager_approved",\n  "outcome": "reservation_created"\n}',result:'A complete review package is returned for the authorized scope.',evidence:'Data lineage, identities, timestamps, policy versions, and results are included.'},
    {kicker:'Administration and policy',title:'Manage organizations, locations, identities, and operating boundaries.',detail:'Administrative contracts define who can access the platform, where permissions apply, and which workflows may operate in advisory, supervised, or bounded modes.',points:['Organization and location hierarchy','Role and service identity mapping','Policy, threshold, and operating-mode configuration'],contract:'PUT /v1/policies/{policy_id}',boundary:'Administrative changes require privileged authority',codeLabel:'Policy update',code:'PUT /v1/policies/guest-recovery\n\n{\n  "max_offer": 40,\n  "approval_required_above": 20,\n  "mode": "supervised"\n}',result:'The new policy version is validated before activation.',evidence:'Author, prior version, changed fields, approval, and activation time are retained.'}
  ];
  const map={Kicker:'kicker',Title:'title',Detail:'detail',Contract:'contract',Boundary:'boundary',CodeLabel:'codeLabel',Code:'code',Result:'result',Evidence:'evidence'};
  const render=i=>{const v=views[i];buttons.forEach((b,n)=>{b.classList.toggle('is-active',n===i);b.setAttribute('aria-selected',String(n===i));});Object.entries(map).forEach(([id,key])=>{const el=document.getElementById('api'+id);if(el)el.textContent=v[key];});const list=document.getElementById('apiPoints');if(list)list.innerHTML=v.points.map(p=>`<li>${p}</li>`).join('');};
  buttons.forEach((b,i)=>b.addEventListener('click',()=>render(i)));
})();

// WEB-016 — About page principle explorer
(() => {
  const buttons=[...document.querySelectorAll('[data-company-principle]')];
  if(!buttons.length)return;
  const views=[
    {kicker:'Trust before autonomy',title:'AI earns authority through transparent, governed performance.',detail:'Blue Current separates advice, supervised action, and bounded automation. Higher-impact decisions remain subject to explicit policy and human ownership.',points:['Clear role and location scope','Approval boundaries for consequential actions','Decision and outcome evidence by default']},
    {kicker:'Hospitality before abstraction',title:'The product must respect how restaurants actually operate.',detail:'Workflows are designed around service periods, managers, guests, locations, pressure, handoffs, and systems of record—not generic automation diagrams.',points:['Built around real operating moments','Designed for managers under time pressure','Works with existing restaurant systems']},
    {kicker:'Evidence before expansion',title:'A pilot should prove a decision, not merely demonstrate software.',detail:'Every engagement starts with a measurable operating problem, a baseline, a named owner, a bounded workflow, and explicit expansion criteria.',points:['Baseline and target agreed up front','Interventions linked to outcomes','Expansion based on verified evidence']},
    {kicker:'Architecture before shortcuts',title:'Enterprise scale requires identity, observability, resilience, and version discipline.',detail:'Blue Current is built as an operating platform, with tenant and location scope, audit history, offline resilience, incident response, and controlled integration patterns.',points:['Multi-location and portfolio thinking','Observable and recoverable workflows','Backward-compatible, additive development']}
  ];
  const render=i=>{
    const v=views[i];
    buttons.forEach((b,n)=>{b.classList.toggle('is-active',n===i);b.setAttribute('aria-selected',String(n===i));});
    const map={companyPrincipleKicker:v.kicker,companyPrincipleTitle:v.title,companyPrincipleDetail:v.detail};
    Object.entries(map).forEach(([id,text])=>{const el=document.getElementById(id);if(el)el.textContent=text;});
    const list=document.getElementById('companyPrinciplePoints');if(list)list.innerHTML=v.points.map(p=>`<li>${p}</li>`).join('');
  };
  buttons.forEach((b,i)=>b.addEventListener('click',()=>render(i)));
})();


// WEB-020 — ROI Calculator and executive business case
(() => {
  const scenarioButtons=[...document.querySelectorAll('[data-roi-scenario]')];
  const inputList=document.getElementById('roiInputList');
  if(!scenarioButtons.length || !inputList) return;
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Math.max(0,n));
  const number=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Math.max(0,n));
  const scenarios={
    demand:{label:'Guest demand recovery',title:'Guest demand recovery',detail:'Estimate reservation value that may be recoverable when calls and requests are captured, structured, and routed consistently.',inputs:[
      {key:'volume',label:'Missed or abandoned requests per week',min:10,max:250,step:5,value:60,format:v=>number(v),hint:'Use call logs, abandoned-call data, or inquiry records during discovery.'},
      {key:'conversion',label:'Potential conversion rate',min:5,max:70,step:5,value:30,format:v=>v+'%',hint:'Share of captured requests that could become completed reservations.'},
      {key:'value',label:'Average reservation value',min:50,max:750,step:10,value:200,format:v=>money(v),hint:'Use average check × expected party size where appropriate.'}],
      calc:v=>({annual:v.volume*(v.conversion/100)*v.value*52,weekly:v.volume*(v.conversion/100),weeklyText:'reservations',weeklyLabel:'potentially recovered'}),
      meaning:'A directional estimate of recoverable guest demand—not expected revenue and not a performance guarantee.',brief:'Recover high-value guest demand with a controlled AI Concierge pilot.',metric:'recovered reservations'},
    labor:{label:'Labor coordination',title:'Labor coordination efficiency',detail:'Estimate manager and team time that may be redirected when scheduling exceptions, callouts, handoffs, and approvals are coordinated in one workflow.',inputs:[
      {key:'hours',label:'Avoidable coordination hours per location / week',min:2,max:60,step:1,value:14,format:v=>number(v)+' hrs',hint:'Estimate time spent on calls, texts, spreadsheets, and manual follow-up.'},
      {key:'locations',label:'Locations in scope',min:1,max:100,step:1,value:8,format:v=>number(v),hint:'Start with the locations included in the likely expansion decision.'},
      {key:'cost',label:'Blended hourly operating cost',min:20,max:150,step:5,value:48,format:v=>money(v),hint:'Use fully loaded manager or administrative cost where available.'}],
      calc:v=>({annual:v.hours*v.locations*v.cost*52,weekly:v.hours*v.locations,weeklyText:'hours',weeklyLabel:'potentially redirected'}),
      meaning:'A directional estimate of time value that could be redirected—not a promise of headcount reduction.',brief:'Reduce avoidable coordination work with one governed workforce workflow.',metric:'manager hours redirected'},
    service:{label:'Service pacing',title:'Service pacing protection',detail:'Estimate the economic value of protecting covers when arrival compression, table readiness, kitchen pressure, or service handoffs create preventable friction.',inputs:[
      {key:'covers',label:'At-risk covers per location / week',min:5,max:300,step:5,value:45,format:v=>number(v),hint:'Use walk-away, cancellation, comp, and service recovery patterns.'},
      {key:'locations',label:'Locations in scope',min:1,max:100,step:1,value:6,format:v=>number(v),hint:'Model only the locations likely to share the same operating workflow.'},
      {key:'margin',label:'Contribution value per protected cover',min:10,max:250,step:5,value:62,format:v=>money(v),hint:'Use contribution value rather than gross check when possible.'}],
      calc:v=>({annual:v.covers*v.locations*v.margin*52,weekly:v.covers*v.locations,weeklyText:'covers',weeklyLabel:'potentially protected'}),
      meaning:'A directional estimate of protected contribution value—not guaranteed incremental revenue.',brief:'Protect covers and guest experience with a controlled service-pacing pilot.',metric:'at-risk covers protected'},
    portfolio:{label:'Portfolio visibility',title:'Portfolio reporting efficiency',detail:'Estimate leadership and analyst time that may be redirected when exceptions, operating decisions, and results are assembled automatically across locations.',inputs:[
      {key:'hours',label:'Reporting and reconciliation hours / week',min:2,max:120,step:2,value:32,format:v=>number(v)+' hrs',hint:'Include recurring collection, reconciliation, formatting, and follow-up.'},
      {key:'leaders',label:'Leaders and analysts involved',min:1,max:40,step:1,value:6,format:v=>number(v),hint:'Count people who regularly build, validate, or interpret the same operating picture.'},
      {key:'cost',label:'Blended hourly leadership cost',min:35,max:300,step:5,value:95,format:v=>money(v),hint:'Use a consistent loaded-cost assumption for directional modeling.'}],
      calc:v=>({annual:v.hours*v.cost*52,weekly:v.hours,weeklyText:'hours',weeklyLabel:'potentially redirected'}),
      meaning:'A directional estimate of reporting and decision time—not a claim that all administrative work disappears.',brief:'Create a decision-ready portfolio briefing with traceable operating evidence.',metric:'reporting hours redirected'}
  };
  let active='demand';
  const values={}; Object.entries(scenarios).forEach(([key,s])=>values[key]=Object.fromEntries(s.inputs.map(i=>[i.key,i.value])));
  const ids=['roiPageAnnual','roiPageMonthly','roiPagePayback','roiPageScenarioLabel','roiOutputAnnual','roiOutputMonthly','roiOutputWeekly','roiOutputWeeklyLabel','roiOutputPayback','roiOutputThreeYear','roiMeaning','roiBriefTitle','roiBriefSummary','roiBriefMetric'];
  const els=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
  const pilot=document.getElementById('roiPilotCost'),pilotValue=document.getElementById('roiPilotCostValue');
  const modelTitle=document.getElementById('roiModelTitle'),modelDetail=document.getElementById('roiModelDetail');
  const update=()=>{
    const s=scenarios[active],v=values[active],result=s.calc(v),cost=Number(pilot.value),monthly=result.annual/12,payback=monthly>0?cost/monthly:0;
    const annualText=money(result.annual),monthlyText=money(monthly),paybackText=payback<.1?'< 0.1 months':number(payback)+' months';
    els.roiPageAnnual.textContent=annualText;els.roiPageMonthly.textContent=monthlyText;els.roiPagePayback.textContent=paybackText;els.roiPageScenarioLabel.textContent=s.label;els.roiOutputAnnual.textContent=annualText;els.roiOutputMonthly.textContent=monthlyText;els.roiOutputWeekly.textContent=number(result.weekly)+' '+result.weeklyText;els.roiOutputWeeklyLabel.textContent=result.weeklyLabel;els.roiOutputPayback.textContent=paybackText;els.roiOutputThreeYear.textContent=money(result.annual*3);els.roiMeaning.textContent=s.meaning;els.roiBriefTitle.textContent=s.brief;els.roiBriefSummary.textContent=`The current model indicates an illustrative annual opportunity of ${annualText}. Discovery should validate each assumption, the operating baseline, implementation cost, and workflow ownership before deployment.`;els.roiBriefMetric.textContent='Primary metric: '+s.metric;pilotValue.textContent=money(cost);
  };
  const renderInputs=()=>{
    const s=scenarios[active];modelTitle.textContent=s.title;modelDetail.textContent=s.detail;
    inputList.innerHTML=s.inputs.map(i=>`<div class="roi-input-item"><label for="roi-${active}-${i.key}"><span>${i.label}</span><b id="roi-value-${i.key}">${i.format(values[active][i.key])}</b></label><input id="roi-${active}-${i.key}" data-roi-input="${i.key}" type="range" min="${i.min}" max="${i.max}" step="${i.step}" value="${values[active][i.key]}"><small>${i.hint}</small></div>`).join('');
    inputList.querySelectorAll('[data-roi-input]').forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.roiInput;values[active][key]=Number(input.value);const cfg=scenarios[active].inputs.find(i=>i.key===key);document.getElementById('roi-value-'+key).textContent=cfg.format(Number(input.value));update();}));
    update();
  };
  scenarioButtons.forEach(button=>button.addEventListener('click',()=>{active=button.dataset.roiScenario;scenarioButtons.forEach(b=>{const selected=b===button;b.classList.toggle('is-active',selected);b.setAttribute('aria-selected',String(selected));});renderInputs();}));
  pilot.addEventListener('input',update);
  document.getElementById('roiPrint')?.addEventListener('click',()=>window.print());
  renderInputs();
})();


// WEB-021 — Public changelog filters
(() => {
  const buttons=[...document.querySelectorAll('[data-release-filter]')];
  const cards=[...document.querySelectorAll('[data-release-category]')];
  if(!buttons.length||!cards.length)return;
  const apply=(filter)=>{
    buttons.forEach(button=>{const active=button.dataset.releaseFilter===filter;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});
    cards.forEach(card=>{card.hidden=filter!=='all'&&card.dataset.releaseCategory!==filter;});
  };
  buttons.forEach(button=>button.addEventListener('click',()=>apply(button.dataset.releaseFilter)));
})();


(() => {
  "use strict";
  const root = document.querySelector(".page-product-demo");
  if (!root) return;
  const scenarios = [
    {title:"Recover a high-intent reservation request.",intro:"A guest calls during peak service while the host stand is occupied. Follow the signal from conversation to reservation and leadership evidence.",steps:[
      ["Capture","Guest intent enters one structured workflow.","AI Concierge","Incoming guest call","Party of six requests Saturday waterfront seating.","Birthday context, time flexibility, and seating preference are captured with the original request.","Host stand occupied · inventory available","Offer 7:15 PM and create the reservation.","Policy checked · no escalation required","Intent, policy, confirmation, disposition",96,"Demand recovered without adding host workload.","The reservation is confirmed, the host stand remains focused on arrivals, and leadership receives conversation-level evidence.",["Immediate","None","Confirmed"]],
      ["Understand","Match the request to live operating context.","Reservation Operations","Availability evaluation","7:15 PM protects both guest preference and arrival pacing.","Table inventory, turn timing, party size, and current service pressure are evaluated together.","Waterfront table due to turn at 6:52 PM","Reserve the table with a 15-minute arrival window.","Inventory rule and pacing threshold passed","Availability inputs and recommendation",94,"The offer fits the live service state.","Blue Current avoids promising a time that would compress arrivals or overload the dining room.",["7:15 PM","Low","Protected"]],
      ["Coordinate","Synchronize the host stand and guest confirmation.","Host team","Reservation created","Guest receives confirmation and the host stand sees the occasion context.","The request becomes a shared record rather than an isolated phone conversation.","Reservation record created","Send confirmation and surface birthday note.","Manager review not required","Reservation, message, guest context",98,"The team is aligned before the guest arrives.","Preferences and celebration details are visible to the people responsible for the experience.",["Sent","Shared","Ready"]],
      ["Verify","Preserve the outcome for operational review.","Executive Intelligence","Outcome verified","The guest confirmed and no manual recovery was required.","Leadership can compare captured demand and service quality against the pilot baseline.","Reservation remains active","Include in weekly demand-recovery scorecard.","Evidence retained for audit and review","Original call through confirmed outcome",91,"The business case becomes measurable.","The workflow produces a defensible record of demand recovered, effort avoided, and guest quality.",["1 request","0 handoffs","Verified"]]
    ]},
    {title:"Protect service pacing before pressure reaches the guest.",intro:"Arrival compression is building while kitchen and table readiness begin to diverge. Follow the intervention from detection to recovery.",steps:[
      ["Detect","Spot the service risk before it becomes visible.","Restaurant Brain","Arrival compression","The next 30-minute arrival wave is above the safe service curve.","Reservations, table readiness, kitchen throughput, and staffing coverage are compared in one state.","Arrival pace 12% above threshold","Recommend a short reservation release hold.","Recommendation only · manager approval required","Inputs, threshold, recommendation",93,"Managers see the risk early.","The operation gains time to act before wait times or ticket pressure deteriorate.",["12% high","Watch","Early"]],
      ["Decide","Translate pressure into one clear intervention.","Location manager","Pacing recommendation","Hold large-party releases for twelve minutes.","The action is sized to current kitchen load and expected table turns.","Kitchen load 84% · 3 turns due","Approve a 12-minute controlled hold.","Manager approval recorded","Approver, rationale, time window",90,"The response is specific and reversible.","The team avoids broad shutdowns and uses the smallest intervention likely to restore balance.",["12 min","1 owner","Approved"]],
      ["Coordinate","Keep reservations, floor, and kitchen aligned.","Service Coordination","Operating instruction","Release hold is visible across reservation and manager workflows.","The intervention reaches the teams that need it without relying on separate messages.","Hold active until 7:32 PM","Monitor ticket age and table readiness.","Automatic expiry enabled","Instruction, recipients, acknowledgement",95,"One decision reaches the whole operation.","Everyone works from the same temporary pacing rule and expiry time.",["3 teams","Auto-expire","Active"]],
      ["Verify","Confirm whether service pressure actually improved.","Restaurant Brain","Recovery check","Ticket age and arrival compression return to safe range.","Observed results are compared with the expected effect before the workflow is closed.","Kitchen load 71% · arrivals normalized","Close intervention and record outcome.","Outcome review completed","Before, action, after, variance",92,"The operation recovered with evidence.","Leadership can see that the intervention reduced pressure without unnecessary demand loss.",["-13 load","Normal","Verified"]]
    ]},
    {title:"Redeploy coverage without increasing scheduled labor.",intro:"The host stand needs temporary support while overall staffing remains sufficient. Follow the workforce decision from signal to verification.",steps:[
      ["Observe","See where coverage is mismatched to demand.","Workforce Operations","Coverage imbalance","Waterfront arrivals are rising while one service assistant has available capacity.","Clock-in status, role demand, section pressure, and current assignments are evaluated together.","Overall coverage 94%","Recommend a 20-minute host-support redeployment.","Role eligibility confirmed","Coverage state and eligibility",94,"The gap is visible without adding a shift.","Blue Current identifies a temporary mismatch rather than treating it as an understaffing problem.",["94%","1 gap","Eligible"]],
      ["Assign","Send the action to a named owner.","Floor manager","Redeployment task","Move one service assistant to host support until 7:40 PM.","The instruction includes duration, destination, and return condition.","Assistant available in section B","Assign temporary host support.","Manager approval and employee acknowledgement","Assignment, duration, owner",92,"The intervention is clear and bounded.","The employee and manager know exactly what changes and when the original assignment resumes.",["20 min","Named","Sent"]],
      ["Operate","Track the live effect of the redeployment.","Live Floor","Coverage update","Arrival queue begins to fall while section B remains stable.","Blue Current monitors both the target problem and the area providing temporary capacity.","Arrival wait down 4 minutes","Continue until queue reaches target.","Guardrail: section B pressure below threshold","Queue, section pressure, acknowledgement",90,"Support moves where it creates the most value.","The operation avoids solving one problem by creating another elsewhere.",["-4 min","Stable","Active"]],
      ["Verify","Close the task and preserve the staffing outcome.","Workforce Operations","Redeployment complete","Host demand normalized and the assistant returned to section B.","The result is attached to the original staffing signal for future planning.","Queue within target","Close task and include in staffing review.","Return-to-role confirmed","Signal, task, outcome, duration",95,"Labor efficiency becomes measurable.","Leadership sees whether temporary redeployment solved the issue without overtime or service degradation.",["0 OT","20 min","Verified"]]
    ]},
    {title:"Turn portfolio noise into one leadership decision queue.",intro:"Multiple locations are operating at once. Follow how Blue Current ranks exceptions and preserves accountability across the portfolio.",steps:[
      ["Aggregate","Bring location signals into one operating picture.","Executive Command","Portfolio exception","Two locations require attention; the remaining portfolio is healthy.","Guest demand, service pressure, staffing, and operational risk are normalized across locations.","4 locations · 2 active exceptions","Rank by urgency, value, confidence, and owner.","Location permissions and data scopes applied","Source signals and ranking inputs",91,"Leadership sees the moments that matter.","The portfolio view emphasizes exceptions instead of forcing executives to inspect every dashboard.",["4 sites","2 items","Ranked"]],
      ["Prioritize","Separate action from observation.","Regional manager","Decision queue","Marina Grille host coverage requires action; Harbor House kitchen pacing remains watch-only.","Each item receives urgency, confidence, expected value, and next checkpoint.","1 act now · 1 watch","Assign Marina intervention and monitor Harbor House.","Regional ownership confirmed","Priority, owner, checkpoint",93,"Attention is allocated deliberately.","Leadership can act where intervention is justified and avoid unnecessary disruption elsewhere.",["1 action","1 watch","Owned"]],
      ["Review","Inspect evidence before approving expansion.","Executive sponsor","Outcome package","The completed intervention includes signal, decision, action, and observed result.","Pilot evidence is summarized without losing access to the underlying operating record.","Outcome verified at location level","Compare against baseline and expansion criteria.","Human review required for expansion","Evidence package and recommendation",89,"Expansion decisions are evidence-led.","The executive sponsor can distinguish promising activity from a repeatable operating improvement.",["Baseline","Outcome","Review"]],
      ["Brief","Convert the operating day into executive clarity.","Executive Command","Leadership briefing","Daily brief highlights resolved issues, open risk, value opportunity, and accountable owners.","The portfolio closes the loop from live service to strategic oversight.","All checkpoints current","Publish briefing and carry open items forward.","Briefing history retained","Decisions, owners, outcomes, open risk",96,"The operating day ends with accountability.","Leaders receive a concise record of what changed, why it mattered, and what happens next.",["Resolved","2 open","Published"]]
    ]}
  ];
  const scenarioButtons=[...document.querySelectorAll("[data-demo-scenario]")], timeline=document.getElementById("demoTimeline");
  let scenarioIndex=0, stepIndex=0;
  const ids={title:"demoScenarioTitle",intro:"demoScenarioIntro",kicker:"demoStageKicker",stageTitle:"demoStageTitle",owner:"demoStageOwner",type:"demoSignalType",signal:"demoSignalTitle",detail:"demoSignalDetail",context:"demoContext",action:"demoAction",control:"demoControl",evidence:"demoEvidence",confidence:"demoConfidence",impactTitle:"demoImpactTitle",impactDetail:"demoImpactDetail"};
  function set(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
  function renderTimeline(){timeline.replaceChildren();scenarios[scenarioIndex].steps.forEach((step,i)=>{const b=document.createElement("button");b.type="button";b.className=i===stepIndex?"is-active":"";b.innerHTML=`<span>${String(i+1).padStart(2,"0")}</span><div><strong>${step[0]}</strong><small>${step[1]}</small></div>`;b.addEventListener("click",()=>{stepIndex=i;render()});timeline.append(b)})}
  function render(){const scenario=scenarios[scenarioIndex],s=scenario.steps[stepIndex];set(ids.title,scenario.title);set(ids.intro,scenario.intro);set(ids.kicker,`Step ${stepIndex+1} · ${s[0]}`);set(ids.stageTitle,s[1]);set(ids.owner,`Owner: ${s[2]}`);set(ids.type,s[3]);set(ids.signal,s[4]);set(ids.detail,s[5]);set(ids.context,s[6]);set(ids.action,s[7]);set(ids.control,s[8]);set(ids.evidence,s[9]);set(ids.confidence,`${s[10]}%`);document.getElementById("demoConfidenceBar").style.width=`${s[10]}%`;set(ids.impactTitle,s[11]);set(ids.impactDetail,s[12]);const labels=["Response","Control","Outcome"],metrics=document.getElementById("demoImpactMetrics");metrics.replaceChildren();s[13].forEach((v,i)=>{const a=document.createElement("article");a.innerHTML=`<span>${labels[i]}</span><b>${v}</b>`;metrics.append(a)});scenarioButtons.forEach((b,i)=>{b.classList.toggle("is-active",i===scenarioIndex);b.setAttribute("aria-selected",String(i===scenarioIndex))});renderTimeline();document.getElementById("demoPrevious").disabled=stepIndex===0;document.getElementById("demoNext").textContent=stepIndex===scenario.steps.length-1?"Replay scenario":"Next step"}
  scenarioButtons.forEach((b,i)=>b.addEventListener("click",()=>{scenarioIndex=i;stepIndex=0;render();document.getElementById("interactive-demo").scrollIntoView({behavior:"smooth"})}));
  document.getElementById("demoPrevious")?.addEventListener("click",()=>{if(stepIndex>0){stepIndex--;render()}});
  document.getElementById("demoNext")?.addEventListener("click",()=>{stepIndex=stepIndex===scenarios[scenarioIndex].steps.length-1?0:stepIndex+1;render()});
  render();
})();

// WEB-024 documentation navigator
(()=>{const nav=document.getElementById("docsNav");if(!nav)return;const guides=[
{label:"Getting started",k:"Getting started",t:"Platform orientation",a:"For all evaluators",s:"Understand Blue Current's operating model, product boundaries, and recommended evaluation sequence.",c:["Operating-state model","Human and AI ownership","Pilot-first deployment"],m:["Platform","Solutions","Product demo"],n:"Platform architecture",x:"See how guest, operations, intelligence, governance, and integration layers work together.",h:"platform.html"},
{label:"Platform architecture",k:"Architecture",t:"Five connected platform layers",a:"For technology and product teams",s:"Review how Blue Current connects guest signals, live operations, intelligence, controls, and existing systems.",c:["Shared operating state","Event-driven workflows","Evidence and observability"],m:["App state","Event bus","Motion engine"],n:"API overview",x:"Review the integration and event patterns used to exchange operating data.",h:"developers.html"},
{label:"Reservations",k:"Guest workflows",t:"Reservation and demand operations",a:"For guest-experience teams",s:"Understand how guest intent, availability, policies, confirmations, and recovery workflows remain connected.",c:["Intent capture","Availability and policy","Confirmation evidence"],m:["AI Concierge","Reservations","Guest history"],n:"Operations",x:"See how confirmed demand becomes a live service signal.",h:"operations.html"},
{label:"Operations",k:"Live service",t:"Floor, kitchen, and service coordination",a:"For restaurant operators",s:"Explore how service pressure, table state, kitchen pacing, staffing, and interventions move through one operating picture.",c:["Live pressure signals","Named ownership","Outcome verification"],m:["Live Floor","Kitchen Operations","Service Coordination"],n:"AI orchestration",x:"Understand how recommendations are bounded by confidence, policy, and approval.",h:"product-demo.html"},
{label:"AI orchestration",k:"Governed intelligence",t:"Recommendations with accountable control",a:"For operations and risk leaders",s:"Review how AI recommendations are scored, assigned, approved, executed, and measured without hiding human responsibility.",c:["Confidence thresholds","Approval boundaries","Evidence preservation"],m:["Restaurant Brain","Autonomous Operations","Audit Ledger"],n:"Security",x:"Review identity, permissions, audit, resilience, and governed-AI controls.",h:"trust.html"},
{label:"Integrations",k:"Connected systems",t:"Integration architecture",a:"For enterprise technology teams",s:"Map the minimum systems, data, permissions, and return paths required for a controlled deployment.",c:["API-first patterns","Scoped data exchange","No rip-and-replace"],m:["Reservations","POS and commerce","Workforce and identity"],n:"API overview",x:"Inspect illustrative event and workflow interfaces.",h:"developers.html"},
{label:"Security",k:"Trust and control",t:"Security and governance model",a:"For security and compliance teams",s:"Understand least privilege, approval controls, audit evidence, operational resilience, and incident response foundations.",c:["RBAC","Audit history","Recovery controls"],m:["Identity","Observability","Incident Command"],n:"Deployment",x:"Translate controls into a pilot review and rollout plan.",h:"trust.html"},
{label:"API overview",k:"Developers",t:"Events, workflows, and evidence interfaces",a:"For developers and integration teams",s:"Explore illustrative API patterns for receiving operating events, invoking governed workflows, and recording outcomes.",c:["Versioning","Idempotency","Permission scopes"],m:["Event ingestion","Workflow orchestration","Evidence APIs"],n:"Deployment",x:"Move from interface review to a controlled implementation plan.",h:"integrations.html"},
{label:"Deployment",k:"Implementation",t:"Pilot-to-expansion deployment model",a:"For implementation owners",s:"Define the workflow, baseline, connected systems, controls, review cadence, and evidence required for a measured pilot.",c:["Baseline definition","Minimum viable connection","Expansion criteria"],m:["Organization setup","Roles and policies","Outcome review"],n:"Request guidance",x:"Bring one workflow and receive a documented deployment path.",h:"#docs-cta"}
];const ids={k:"docsKicker",t:"docsTitle",a:"docsAudience",s:"docsSummary",n:"docsNextTitle",x:"docsNextText"};const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};function list(id,items){const e=document.getElementById(id);e.replaceChildren(...items.map(v=>{const li=document.createElement("li");li.textContent=v;return li}))}function render(i){const g=guides[i];Object.entries(ids).forEach(([key,id])=>set(id,g[key]));list("docsConcepts",g.c);list("docsModules",g.m);document.getElementById("docsNextLink").href=g.h;[...nav.children].forEach((b,j)=>b.classList.toggle("is-active",i===j))}guides.forEach((g,i)=>{const b=document.createElement("button");b.type="button";b.textContent=g.label;b.addEventListener("click",()=>render(i));nav.append(b)});render(0)})();

// WEB-025 — Pilot workspace
(()=>{const tabs=document.querySelector('#pilotRoadmapTabs');if(!tabs)return;const stages=[['Discovery','Days 1–3','Map the workflow, systems, owners, baseline, and decision criteria.'],['Environment setup','Days 4–7','Prepare minimum technical and governance foundations.'],['Workflow configuration','Week 2','Configure policies, routing, escalation, and measurement.'],['Live pilot','Week 3','Operate with daily observation and evidence capture.'],['Executive review','Week 4','Compare results with baseline and make an expansion decision.']];const lists={Objectives:['Define one operating challenge','Name accountable owners','Establish the baseline'],Deliverables:['Workflow map','Pilot charter','Success scorecard'],Stakeholders:['Executive sponsor','Operational owner','Technical lead'],Evidence:['Current-state metrics','System inventory','Decision record']};const render=(s,i)=>{pilotStageKicker.textContent=`Stage ${i+1}`;pilotStageTitle.textContent=s[0];pilotStageTiming.textContent=s[1];pilotStageSummary.textContent=s[2];pilotStageObjectives.innerHTML=lists.Objectives.map(x=>`<li>${x}</li>`).join('');pilotStageDeliverables.innerHTML=lists.Deliverables.map(x=>`<li>${x}</li>`).join('');pilotStageStakeholders.innerHTML=lists.Stakeholders.map(x=>`<li>${x}</li>`).join('');pilotStageEvidence.innerHTML=lists.Evidence.map(x=>`<li>${x}</li>`).join('');[...tabs.children].forEach((b,j)=>b.classList.toggle('is-active',j===i))};stages.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.textContent=`${String(i+1).padStart(2,'0')}  ${s[0]}`;b.onclick=()=>render(s,i);tabs.appendChild(b)});render(stages[0],0);const items=[['Operations','A named owner and one bounded workflow.'],['Technology','A technical lead and minimum system access.'],['Leadership','An executive sponsor for the expansion decision.'],['Integrations','A confirmed data path or approved fallback.'],['Security','Defined permissions, escalation, and evidence rules.']];items.forEach(([t,d])=>{const l=document.createElement('label');l.innerHTML=`<input type="checkbox" data-pilot-check><span><strong>${t}</strong><small>${d}</small></span>`;pilotChecklist.appendChild(l)});const checks=[...document.querySelectorAll('[data-pilot-check]')];const update=()=>{const p=Math.round(checks.filter(c=>c.checked).length/checks.length*100);pilotReadinessPercent.textContent=p+'%';pilotReadinessBar.style.width=p+'%';pilotReadinessMessage.textContent=p===100?'The pilot has a clear starting structure.':p>=60?'The foundation is forming. Resolve remaining gaps before launch.':'Review each item to build a responsible starting plan.'};checks.forEach(c=>c.onchange=update);pilotReset.onclick=()=>{checks.forEach(c=>c.checked=false);update()}})();


// WEB-029 — Hospitality Storyfront
(() => {
  "use strict";
  const story = document.getElementById("story");
  if (!story) return;

  const currents = [...story.querySelectorAll(".bc-current")];
  const flow = [...story.querySelectorAll(".bc-story-flow span")];

  // Make feature cards keyboard discoverable without turning them into fake buttons.
  story.querySelectorAll(".bc-feature-card").forEach(card => {
    card.setAttribute("tabindex","0");
    card.addEventListener("focus",()=>card.classList.add("is-focused"));
    card.addEventListener("blur",()=>card.classList.remove("is-focused"));
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if (!visible) return;
      currents.forEach(section => section.classList.toggle("is-current",section===visible.target));
      story.dataset.current = visible.target.id || "";
    },{rootMargin:"-22% 0px -58% 0px",threshold:[0,.15,.35]});
    currents.forEach(section => observer.observe(section));
  }

  document.documentElement.dataset.bcWebsiteStory = "WEB-029";
})();
