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
