const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const menuButton = $(".menu-button");
const mobileNav = $(".mobile-nav");

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  mobileNav.hidden = isOpen;
});

$$(".mobile-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileNav.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
  });
});

$("#year").textContent = new Date().getFullYear();

function updateClock() {
  const now = new Date();
  $("#serviceClock").textContent = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}
updateClock();
setInterval(updateClock, 30000);

const scenes = [
  {
    status: "Incoming call",
    ai: "Good evening, thank you for calling Marina Grille. How may I help?",
    guest: "A table for four around seven-thirty, preferably outside.",
    thinking: "Listening",
    timer: "00:03",
    eventLabel: "Incoming guest request",
    eventDetail: "Reservation call answered immediately",
    eventTime: "6:42 PM"
  },
  {
    status: "Conversation live",
    ai: "Absolutely. May I have the name for the reservation?",
    guest: "Anthony Russo. We are celebrating my wife's birthday.",
    thinking: "Capturing guest details",
    timer: "00:12",
    eventLabel: "Guest context captured",
    eventDetail: "Birthday note added to reservation",
    eventTime: "6:42 PM"
  },
  {
    status: "Checking tables",
    ai: "Thank you, Anthony. I have a waterfront table available at 7:30.",
    guest: "That would be perfect.",
    thinking: "Assigning table 14",
    timer: "00:24",
    eventLabel: "Availability confirmed",
    eventDetail: "Waterfront table found for 7:30 PM",
    eventTime: "6:43 PM"
  },
  {
    status: "Confirmed",
    ai: "You are all set. I will text the confirmation now. We look forward to welcoming you.",
    guest: "Thank you.",
    thinking: "Confirmation delivered",
    timer: "00:36",
    eventLabel: "Reservation completed",
    eventDetail: "SMS sent and dining room updated",
    eventTime: "6:43 PM"
  }
];

let sceneIndex = 0;
let demoTimer = null;
let paused = false;

const targetTable = $("#targetTable");
const reservationToast = $("#reservationToast");
const smsToast = $("#smsToast");
const pauseButton = $("#pauseButton");

function animateNumber(element, from, to, duration = 650) {
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(from + (to - from) * eased);

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

function renderScene(index = sceneIndex) {
  const scene = scenes[index];

  $("#callStatus").textContent = scene.status;
  $("#aiLine").textContent = scene.ai;
  $("#guestLine").textContent = scene.guest;
  $("#thinkingText").textContent = scene.thinking;
  $("#callTimer").textContent = scene.timer;
  $("#eventLabel").textContent = scene.eventLabel;
  $("#eventDetail").textContent = scene.eventDetail;
  $("#eventTime").textContent = scene.eventTime;

  const confirmed = index === 3;

  targetTable.classList.toggle("confirmed", confirmed);
  reservationToast.classList.toggle("show", confirmed);
  smsToast.classList.toggle("show", confirmed);
  smsToast.setAttribute("aria-hidden", String(!confirmed));

  if (confirmed) {
    animateNumber($("#guestCount"), 184, 188);
    animateNumber($("#callCount"), 31, 32);
    animateNumber($("#reservationCount"), 48, 49);
    $("#occupancyLabel").textContent = "81% occupied";
    $("#reservationDelta").textContent = "+7 from last Friday";
  } else if (index === 0) {
    $("#guestCount").textContent = "184";
    $("#callCount").textContent = "31";
    $("#reservationCount").textContent = "48";
    $("#occupancyLabel").textContent = "78% occupied";
    $("#reservationDelta").textContent = "+6 from last Friday";
  }

  sceneIndex = (index + 1) % scenes.length;
}

function startDemo(reset = false) {
  clearInterval(demoTimer);

  if (reset) {
    sceneIndex = 0;
    renderScene(0);
  }

  paused = false;
  pauseButton.textContent = "Ⅱ";
  pauseButton.setAttribute("aria-label", "Pause demonstration");

  demoTimer = setInterval(() => {
    renderScene(sceneIndex);
  }, 4300);
}

function pauseDemo() {
  if (paused) {
    startDemo(false);
    return;
  }

  paused = true;
  clearInterval(demoTimer);
  pauseButton.textContent = "▶";
  pauseButton.setAttribute("aria-label", "Resume demonstration");
}

$("#replayButton").addEventListener("click", () => startDemo(true));
$("#watchDemo").addEventListener("click", () => {
  document.querySelector("#experience").scrollIntoView({ behavior: "smooth", block: "center" });
  startDemo(true);
});
pauseButton.addEventListener("click", pauseDemo);

renderScene(0);
startDemo(false);

$$(".location-item").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".location-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

$$(".reveal").forEach((element) => observer.observe(element));

const eveningScenes=[
["5:55 PM","Preparing for dinner","Before the doors open","The team begins with a clear view.","Managers see expected covers, special occasions, and reservation pacing before the first guest arrives.","☀","Service preparation","48 reservations · 184 guests expected","184","48","0","12%",[["Opening brief","Special occasions shared with host team"],["Dining room","Waterfront section prepared"],["Guest line","AI host ready"]]],
["6:08 PM","Dinner service live","A meaningful detail","A birthday becomes part of the welcome.","The guest mentions a celebration during the call. Blue Current carries that context into the host team's view.","✦","Guest occasion captured","Birthday note added for Anthony Russo","188","49","0","34%",[["Guest profile","Birthday celebration added"],["Reservation","Party of 4 confirmed for 7:30 PM"],["Host team","Arrival note shared"]]],
["6:21 PM","Waitlist beginning","The room starts filling","Demand rises without creating chaos.","The waitlist begins while incoming callers still receive immediate answers and clear expectations.","≋","Waitlist opened","3 parties waiting · 18 minute estimate","224","56","3","61%",[["Waitlist","Party of 3 added by phone"],["Guest message","Estimated wait sent by SMS"],["Manager view","Dining pace remains on target"]]],
["6:45 PM","Peak service","The dinner rush","The restaurant reaches capacity calmly.","Calls, guest expectations, and table availability remain synchronized during the busiest part of service.","●","Peak occupancy","Dining room at 96% · calls still answered","271","63","7","96%",[["Dining room","Peak capacity reached"],["Guest line","12 calls answered during rush"],["Waitlist","Average quoted wait: 24 minutes"]]],
["7:15 PM","Table opening","A new opportunity","An opening becomes a reservation.","A table turns over early. The operating view updates and the next suitable guest can be welcomed.","↗","Availability detected","Waterfront table open at 7:30 PM","286","64","5","88%",[["Table 14","Available for 7:30 PM"],["Guest line","Reservation opportunity offered"],["SMS","Confirmation delivered"]]],
["8:00 PM","Guest arrival","The promise is delivered","The host already knows why tonight matters.","Anthony arrives for the birthday dinner. The seating preference and celebration note are already waiting.","✓","Guest checked in","Anthony Russo · Birthday · Table 14","318","69","2","91%",[["Guest arrival","Anthony Russo checked in"],["Host note","Birthday celebration acknowledged"],["Dining room","Waterfront table seated"]]]
];
let eveningIndex=0,eveningTimer;
function renderEvening(i){const s=eveningScenes[i];eveningIndex=i;["#eveningTime","#eveningStatus","#eveningKicker","#eveningTitle","#eveningDescription","#eveningIcon","#eveningLabel","#eveningDetail","#eveningGuests","#eveningReservations","#eveningWaitlist","#eveningOccupancy","#eveningFeedTime"].forEach((id,n)=>$(id).textContent=[s[0],s[1],s[2],s[3],s[4],s[5],s[6],s[7],s[8],s[9],s[10],s[11],s[0]][n]);[["#feedOneLabel","#feedOneDetail"],["#feedTwoLabel","#feedTwoDetail"],["#feedThreeLabel","#feedThreeDetail"]].forEach((ids,n)=>{$(ids[0]).textContent=s[12][n][0];$(ids[1]).textContent=s[12][n][1]});$$(".evening-stop").forEach((b,n)=>b.classList.toggle("active",n===i))}
function startEvening(){clearInterval(eveningTimer);eveningTimer=setInterval(()=>renderEvening((eveningIndex+1)%eveningScenes.length),5200)}
$$(".evening-stop").forEach(b=>b.addEventListener("click",()=>{renderEvening(Number(b.dataset.eveningScene));startEvening()}));renderEvening(0);startEvening();


// V5.2 — Operator dashboard interactions
const operatorLocations = {
  "Marina Grille": {
    guests: "318",
    reservations: "69",
    calls: "54",
    waitlist: "2",
    summary: "Dinner service is pacing ahead of last Friday. Call volume increased during the 6:30–7:00 rush, but every call was answered. Waterfront availability is limited through 8:30 PM."
  },
  "The Wharfside": {
    guests: "284",
    reservations: "61",
    calls: "47",
    waitlist: "4",
    summary: "The dining room is pacing near forecast. Outdoor requests are elevated tonight, and the waitlist is averaging 16 minutes. No manager escalations are currently open."
  },
  "Rod's Tavern": {
    guests: "226",
    reservations: "48",
    calls: "39",
    waitlist: "1",
    summary: "Service is running smoothly with lighter-than-expected call volume. Two large parties are due within the next 30 minutes, and the main room remains on pace."
  },
  "Captain's Inn": {
    guests: "198",
    reservations: "42",
    calls: "36",
    waitlist: "0",
    summary: "Dinner service is steady. Private-event questions accounted for three calls tonight, all routed successfully. Current table availability remains healthy."
  }
};

$$(".operator-location-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".operator-location-tabs button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    const data = operatorLocations[button.dataset.location];
    if (!data) return;

    $("#opGuests").textContent = data.guests;
    $("#opReservations").textContent = data.reservations;
    $("#opCalls").textContent = data.calls;
    $("#opWaitlist").textContent = data.waitlist;
    $("#managerSummary").textContent = data.summary;
  });
});

$$(".operator-nav button").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".operator-nav button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});


// V5.3 — Host stand interactions
function updateHostClock() {
  const now = new Date();
  $("#hostClock").textContent = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}
updateHostClock();
setInterval(updateHostClock, 30000);

$$(".host-nav button").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".host-nav button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

$$(".host-floor-toolbar button").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".host-floor-toolbar button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

$$(".host-table").forEach((table) => {
  table.addEventListener("click", () => {
    $$(".host-table").forEach((item) => item.classList.remove("selected"));
    table.classList.add("selected");

    const number = table.dataset.table;
    const status = [...table.classList].find((name) =>
      ["available", "reserved", "seated", "cleaning"].includes(name)
    );

    $("#hostTableDetail").querySelector("strong").textContent = `Table ${number}`;
    $(".cleaning-chip").textContent = status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : "Selected";
  });
});

$$(".queue-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".queue-tabs button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    const showWaitlist = button.dataset.queue === "waitlist";
    $("#waitlistQueue").classList.toggle("hidden", !showWaitlist);
    $("#arrivalQueue").classList.toggle("hidden", showWaitlist);
  });
});

$("#addWalkIn")?.addEventListener("click", () => {
  const list = $("#waitlistQueue");
  const item = document.createElement("article");
  item.className = "queue-item";
  item.innerHTML = `
    <span class="queue-time">0m</span>
    <div><strong>New walk-in</strong><small>Party of 2 · Flexible</small></div>
    <button type="button">Seat</button>
  `;
  list.appendChild(item);

  const current = Number($("#waitlistBadge").textContent);
  $("#waitlistBadge").textContent = current + 1;
  $("#hostWaiting").textContent = current + 1;
});

$("#assignTableButton")?.addEventListener("click", () => {
  const table = $("#hostFeaturedTable");
  table.classList.remove("cleaning");
  table.classList.add("reserved", "selected");
  table.querySelector("small").textContent = "7:30";

  $(".cleaning-chip").textContent = "Reserved";
  $("#assignTableButton").textContent = "Assigned to Anthony";
  $("#hostRecommendation").textContent = "Table 14 assigned for 7:30 PM";
  $("#cleaningCount").textContent = "0";
  $("#reservedCount").textContent = "6";
});

const gs=document.getElementById('guestSearch');
if(gs){
 gs.addEventListener('input',()=>{
  const names=['Anthony Russo','Anthony Miller','Anthony Romano'];
  const q=gs.value.toLowerCase();
  document.getElementById('guestResults').innerHTML=
   names.filter(n=>n.toLowerCase().includes(q)).join('<br>');
 });
}


// V5.5 — Executive Command Center
const executiveRanges = {
  "Tonight": {
    guests: "1,026",
    reservations: "220",
    calls: "176",
    revenue: "$31.8K",
    summary: "Portfolio demand is strong and currently tracking above last Friday. Marina Grille is the only location approaching hard capacity, while Captain's Inn has additional room and may absorb overflow demand. Call coverage remains healthy across the group."
  },
  "7 Days": {
    guests: "6,942",
    reservations: "1,486",
    calls: "1,208",
    revenue: "$218K",
    summary: "Seven-day portfolio performance is ahead of the prior period. Weekend demand remains concentrated at Marina Grille and Rod's Tavern, while Captain's Inn has the greatest capacity for incremental reservations."
  },
  "30 Days": {
    guests: "28,410",
    reservations: "6,172",
    calls: "4,936",
    revenue: "$891K",
    summary: "Thirty-day demand is stable with improving call-to-reservation conversion. Guest celebrations and repeat-guest activity are strongest at Marina Grille. The largest growth opportunity is after-hours reservation capture."
  }
};

const executiveLocations = {
  "Marina Grille": {
    status: "Healthy service",
    occupancy: "98%",
    reservations: "69",
    calls: "54",
    waitlist: "2",
    narrative: "Demand is concentrated between 7:00 and 8:30 PM. Waterfront inventory is the primary constraint, but current wait times remain within the operating target."
  },
  "The Wharfside": {
    status: "Healthy service",
    occupancy: "84%",
    reservations: "61",
    calls: "47",
    waitlist: "4",
    narrative: "Demand is pacing close to forecast. Outdoor seating requests are elevated, and the current waitlist is averaging 16 minutes with no open escalations."
  },
  "Rod's Tavern": {
    status: "Watch call volume",
    occupancy: "91%",
    reservations: "48",
    calls: "39",
    waitlist: "1",
    narrative: "Dining-room performance is healthy, but incoming call volume is above the normal Friday pattern. Coverage remains intact and no calls are currently waiting."
  },
  "Captain's Inn": {
    status: "Available capacity",
    occupancy: "76%",
    reservations: "42",
    calls: "36",
    waitlist: "0",
    narrative: "The location has healthy table availability and may absorb overflow demand. Three private-event inquiries were qualified and routed to management tonight."
  }
};

document.querySelectorAll(".exec-range button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".exec-range button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    const data = executiveRanges[button.dataset.range];
    if (!data) return;

    document.getElementById("execGuests").textContent = data.guests;
    document.getElementById("execReservations").textContent = data.reservations;
    document.getElementById("execCalls").textContent = data.calls;
    document.getElementById("execRevenue").textContent = data.revenue;
    document.getElementById("execSummaryText").textContent = data.summary;
    document.getElementById("execRangeLabel").textContent = button.dataset.range;
  });
});

document.querySelectorAll(".location-performance-row").forEach((row) => {
  row.addEventListener("click", () => {
    document.querySelectorAll(".location-performance-row").forEach((item) => item.classList.remove("active"));
    row.classList.add("active");

    const location = row.dataset.location;
    const data = executiveLocations[location];
    if (!data) return;

    document.getElementById("execLocationName").textContent = location;
    document.getElementById("execLocationStatus").textContent = data.status;
    document.getElementById("execLocationOccupancy").textContent = data.occupancy;
    document.getElementById("execLocationReservations").textContent = data.reservations;
    document.getElementById("execLocationCalls").textContent = data.calls;
    document.getElementById("execLocationWaitlist").textContent = data.waitlist;
    document.getElementById("execLocationNarrative").textContent = data.narrative;
  });
});

document.getElementById("execRefresh")?.addEventListener("click", (event) => {
  const button = event.currentTarget;
  button.textContent = "Refreshing…";
  setTimeout(() => {
    button.textContent = "Refresh";
    document.getElementById("execUpdated").textContent = "just now";
  }, 650);
});


// V5.6 — Hospitality Analytics
const analyticsPeriods = {
  7: {
    conversion: "42.6%",
    answer: "8 sec",
    wait: "13 min",
    repeat: "31%",
    bookings: "1,486 bookings",
    label: "Last 7 days"
  },
  30: {
    conversion: "40.9%",
    answer: "9 sec",
    wait: "14 min",
    repeat: "29%",
    bookings: "6,172 bookings",
    label: "Last 30 days"
  },
  90: {
    conversion: "38.7%",
    answer: "10 sec",
    wait: "15 min",
    repeat: "27%",
    bookings: "18,244 bookings",
    label: "Last 90 days"
  }
};

document.querySelectorAll(".analytics-period button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".analytics-period button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    const data = analyticsPeriods[button.dataset.period];
    if (!data) return;

    document.getElementById("analyticsConversion").textContent = data.conversion;
    document.getElementById("analyticsAnswer").textContent = data.answer;
    document.getElementById("analyticsWait").textContent = data.wait;
    document.getElementById("analyticsRepeat").textContent = data.repeat;
    document.getElementById("analyticsBookings").textContent = data.bookings;
    document.getElementById("analyticsTrendLabel").textContent = data.label;
    document.getElementById("repeatRingValue").textContent = data.repeat;
  });
});

const analyticsLocationData = {
  "All locations": ["42.6%", "8 sec", "13 min", "31%"],
  "Marina Grille": ["46.2%", "7 sec", "11 min", "36%"],
  "The Wharfside": ["41.4%", "9 sec", "16 min", "29%"],
  "Rod's Tavern": ["39.8%", "8 sec", "8 min", "27%"],
  "Captain's Inn": ["43.1%", "9 sec", "0 min", "30%"]
};

document.getElementById("analyticsLocation")?.addEventListener("change", (event) => {
  const data = analyticsLocationData[event.target.value];
  if (!data) return;
  document.getElementById("analyticsConversion").textContent = data[0];
  document.getElementById("analyticsAnswer").textContent = data[1];
  document.getElementById("analyticsWait").textContent = data[2];
  document.getElementById("analyticsRepeat").textContent = data[3];
  document.getElementById("repeatRingValue").textContent = data[3];
});

document.getElementById("regenerateInsights")?.addEventListener("click", (event) => {
  const button = event.currentTarget;
  button.textContent = "Updating…";

  setTimeout(() => {
    document.getElementById("analyticsInsights").innerHTML = `
      <article>
        <span>01</span>
        <div>
          <strong>Protect the 7:30 PM inventory window</strong>
          <p>Shift flexible callers toward 6:45 PM or 8:30 PM before the peak window becomes constrained.</p>
        </div>
      </article>
      <article>
        <span>02</span>
        <div>
          <strong>Follow up on private-event inquiries faster</strong>
          <p>Qualified event inquiries have a materially higher value but currently wait longest for human follow-up.</p>
        </div>
      </article>
      <article>
        <span>03</span>
        <div>
          <strong>Use repeat-guest recognition at check-in</strong>
          <p>Premier guests respond positively when seating and celebration preferences are surfaced before arrival.</p>
        </div>
      </article>
    `;
    button.textContent = "Regenerate";
  }, 650);
});


// V6 — AI Concierge
const conciergeDemo = [
  {
    user: "I'd like to make a dinner reservation.",
    assistant: "Absolutely. May I have the name for the reservation?",
    stage: 2,
    updates: { status: "Collecting guest details" }
  },
  {
    user: "Anthony Russo.",
    assistant: "Welcome back, Anthony. I found your guest profile. What date and time would you prefer?",
    stage: 3,
    updates: { guest: "Anthony Russo", memory: true }
  },
  {
    user: "This Friday at 7:30 PM for four people.",
    assistant: "I can help with that. Are you celebrating anything, and do you have a seating preference?",
    stage: 4,
    updates: { date: "Friday, July 24", time: "7:30 PM", party: "4 guests", availability: "Checking nearby options" }
  },
  {
    user: "It's my wife's birthday. We'd love a quiet waterfront table.",
    assistant: "Thank you. Your preferred waterfront section is fully committed at 7:30 PM, but I can offer 7:15 PM at Table 14 or 8:30 PM in the waterfront section. Which would you prefer?",
    stage: 5,
    updates: { occasion: "Birthday", seating: "Quiet waterfront", availability: "7:15 PM • Table 14" }
  },
  {
    user: "7:15 PM at Table 14 works.",
    assistant: "Perfect. I have Anthony Russo for four guests this Friday at 7:15 PM at Table 14. I added the birthday note and your tree nut allergy. Shall I confirm it?",
    stage: 5,
    updates: { time: "7:15 PM", availability: "Table 14 available", ready: true }
  }
];

let conciergeStep = 0;
let conciergeAutoplayTimer = null;

function conciergeAddMessage(text, role) {
  const thread = document.getElementById("conversationThread");
  if (!thread) return;

  const article = document.createElement("article");
  article.className = `message ${role === "user" ? "user-message" : "assistant-message"}`;
  article.innerHTML = `
    <div class="message-avatar">${role === "user" ? "AR" : "BC"}</div>
    <div class="message-bubble">
      <p>${text}</p>
      <span>${role === "user" ? "Guest" : "Blue Current Concierge"} • now</span>
    </div>
  `;
  thread.appendChild(article);
  thread.scrollTop = thread.scrollHeight;
}

function conciergeSetStage(stage) {
  document.getElementById("conversationStage").textContent = `Step ${stage} of 5`;
  document.querySelectorAll(".reservation-progress span").forEach((item, index) => {
    item.classList.toggle("active", index < stage);
  });
}

function conciergeApplyUpdates(updates = {}) {
  if (updates.status) document.getElementById("reservationStatus").textContent = updates.status;
  if (updates.guest) {
    document.getElementById("reservationGuest").textContent = updates.guest;
    document.getElementById("conversationGuest").textContent = updates.guest;
  }
  if (updates.date) document.getElementById("reservationDate").textContent = updates.date;
  if (updates.time) document.getElementById("reservationTime").textContent = updates.time;
  if (updates.party) document.getElementById("reservationParty").textContent = updates.party;
  if (updates.occasion) document.getElementById("reservationOccasion").textContent = updates.occasion;
  if (updates.seating) document.getElementById("reservationSeating").textContent = updates.seating;

  if (updates.availability) {
    const card = document.getElementById("availabilityCard");
    card.querySelector("strong").textContent = updates.availability;
    card.querySelector("span").textContent = updates.ready ? "Ready" : "Live";
  }

  if (updates.memory) {
    document.getElementById("guestMemoryCard").innerHTML = `
      <div class="guest-memory-icon">✦</div>
      <div>
        <small>Guest intelligence</small>
        <strong>Anthony Russo • Premier Guest</strong>
        <p>11 visits this year • Table 14 preferred • Tree nut allergy • Cabernet preference • Birthday celebration tonight</p>
      </div>
    `;
  }

  if (updates.ready) {
    document.getElementById("reservationStatus").textContent = "Ready to confirm";
    document.getElementById("confirmReservationButton").disabled = false;
  }
}

function conciergeRunStep(step) {
  if (!conciergeDemo[step]) return;
  const item = conciergeDemo[step];

  conciergeAddMessage(item.user, "user");
  conciergeSetStage(item.stage);
  conciergeApplyUpdates(item.updates);

  setTimeout(() => {
    conciergeAddMessage(item.assistant, "assistant");
  }, 450);
}

function conciergeReset() {
  clearInterval(conciergeAutoplayTimer);
  conciergeAutoplayTimer = null;
  conciergeStep = 0;

  const thread = document.getElementById("conversationThread");
  if (thread) {
    thread.innerHTML = `
      <article class="message assistant-message">
        <div class="message-avatar">BC</div>
        <div class="message-bubble">
          <p>Good evening. Thank you for calling Marina Grille. How may I help you tonight?</p>
          <span>Blue Current Concierge • now</span>
        </div>
      </article>
    `;
  }

  document.getElementById("conversationGuest").textContent = "New reservation inquiry";
  document.getElementById("reservationStatus").textContent = "Waiting for guest";
  document.getElementById("reservationGuest").textContent = "—";
  document.getElementById("reservationDate").textContent = "—";
  document.getElementById("reservationTime").textContent = "—";
  document.getElementById("reservationParty").textContent = "—";
  document.getElementById("reservationOccasion").textContent = "—";
  document.getElementById("reservationSeating").textContent = "—";
  document.getElementById("availabilityCard").innerHTML = `
    <div><small>Availability check</small><strong>Not started</strong></div><span>—</span>
  `;
  document.getElementById("guestMemoryCard").innerHTML = `
    <div class="guest-memory-icon">✦</div>
    <div>
      <small>Guest intelligence</small>
      <strong>No guest matched yet</strong>
      <p>Preferences and visit history will appear when the guest is identified.</p>
    </div>
  `;
  document.getElementById("confirmReservationButton").disabled = true;
  document.getElementById("confirmReservationButton").textContent = "Confirm reservation";
  document.getElementById("conciergeAutoplay").textContent = "Play demo";
  conciergeSetStage(1);
}

document.querySelectorAll("#quickReplies button").forEach((button) => {
  button.addEventListener("click", () => {
    if (conciergeStep === 0 && button.dataset.reply.includes("reservation")) {
      conciergeRunStep(0);
      conciergeStep = 1;
    } else {
      conciergeAddMessage(button.dataset.reply, "user");
      setTimeout(() => {
        conciergeAddMessage("I can help with that. For this concept demo, select “Play demo” to see the full reservation workflow.", "assistant");
      }, 350);
    }
  });
});

document.getElementById("conciergeForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("conciergeInput");
  const value = input.value.trim();
  if (!value) return;

  conciergeAddMessage(value, "user");
  input.value = "";

  setTimeout(() => {
    conciergeAddMessage("Thank you. I’ve added that to the guest request. Use the demo controls to continue the full reservation flow.", "assistant");
  }, 350);
});

document.getElementById("conciergeAutoplay")?.addEventListener("click", (event) => {
  if (conciergeAutoplayTimer) {
    clearInterval(conciergeAutoplayTimer);
    conciergeAutoplayTimer = null;
    event.currentTarget.textContent = "Resume demo";
    return;
  }

  if (conciergeStep >= conciergeDemo.length) conciergeReset();
  event.currentTarget.textContent = "Pause demo";

  conciergeRunStep(conciergeStep);
  conciergeStep += 1;

  conciergeAutoplayTimer = setInterval(() => {
    if (conciergeStep >= conciergeDemo.length) {
      clearInterval(conciergeAutoplayTimer);
      conciergeAutoplayTimer = null;
      event.currentTarget.textContent = "Replay demo";
      return;
    }
    conciergeRunStep(conciergeStep);
    conciergeStep += 1;
  }, 1500);
});

document.getElementById("conciergeReset")?.addEventListener("click", conciergeReset);

document.getElementById("confirmReservationButton")?.addEventListener("click", (event) => {
  if (event.currentTarget.disabled) return;
  event.currentTarget.textContent = "Reservation confirmed ✓";
  document.getElementById("reservationStatus").textContent = "Confirmed";
  conciergeAddMessage("Your reservation is confirmed. A confirmation has been sent, and the host team has your birthday and seating notes. We look forward to welcoming you.", "assistant");
});


// V7.0 — Digital Twin shared simulation
const twinState = {
  running: false,
  speed: 1,
  step: 0,
  timer: null
};

const twinEvents = [
  {
    time:"6:42", clock:"6:42 PM", title:"Concierge answered incoming call",
    detail:"Anthony Russo requested a Friday reservation for four.",
    type:"call", occupancy:"68%", guests:"74", wait:"12 min", calls:"1",
    journey:2, brief:"Blue Current is gathering the preferred time, party size, and occasion.",
    table14:"reserved"
  },
  {
    time:"6:43", clock:"6:43 PM", title:"Guest profile matched",
    detail:"Premier guest recognized with 11 prior visits and a tree nut allergy.",
    type:"guest", occupancy:"68%", guests:"74", wait:"12 min", calls:"1",
    journey:4, brief:"Guest Intelligence matched Anthony Russo and surfaced preferences before booking.",
    table14:"reserved"
  },
  {
    time:"6:44", clock:"6:44 PM", title:"Alternative seating recovered demand",
    detail:"7:15 PM at Table 14 accepted instead of constrained 7:30 PM waterfront seating.",
    type:"alert", occupancy:"69%", guests:"74", wait:"11 min", calls:"1",
    journey:3, brief:"Blue Current offered a nearby time that protected the guest's waterfront preference.",
    table14:"reserved"
  },
  {
    time:"6:45", clock:"6:45 PM", title:"Reservation confirmed",
    detail:"Birthday, allergy, and quiet-table notes synchronized to the host stand.",
    type:"host", occupancy:"70%", guests:"74", wait:"11 min", calls:"0",
    journey:5, brief:"The reservation now appears across Concierge, Host Stand, Guest Intelligence, and the Digital Twin.",
    table14:"reserved"
  },
  {
    time:"6:53", clock:"6:53 PM", title:"Table 9 reset complete",
    detail:"Table returned to available inventory three minutes ahead of forecast.",
    type:"table", occupancy:"70%", guests:"74", wait:"9 min", calls:"0",
    journey:5, brief:"The floor plan and wait-time estimate updated from the same operational event.",
    table9:"available"
  },
  {
    time:"7:08", clock:"7:08 PM", title:"Anthony Russo checked in",
    detail:"Host greeted the party by name and confirmed the birthday note privately.",
    type:"guest", occupancy:"76%", guests:"82", wait:"14 min", calls:"2",
    journey:5, brief:"Guest recognition reached the host team before arrival.",
    table14:"reserved"
  },
  {
    time:"7:15", clock:"7:15 PM", title:"Premier party seated at Table 14",
    detail:"Service team received allergy and celebration briefing.",
    type:"table", occupancy:"82%", guests:"86", wait:"16 min", calls:"1",
    journey:5, brief:"Table 14 is seated. Leadership metrics and service alerts updated automatically.",
    table14:"seated"
  },
  {
    time:"7:32", clock:"7:32 PM", title:"Dinner rush reached peak load",
    detail:"Waterfront demand is 18% above available inventory.",
    type:"alert", occupancy:"91%", guests:"96", wait:"24 min", calls:"3",
    journey:5, brief:"Blue Current recommends shifting flexible callers toward 8:30 PM.",
    table14:"dining"
  },
  {
    time:"8:41", clock:"8:41 PM", title:"Dining room turnover accelerating",
    detail:"Four tables are expected to return within twelve minutes.",
    type:"table", occupancy:"79%", guests:"84", wait:"8 min", calls:"1",
    journey:5, brief:"The operation is moving out of peak service and into the second seating wave.",
    table14:"dining"
  },
  {
    time:"9:28", clock:"9:28 PM", title:"Birthday follow-up queued",
    detail:"Guest experience workflow prepared a personalized thank-you message.",
    type:"guest", occupancy:"58%", guests:"61", wait:"0 min", calls:"0",
    journey:5, brief:"The guest journey continues after dinner with a hospitality-first follow-up.",
    table14:"reset"
  }
];

function twinToast(title, detail){
  const stack = document.getElementById("twinToastStack");
  if(!stack) return;
  const toast = document.createElement("div");
  toast.className = "twin-toast";
  toast.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
  stack.appendChild(toast);
  setTimeout(()=>toast.remove(), 3900);
}

function setTableState(number, state){
  const table = document.querySelector(`.floor-table[data-table="${number}"]`);
  if(!table) return;
  table.classList.remove("available","reserved","seated","dining","reset");
  table.classList.add(state);
}

function updateJourney(stage, brief){
  const items = [...document.querySelectorAll("#journeyFlow article")];
  items.forEach((item,index)=>{
    item.classList.toggle("complete", index < stage-1);
    item.classList.toggle("active", index === stage-1);
  });
  const briefNode = document.querySelector("#journeyBrief span");
  if(briefNode) briefNode.textContent = brief;
  document.getElementById("journeyStatus").textContent = stage >= 5 ? "Synchronized" : "In progress";
}

function addTwinEvent(event){
  const feed = document.getElementById("eventFeed");
  if(!feed) return;
  const article = document.createElement("article");
  article.innerHTML = `<time>${event.time}</time><i class="${event.type}"></i><div><strong>${event.title}</strong><p>${event.detail}</p></div>`;
  feed.prepend(article);
  while(feed.children.length > 7) feed.lastElementChild.remove();
  document.getElementById("eventCount").textContent = `${feed.children.length} events`;
}

function applyTwinEvent(event){
  document.getElementById("twinClock").textContent = event.clock;
  document.getElementById("twinOccupancy").textContent = event.occupancy;
  document.getElementById("twinGuests").textContent = event.guests;
  document.getElementById("twinWait").textContent = event.wait;
  document.getElementById("twinCalls").textContent = event.calls;
  document.getElementById("timelineLabel").textContent = `${event.clock} · ${event.title}`;
  addTwinEvent(event);
  updateJourney(event.journey,event.brief);
  if(event.table14) setTableState(14,event.table14);
  if(event.table9) setTableState(9,event.table9);
  const pulse = document.getElementById("floorCallPulse");
  pulse?.classList.toggle("show",event.type==="call");
  twinToast(event.title,event.detail);
}

function runTwinStep(){
  const event = twinEvents[twinState.step];
  if(!event){
    stopTwinPresentation();
    document.getElementById("twinPresentation").textContent = "Replay presentation";
    twinToast("Evening story complete","The same shared events updated the dining room, guest journey, and leadership metrics.");
    return;
  }
  applyTwinEvent(event);
  document.getElementById("timelineScrubber").value = Math.round((twinState.step/(twinEvents.length-1))*100);
  twinState.step += 1;
}

function stopTwinPresentation(){
  clearInterval(twinState.timer);
  twinState.timer = null;
  twinState.running = false;
}

function startTwinPresentation(){
  if(twinState.step >= twinEvents.length) resetTwin();
  twinState.running = true;
  document.getElementById("twinPresentation").textContent = "Pause presentation";
  runTwinStep();
  twinState.timer = setInterval(runTwinStep, 1800/twinState.speed);
}

function resetTwin(){
  stopTwinPresentation();
  twinState.step = 0;
  document.getElementById("twinPresentation").textContent = "Start presentation";
  document.getElementById("twinClock").textContent = "6:42 PM";
  document.getElementById("twinGuests").textContent = "74";
  document.getElementById("twinOccupancy").textContent = "68%";
  document.getElementById("twinWait").textContent = "12 min";
  document.getElementById("twinCalls").textContent = "1";
  document.getElementById("timelineScrubber").value = "44";
  document.getElementById("timelineLabel").textContent = "6:42 PM · Dinner rush building";
  setTableState(9,"reset"); setTableState(14,"reserved");
  updateJourney(2,"Blue Current is gathering the preferred time, party size, and occasion.");
}

document.getElementById("twinPresentation")?.addEventListener("click",()=>{
  if(twinState.running){
    stopTwinPresentation();
    document.getElementById("twinPresentation").textContent = "Resume presentation";
  }else startTwinPresentation();
});
document.getElementById("twinReset")?.addEventListener("click",resetTwin);

document.querySelectorAll(".twin-speed button").forEach(button=>{
  button.addEventListener("click",()=>{
    document.querySelectorAll(".twin-speed button").forEach(b=>b.classList.remove("active"));
    button.classList.add("active");
    twinState.speed = Number(button.dataset.speed);
    if(twinState.running){ stopTwinPresentation(); startTwinPresentation(); }
  });
});

document.getElementById("timelineScrubber")?.addEventListener("input",(event)=>{
  stopTwinPresentation();
  document.getElementById("twinPresentation").textContent = "Continue presentation";
  const index = Math.min(twinEvents.length-1,Math.round((Number(event.target.value)/100)*(twinEvents.length-1)));
  twinState.step = index+1;
  applyTwinEvent(twinEvents[index]);
});

document.querySelectorAll(".floor-table").forEach(table=>{
  table.addEventListener("click",()=>{
    document.querySelectorAll(".floor-table").forEach(t=>t.classList.remove("selected"));
    table.classList.add("selected");
    const status = [...table.classList].find(c=>["available","reserved","seated","dining","reset"].includes(c));
    const detail = document.getElementById("floorDetail");
    detail.children[0].querySelector("strong").textContent = `Table ${table.dataset.table}`;
    detail.children[1].querySelector("strong").textContent = status.charAt(0).toUpperCase()+status.slice(1);
    if(table.dataset.table !== "14"){
      detail.children[2].querySelector("strong").textContent = status==="available" ? "No guest assigned" : "Current service party";
      detail.children[3].querySelector("strong").textContent = status==="available" ? "Ready for assignment" : "Service notes available";
    }else{
      detail.children[2].querySelector("strong").textContent = "Anthony Russo · Party of 4";
      detail.children[3].querySelector("strong").textContent = "Birthday · Tree nut allergy";
    }
  });
});

document.getElementById("decisionRefresh")?.addEventListener("click",()=>{
  const stack = document.getElementById("decisionStack");
  stack.innerHTML = `
    <article class="priority"><span>Act now</span><div><strong>Move one host to waterfront arrivals</strong><p>Three parties are projected to check in within seven minutes.</p></div></article>
    <article><span>Recover</span><div><strong>Offer flexible callers 8:30 PM</strong><p>Current acceptance probability is strongest for waterfront requests.</p></div></article>
    <article><span>Recognize</span><div><strong>Brief service on two celebrations</strong><p>Birthday and anniversary guests are arriving before 7:20 PM.</p></div></article>`;
  twinToast("Recommendations refreshed","Blue Current recalculated decisions from the current service state.");
});

// ----------------------------------------
// Blue Current Application Foundation
// ----------------------------------------

const eventBus = new window.BlueCurrentEventBus();

const appState = new window.BlueCurrentAppState(eventBus, {
  serviceStatus: "preparing",
  occupancyPercent: 78,
  reservations: [],
  activeGuest: null,
  activeTable: null
});

const motionEngine = new window.BlueCurrentMotionEngine();

const conciergeModule =
  window.createBlueCurrentConciergeModule(eventBus);

  const digitalTwinModule =
  window.createBlueCurrentDigitalTwinModule(eventBus);

  const executiveModule =
    window.createBlueCurrentExecutiveModule(eventBus);

// --------------------------------------------------
// Core Application Events
// --------------------------------------------------

eventBus.on("service:started", ({ serviceName, startedAt }) => {
  appState.set("serviceStatus", "live");

  console.log(`✅ ${serviceName} started at ${startedAt}.`);
});

eventBus.on("state:changed", ({ key, value }) => {
  console.log(`Blue Current state updated: ${key} =`, value);
});

// --------------------------------------------------
// Live Service Timeline Events
// --------------------------------------------------

eventBus.on("concierge:call-started", (call) => {
  console.log("📞 Incoming guest call:", call);
});

eventBus.on("reservation:created", (reservation) => {
  const reservations = appState.get("reservations");

  appState.set("reservations", [
    ...reservations,
    reservation
  ]);

  console.log("📅 Reservation created:", reservation);
});

eventBus.on("guest:recognized", (guest) => {
  appState.set("activeGuest", guest);

  console.log("👤 Guest recognized:", guest);
});

eventBus.on("table:assigned", (table) => {
  appState.set("activeTable", table);

  console.log("🍽️ Table assigned:", table);
});

eventBus.on("occupancy:updated", ({ occupancyPercent }) => {
  appState.set("occupancyPercent", occupancyPercent);

  console.log(`📊 Occupancy updated: ${occupancyPercent}%`);
});

eventBus.on("executive:updated", (metrics) => {
  console.log("📈 Executive metrics updated:", metrics);
});

// --------------------------------------------------
// Load Demo Timeline
// --------------------------------------------------

motionEngine.load(
  window.createBlueCurrentLiveServiceTimeline(eventBus)
);

// --------------------------------------------------
// Start Demo
// --------------------------------------------------

motionEngine.start();