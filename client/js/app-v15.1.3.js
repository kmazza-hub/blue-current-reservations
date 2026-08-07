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

if ($("#year")) $("#year").textContent = new Date().getFullYear();

function updateClock() {
  const now = new Date();
  const serviceClock = $("#serviceClock");
  if (!serviceClock) return;
  serviceClock.textContent = now.toLocaleTimeString([], {
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

const conciergeAutoplayButton = document.getElementById("conciergeAutoplay");

conciergeAutoplayButton?.addEventListener("click", () => {
  if (conciergeAutoplayTimer) {
    clearInterval(conciergeAutoplayTimer);
    conciergeAutoplayTimer = null;
    if (conciergeAutoplayButton?.isConnected) {
      conciergeAutoplayButton.textContent = "Resume demo";
    }
    return;
  }

  if (conciergeStep >= conciergeDemo.length) conciergeReset();
  if (conciergeAutoplayButton?.isConnected) {
    conciergeAutoplayButton.textContent = "Pause demo";
  }

  conciergeRunStep(conciergeStep);
  conciergeStep += 1;

  conciergeAutoplayTimer = window.setInterval(() => {
    if (conciergeStep >= conciergeDemo.length) {
      window.clearInterval(conciergeAutoplayTimer);
      conciergeAutoplayTimer = null;
      if (conciergeAutoplayButton?.isConnected) {
        conciergeAutoplayButton.textContent = "Replay demo";
      }
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
  window.eventBus?.emit("table:presentation-state", { tableNumber: Number(number), status: state });
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
  activeTable: null,
  activeCall: null,
  guestsExpected: 1026,
  reservationsToday: 220,
  callsAnswered: 176,
  estimatedRevenue: 31800,
  executiveBrief: "Dinner service is preparing across the portfolio."
});

const motionEngine = new window.BlueCurrentMotionEngine();

// V37.1.1 startup stabilization
// Safe startup is the default. Use ?full=1 only when detailed platform centers are needed.
const startupParams = new URLSearchParams(window.location.search);
const fullPlatformStartup = startupParams.get("full") === "1";
const activatedCenters = window.BlueCurrentActivatedCenters instanceof Set ? window.BlueCurrentActivatedCenters : new Set();
const safeStartup = !fullPlatformStartup;
const ESSENTIAL_STARTUP_CENTERS = new Set([
  "unifiedCommandCenter",
  "guidedShiftCenter",
  "operatorCopilotCenter",
  "roleExperienceCenter",
  "commandActionInboxCenter",
  "shiftProfitPulseCenter",
  "featurePackLoaderCenter",
  "bootRecoveryCenter"
]);
function shouldInitializeCenter(id) {
  return Boolean(document.getElementById(id)) && (fullPlatformStartup || ESSENTIAL_STARTUP_CENTERS.has(id) || activatedCenters.has(id));
}
document.documentElement.dataset.startupMode = safeStartup ? "safe" : "full";
window.BlueCurrentStartupMode = safeStartup ? "safe" : "full";

const platform = window.BlueCurrentPlatform.create({ build: "42.17.0-live-evidence-certification", eventBus });
const startupRegistry = platform.registry;
window.BlueCurrentStartupRegistry = startupRegistry;
window.BlueCurrentPlatformRuntime = platform;
startupRegistry.register("eventBus", eventBus);
startupRegistry.register("appState", appState, ["eventBus"]);

const conciergeModule = fullPlatformStartup
  ? window.createBlueCurrentConciergeModule?.(eventBus, appState)
  : null;

const digitalTwinModule = fullPlatformStartup
  ? window.createBlueCurrentDigitalTwinModule?.(eventBus, appState)
  : null;

const executiveModule = fullPlatformStartup
  ? window.createBlueCurrentExecutiveModule?.(eventBus, appState)
  : null;

const missionControlModule = fullPlatformStartup
  ? window.createBlueCurrentMissionControlModule?.(eventBus, appState, motionEngine)
  : null;

const guestJourneyModule = fullPlatformStartup
  ? window.createBlueCurrentGuestJourneyModule?.(eventBus, appState)
  : null;

const timeMachineModule = fullPlatformStartup
  ? window.createBlueCurrentTimeMachineModule?.(eventBus, appState)
  : null;

const portfolioModeModule = fullPlatformStartup
  ? window.createBlueCurrentPortfolioModeModule?.(eventBus, appState)
  : null;

const predictiveOperationsModule = fullPlatformStartup
  ? window.createBlueCurrentPredictiveOperationsModule?.(eventBus, appState)
  : null;

const blueCurrentLiveModule = fullPlatformStartup
  ? window.createBlueCurrentLiveModule?.(eventBus, appState)
  : null;

const intelligenceNetworkModule = fullPlatformStartup
  ? window.createBlueCurrentIntelligenceNetworkModule?.(eventBus, appState)
  : null;

// The legacy autonomous module is superseded by Operations Director.
const autonomousOperationsModule = null;

const productionReadinessModule = fullPlatformStartup
  ? window.createBlueCurrentProductionReadinessModule?.(eventBus, appState)
  : null;

const cloudFoundationModule =
  startupRegistry.register(
    "cloudFoundation",
    window.createBlueCurrentCloudFoundationModule?.(eventBus, appState),
    ["eventBus", "appState"]
  );

const startupDiagnosticsModule =
  startupRegistry.register(
    "startupDiagnostics",
    window.createBlueCurrentStartupDiagnosticsModule?.(eventBus, appState),
    ["eventBus", "appState", "cloudFoundation"]
  );

const authOrganizationsModule =
  startupRegistry.register(
    "authOrganizations",
    window.createBlueCurrentAuthOrganizationsModule?.(eventBus, appState, cloudFoundationModule),
    ["eventBus", "appState", "cloudFoundation"]
  );

const liveFloorOperationsModule =
  startupRegistry.register(
    "liveFloorOperations",
    shouldInitializeCenter("live-floor-operations")
      ? window.createBlueCurrentLiveFloorOperationsModule?.(eventBus, appState, cloudFoundationModule)
      : null,
    ["eventBus", "appState", "cloudFoundation", "authOrganizations"]
  );

const reservationOperationsModule =
  startupRegistry.register(
    "reservationOperations",
    shouldInitializeCenter("reservation-operations")
      ? window.createBlueCurrentReservationOperationsModule?.(
          eventBus,
          appState,
          cloudFoundationModule,
          liveFloorOperationsModule
        )
      : null,
    ["eventBus", "appState", "cloudFoundation", "authOrganizations", "liveFloorOperations"]
  );

const staffSectionsModule =
  startupRegistry.register(
    "staffSections",
    shouldInitializeCenter("staff-sections")
      ? window.createBlueCurrentStaffSectionsModule?.(
          eventBus,
          appState,
          cloudFoundationModule,
          liveFloorOperationsModule
        )
      : null,
    ["eventBus", "appState", "cloudFoundation", "authOrganizations", "liveFloorOperations"]
  );

const kitchenCommandCenterModule = startupRegistry.register(
  "kitchenCommandCenter",
  shouldInitializeCenter("kitchen-command-center")
    ? window.createBlueCurrentKitchenCommandCenterModule?.(eventBus, appState, cloudFoundationModule)
    : null,
  ["eventBus","appState","cloudFoundation","authOrganizations"]
);

const serviceCoordinationModule = startupRegistry.register(
  "serviceCoordination",
  shouldInitializeCenter("service-coordination")
    ? window.createBlueCurrentServiceCoordinationModule?.(eventBus, appState, cloudFoundationModule)
    : null,
  ["eventBus","appState","cloudFoundation","authOrganizations","kitchenCommandCenter"]
);

const aiRestaurantBrainModule = startupRegistry.register(
  "aiRestaurantBrain",
  shouldInitializeCenter("ai-restaurant-brain")
    ? window.createBlueCurrentAiRestaurantBrainModule?.(eventBus, appState, cloudFoundationModule)
    : null,
  ["eventBus","appState","cloudFoundation","authOrganizations","serviceCoordination","kitchenCommandCenter"]
);

const unifiedCommandCenterModule = startupRegistry.register(
  "unifiedCommandCenter",
  shouldInitializeCenter("unifiedCommandCenter")
    ? window.createBlueCurrentUnifiedCommandCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState"]
);

const guidedShiftCenterModule = startupRegistry.register(
  "guidedShiftCenter",
  shouldInitializeCenter("guidedShiftCenter")
    ? window.createBlueCurrentGuidedShiftCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "unifiedCommandCenter"]
);

const operatorCopilotCenterModule = startupRegistry.register(
  "operatorCopilotCenter",
  shouldInitializeCenter("operatorCopilotCenter")
    ? window.createBlueCurrentOperatorCopilotCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "unifiedCommandCenter", "guidedShiftCenter"]
);

const roleExperienceCenterModule = startupRegistry.register(
  "roleExperienceCenter",
  shouldInitializeCenter("roleExperienceCenter")
    ? window.createBlueCurrentRoleExperienceCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "unifiedCommandCenter", "guidedShiftCenter", "operatorCopilotCenter"]
);

const commandActionInboxCenterModule = startupRegistry.register(
  "commandActionInboxCenter",
  shouldInitializeCenter("commandActionInboxCenter")
    ? window.createBlueCurrentCommandActionInboxCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "operatorCopilotCenter", "guidedShiftCenter"]
);

const shiftCloseoutCenterModule = startupRegistry.register(
  "shiftCloseoutCenter",
  shouldInitializeCenter("shiftCloseoutCenter")
    ? window.createBlueCurrentShiftCloseoutCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "commandActionInboxCenter", "guidedShiftCenter"]
);

const digitalTwinVisualizationCenterModule = startupRegistry.register(
  "digitalTwinVisualizationCenter",
  shouldInitializeCenter("digitalTwinVisualizationCenter")
    ? window.createBlueCurrentDigitalTwinVisualizationCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "unifiedCommandCenter"]
);

const executiveMorningBriefCenterModule = startupRegistry.register(
  "executiveMorningBriefCenter",
  shouldInitializeCenter("executiveMorningBriefCenter")
    ? window.createBlueCurrentExecutiveMorningBriefCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "restaurantPerformanceCenter", "outcomeIntelligenceCenter"]
);

const intelligenceGraphCenterModule = startupRegistry.register(
  "intelligenceGraphCenter",
  shouldInitializeCenter("intelligenceGraphCenter")
    ? window.createBlueCurrentIntelligenceGraphCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "unifiedCommandCenter", "digitalTwinVisualizationCenter"]
);

const predictiveOverlayCenterModule = startupRegistry.register(
  "predictiveOverlayCenter",
  shouldInitializeCenter("predictiveOverlayCenter")
    ? window.createBlueCurrentPredictiveOverlayCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "unifiedCommandCenter", "digitalTwinVisualizationCenter"]
);

const restaurantReplayCenterModule = startupRegistry.register(
  "restaurantReplayCenter",
  shouldInitializeCenter("restaurantReplayCenter")
    ? window.createBlueCurrentRestaurantReplayCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "unifiedCommandCenter"]
);

const explainableDecisionCenterModule = startupRegistry.register(
  "explainableDecisionCenter",
  shouldInitializeCenter("explainableDecisionCenter")
    ? window.createBlueCurrentExplainableDecisionCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "unifiedCommandCenter", "intelligenceGraphCenter"]
);

const crossLocationPulseCenterModule = startupRegistry.register(
  "crossLocationPulseCenter",
  shouldInitializeCenter("crossLocationPulseCenter")
    ? window.createBlueCurrentCrossLocationPulseCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "portfolioPerformanceCenter"]
);

const profitScenarioCenterModule = startupRegistry.register(
  "profitScenarioCenter",
  shouldInitializeCenter("profitScenarioCenter")
    ? window.createBlueCurrentProfitScenarioCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "restaurantPerformanceCenter", "costVarianceCenter"]
);

const smartAlertRouterCenterModule = startupRegistry.register(
  "smartAlertRouterCenter",
  shouldInitializeCenter("smartAlertRouterCenter")
    ? window.createBlueCurrentSmartAlertRouterCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "predictiveOverlayCenter", "commandActionInboxCenter"]
);

const guestRecoveryCenterModule = startupRegistry.register(
  "guestRecoveryCenter",
  shouldInitializeCenter("guestRecoveryCenter")
    ? window.createBlueCurrentGuestRecoveryCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "smartAlertRouterCenter"]
);

const laborDeploymentCenterModule = startupRegistry.register(
  "laborDeploymentCenter",
  shouldInitializeCenter("laborDeploymentCenter")
    ? window.createBlueCurrentLaborDeploymentCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "predictiveOverlayCenter"]
);

const serviceQualityCenterModule = startupRegistry.register(
  "serviceQualityCenter",
  shouldInitializeCenter("serviceQualityCenter")
    ? window.createBlueCurrentServiceQualityCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "guestRecoveryCenter", "laborDeploymentCenter"]
);

const reservationYieldCenterModule = startupRegistry.register(
  "reservationYieldCenter",
  shouldInitializeCenter("reservationYieldCenter")
    ? window.createBlueCurrentReservationYieldCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "serviceQualityCenter"]
);

const kitchenThroughputCenterModule = startupRegistry.register(
  "kitchenThroughputCenter",
  shouldInitializeCenter("kitchenThroughputCenter")
    ? window.createBlueCurrentKitchenThroughputCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "laborDeploymentCenter", "reservationYieldCenter"]
);

const shiftProfitPulseCenterModule = startupRegistry.register(
  "shiftProfitPulseCenter",
  shouldInitializeCenter("shiftProfitPulseCenter")
    ? window.createBlueCurrentShiftProfitPulseCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "reservationYieldCenter", "kitchenThroughputCenter", "serviceQualityCenter"]
);

const inventoryWasteCenterModule = startupRegistry.register(
  "inventoryWasteCenter",
  shouldInitializeCenter("inventoryWasteCenter")
    ? window.createBlueCurrentInventoryWasteCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "kitchenThroughputCenter"]
);

const menuMixCenterModule = startupRegistry.register(
  "menuMixCenter",
  shouldInitializeCenter("menuMixCenter")
    ? window.createBlueCurrentMenuMixCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "inventoryWasteCenter", "serviceQualityCenter"]
);

const dailyProfitPlanCenterModule = startupRegistry.register(
  "dailyProfitPlanCenter",
  shouldInitializeCenter("dailyProfitPlanCenter")
    ? window.createBlueCurrentDailyProfitPlanCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "menuMixCenter", "reservationYieldCenter", "kitchenThroughputCenter"]
);

const vendorPurchaseCenterModule = startupRegistry.register(
  "vendorPurchaseCenter",
  shouldInitializeCenter("vendorPurchaseCenter")
    ? window.createBlueCurrentVendorPurchaseCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "inventoryWasteCenter", "menuMixCenter"]
);

const demandPrepForecastCenterModule = startupRegistry.register(
  "demandPrepForecastCenter",
  shouldInitializeCenter("demandPrepForecastCenter")
    ? window.createBlueCurrentDemandPrepForecastCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "reservationYieldCenter", "kitchenThroughputCenter", "vendorPurchaseCenter"]
);

const profitCloseoutCenterModule = startupRegistry.register(
  "profitCloseoutCenter",
  shouldInitializeCenter("profitCloseoutCenter")
    ? window.createBlueCurrentProfitCloseoutCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "dailyProfitPlanCenter", "vendorPurchaseCenter", "demandPrepForecastCenter"]
);

const supplierVarianceCenterModule = startupRegistry.register(
  "supplierVarianceCenter",
  shouldInitializeCenter("supplierVarianceCenter")
    ? window.createBlueCurrentSupplierVarianceCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "vendorPurchaseCenter", "inventoryWasteCenter"]
);

const prepExecutionCenterModule = startupRegistry.register(
  "prepExecutionCenter",
  shouldInitializeCenter("prepExecutionCenter")
    ? window.createBlueCurrentPrepExecutionCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "demandPrepForecastCenter", "kitchenThroughputCenter"]
);

const weeklyProfitReviewCenterModule = startupRegistry.register(
  "weeklyProfitReviewCenter",
  shouldInitializeCenter("weeklyProfitReviewCenter")
    ? window.createBlueCurrentWeeklyProfitReviewCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "profitCloseoutCenter", "supplierVarianceCenter", "prepExecutionCenter"]
);

const teamCollaborationCenterModule = startupRegistry.register(
  "teamCollaborationCenter",
  shouldInitializeCenter("teamCollaborationCenter") ? window.createBlueCurrentTeamCollaborationCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "commandActionInboxCenter", "guidedShiftCenter"]
);

const enterpriseOperationsCenterModule = startupRegistry.register(
  "enterpriseOperationsCenter",
  shouldInitializeCenter("enterpriseOperationsCenter") ? window.createBlueCurrentEnterpriseOperationsCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "portfolioPerformanceCenter"]
);

const operationalKnowledgeCenterModule = startupRegistry.register(
  "operationalKnowledgeCenter",
  shouldInitializeCenter("operationalKnowledgeCenter") ? window.createBlueCurrentOperationalKnowledgeCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "serviceQualityCenter", "kitchenThroughputCenter"]
);

const experienceQualityCenterModule = startupRegistry.register(
  "experienceQualityCenter",
  shouldInitializeCenter("experienceQualityCenter") ? window.createBlueCurrentExperienceQualityCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const demoModeCenterModule = startupRegistry.register(
  "demoModeCenter",
  shouldInitializeCenter("demoModeCenter") ? window.createBlueCurrentDemoModeCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const pilotOnboardingCenterModule = startupRegistry.register(
  "pilotOnboardingCenter",
  shouldInitializeCenter("pilotOnboardingCenter") ? window.createBlueCurrentPilotOnboardingCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "experienceQualityCenter", "demoModeCenter"]
);

const operatorWorkspaceCenterModule = startupRegistry.register(
  "operatorWorkspaceCenter",
  shouldInitializeCenter("operatorWorkspaceCenter") ? window.createBlueCurrentOperatorWorkspaceCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "unifiedCommandCenter"]
);
const runtimeRecoveryCenterModule = startupRegistry.register(
  "runtimeRecoveryCenter",
  shouldInitializeCenter("runtimeRecoveryCenter") ? window.createBlueCurrentRuntimeRecoveryCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);

const featurePackLoaderCenterModule = startupRegistry.register(
  "featurePackLoaderCenter",
  shouldInitializeCenter("featurePackLoaderCenter") ? window.createBlueCurrentFeaturePackLoaderCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const startupPerformanceCenterModule = startupRegistry.register(
  "startupPerformanceCenter",
  shouldInitializeCenter("startupPerformanceCenter") ? window.createBlueCurrentStartupPerformanceCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const bootRecoveryCenterModule = startupRegistry.register(
  "bootRecoveryCenter",
  shouldInitializeCenter("bootRecoveryCenter") ? window.createBlueCurrentBootRecoveryCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "startupPerformanceCenter"]
);
const backgroundActivityGovernorCenterModule = startupRegistry.register(
  "backgroundActivityGovernorCenter",
  shouldInitializeCenter("backgroundActivityGovernorCenter") ? window.createBlueCurrentBackgroundActivityGovernorCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const startupProfileCenterModule = startupRegistry.register(
  "startupProfileCenter",
  shouldInitializeCenter("startupProfileCenter") ? window.createBlueCurrentStartupProfileCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const assetHealthCenterModule = startupRegistry.register(
  "assetHealthCenter",
  shouldInitializeCenter("assetHealthCenter") ? window.createBlueCurrentAssetHealthCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "startupPerformanceCenter"]
);
const idlePackWarmupCenterModule = startupRegistry.register(
  "idlePackWarmupCenter",
  shouldInitializeCenter("idlePackWarmupCenter") ? window.createBlueCurrentIdlePackWarmupCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "featurePackLoaderCenter"]
);
const eventStormGuardCenterModule = startupRegistry.register(
  "eventStormGuardCenter",
  shouldInitializeCenter("eventStormGuardCenter") ? window.createBlueCurrentEventStormGuardCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const renderBudgetCenterModule = startupRegistry.register(
  "renderBudgetCenter",
  shouldInitializeCenter("renderBudgetCenter") ? window.createBlueCurrentRenderBudgetCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const adaptivePackCenterModule = startupRegistry.register(
  "adaptivePackCenter",
  shouldInitializeCenter("adaptivePackCenter") ? window.createBlueCurrentAdaptivePackCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "featurePackLoaderCenter"]
);
const memoryPressureCenterModule = startupRegistry.register(
  "memoryPressureCenter",
  shouldInitializeCenter("memoryPressureCenter") ? window.createBlueCurrentMemoryPressureCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "renderBudgetCenter"]
);
const centerSuspensionCenterModule = startupRegistry.register(
  "centerSuspensionCenter",
  shouldInitializeCenter("centerSuspensionCenter") ? window.createBlueCurrentCenterSuspensionCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const networkRequestCenterModule = startupRegistry.register(
  "networkRequestCenter",
  shouldInitializeCenter("networkRequestCenter") ? window.createBlueCurrentNetworkRequestCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const stateChurnCenterModule = startupRegistry.register(
  "stateChurnCenter",
  shouldInitializeCenter("stateChurnCenter") ? window.createBlueCurrentStateChurnCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const runtimeCircuitBreakerCenterModule = startupRegistry.register(
  "runtimeCircuitBreakerCenter",
  shouldInitializeCenter("runtimeCircuitBreakerCenter") ? window.createBlueCurrentRuntimeCircuitBreakerCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "networkRequestCenter", "stateChurnCenter", "memoryPressureCenter", "renderBudgetCenter", "eventStormGuardCenter"]
);
const subscriptionLifecycleCenterModule = startupRegistry.register(
  "subscriptionLifecycleCenter",
  shouldInitializeCenter("subscriptionLifecycleCenter") ? window.createBlueCurrentSubscriptionLifecycleCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "backgroundActivityGovernorCenter"]
);
const storageFootprintCenterModule = startupRegistry.register(
  "storageFootprintCenter",
  shouldInitializeCenter("storageFootprintCenter") ? window.createBlueCurrentStorageFootprintCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const runtimeReadinessCenterModule = startupRegistry.register(
  "runtimeReadinessCenter",
  shouldInitializeCenter("runtimeReadinessCenter") ? window.createBlueCurrentRuntimeReadinessCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "startupPerformanceCenter", "assetHealthCenter", "networkRequestCenter", "stateChurnCenter", "eventStormGuardCenter", "renderBudgetCenter", "memoryPressureCenter", "subscriptionLifecycleCenter", "storageFootprintCenter"]
);
const performanceBaselineCenterModule = startupRegistry.register(
  "performanceBaselineCenter",
  shouldInitializeCenter("performanceBaselineCenter") ? window.createBlueCurrentPerformanceBaselineCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "runtimeReadinessCenter"]
);
const performanceRegressionCenterModule = startupRegistry.register(
  "performanceRegressionCenter",
  shouldInitializeCenter("performanceRegressionCenter") ? window.createBlueCurrentPerformanceRegressionCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "performanceBaselineCenter"]
);
const productionRuntimeCenterModule = startupRegistry.register(
  "productionRuntimeCenter",
  shouldInitializeCenter("productionRuntimeCenter") ? window.createBlueCurrentProductionRuntimeCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "runtimeReadinessCenter", "performanceBaselineCenter", "performanceRegressionCenter"]
);
const releaseCandidateCenterModule = startupRegistry.register(
  "releaseCandidateCenter",
  shouldInitializeCenter("releaseCandidateCenter") ? window.createBlueCurrentReleaseCandidateCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "productionRuntimeCenter", "performanceRegressionCenter"]
);
const rollbackCheckpointCenterModule = startupRegistry.register(
  "rollbackCheckpointCenter",
  shouldInitializeCenter("rollbackCheckpointCenter") ? window.createBlueCurrentRollbackCheckpointCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "releaseCandidateCenter"]
);
const productionSmokeTestCenterModule = startupRegistry.register(
  "productionSmokeTestCenter",
  shouldInitializeCenter("productionSmokeTestCenter") ? window.createBlueCurrentProductionSmokeTestCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "releaseCandidateCenter", "rollbackCheckpointCenter"]
);
const deploymentRehearsalCenterModule = startupRegistry.register(
  "deploymentRehearsalCenter",
  shouldInitializeCenter("deploymentRehearsalCenter") ? window.createBlueCurrentDeploymentRehearsalCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "productionSmokeTestCenter", "rollbackCheckpointCenter", "releaseCandidateCenter"]
);
const environmentGateCenterModule = startupRegistry.register(
  "environmentGateCenter",
  shouldInitializeCenter("environmentGateCenter") ? window.createBlueCurrentEnvironmentGateCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "productionSmokeTestCenter"]
);
const acceptanceSignoffCenterModule = startupRegistry.register(
  "acceptanceSignoffCenter",
  shouldInitializeCenter("acceptanceSignoffCenter") ? window.createBlueCurrentAcceptanceSignoffCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);

const connectorConfigurationCenterModule = startupRegistry.register(
  "connectorConfigurationCenter",
  shouldInitializeCenter("connectorConfigurationCenter") ? window.createBlueCurrentConnectorConfigurationCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const dataIntakeSandboxCenterModule = startupRegistry.register(
  "dataIntakeSandboxCenter",
  shouldInitializeCenter("dataIntakeSandboxCenter") ? window.createBlueCurrentDataIntakeSandboxCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "connectorConfigurationCenter"]
);
const pilotSignalBridgeCenterModule = startupRegistry.register(
  "pilotSignalBridgeCenter",
  shouldInitializeCenter("pilotSignalBridgeCenter") ? window.createBlueCurrentPilotSignalBridgeCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "dataIntakeSandboxCenter"]
);
const canonicalMappingCenterModule = startupRegistry.register(
  "canonicalMappingCenter",
  shouldInitializeCenter("canonicalMappingCenter") ? window.createBlueCurrentCanonicalMappingCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "dataIntakeSandboxCenter"]
);
const ingestionQueueCenterModule = startupRegistry.register(
  "ingestionQueueCenter",
  shouldInitializeCenter("ingestionQueueCenter") ? window.createBlueCurrentIngestionQueueCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "canonicalMappingCenter"]
);
const sourcePromotionCenterModule = startupRegistry.register(
  "sourcePromotionCenter",
  shouldInitializeCenter("sourcePromotionCenter") ? window.createBlueCurrentSourcePromotionCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "ingestionQueueCenter"]
);

const priorityFocusCenterModule = startupRegistry.register(
  "priorityFocusCenter",
  shouldInitializeCenter("priorityFocusCenter") ? window.createBlueCurrentPriorityFocusCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const actionOwnershipCenterModule = startupRegistry.register(
  "actionOwnershipCenter",
  shouldInitializeCenter("actionOwnershipCenter") ? window.createBlueCurrentActionOwnershipCenterModule?.(eventBus, appState) : null,
  ["eventBus"]
);
const shiftHandoffSnapshotCenterModule = startupRegistry.register(
  "shiftHandoffSnapshotCenter",
  shouldInitializeCenter("shiftHandoffSnapshotCenter") ? window.createBlueCurrentShiftHandoffSnapshotCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "priorityFocusCenter", "actionOwnershipCenter"]
);


const decisionExecutionLedgerCenterModule = startupRegistry.register(
  "decisionExecutionLedgerCenter",
  shouldInitializeCenter("decisionExecutionLedgerCenter") ? window.createBlueCurrentDecisionExecutionLedgerCenterModule?.(eventBus) : null,
  ["eventBus"]
);
const outcomeCaptureCenterModule = startupRegistry.register(
  "outcomeCaptureCenter",
  shouldInitializeCenter("outcomeCaptureCenter") ? window.createBlueCurrentOutcomeCaptureCenterModule?.(eventBus) : null,
  ["eventBus"]
);
const shiftCloseBriefCenterModule = startupRegistry.register(
  "shiftCloseBriefCenter",
  shouldInitializeCenter("shiftCloseBriefCenter") ? window.createBlueCurrentShiftCloseBriefCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "outcomeCaptureCenter", "actionOwnershipCenter"]
);


const recommendationCalibrationCenterModule = startupRegistry.register(
  "recommendationCalibrationCenter",
  shouldInitializeCenter("recommendationCalibrationCenter") ? window.createBlueCurrentRecommendationCalibrationCenterModule?.(eventBus) : null,
  ["eventBus", "outcomeCaptureCenter"]
);
const operationsLearningReviewCenterModule = startupRegistry.register(
  "operationsLearningReviewCenter",
  shouldInitializeCenter("operationsLearningReviewCenter") ? window.createBlueCurrentOperationsLearningReviewCenterModule?.(eventBus) : null,
  ["eventBus", "outcomeCaptureCenter", "actionOwnershipCenter"]
);
const nextShiftPlanCenterModule = startupRegistry.register(
  "nextShiftPlanCenter",
  shouldInitializeCenter("nextShiftPlanCenter") ? window.createBlueCurrentNextShiftPlanCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "actionOwnershipCenter", "outcomeCaptureCenter"]
);


const openingReadinessCenterModule = startupRegistry.register(
  "openingReadinessCenter",
  shouldInitializeCenter("openingReadinessCenter") ? window.createBlueCurrentOpeningReadinessCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "nextShiftPlanCenter"]
);
const shiftCheckpointCenterModule = startupRegistry.register(
  "shiftCheckpointCenter",
  shouldInitializeCenter("shiftCheckpointCenter") ? window.createBlueCurrentShiftCheckpointCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "shiftIntelligenceCenter"]
);
const dailyValueReportCenterModule = startupRegistry.register(
  "dailyValueReportCenter",
  shouldInitializeCenter("dailyValueReportCenter") ? window.createBlueCurrentDailyValueReportCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "outcomeCaptureCenter", "actionOwnershipCenter", "shiftCheckpointCenter"]
);


const serviceExceptionQueueCenterModule = startupRegistry.register(
  "serviceExceptionQueueCenter",
  shouldInitializeCenter("serviceExceptionQueueCenter") ? window.createBlueCurrentServiceExceptionQueueCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "shiftIntelligenceCenter"]
);
const escalationControlCenterModule = startupRegistry.register(
  "escalationControlCenter",
  shouldInitializeCenter("escalationControlCenter") ? window.createBlueCurrentEscalationControlCenterModule?.(eventBus) : null,
  ["eventBus", "serviceExceptionQueueCenter"]
);
const recoveryVerificationCenterModule = startupRegistry.register(
  "recoveryVerificationCenter",
  shouldInitializeCenter("recoveryVerificationCenter") ? window.createBlueCurrentRecoveryVerificationCenterModule?.(eventBus) : null,
  ["eventBus", "serviceExceptionQueueCenter", "escalationControlCenter"]
);

const incidentRootCauseCenterModule = startupRegistry.register(
  "incidentRootCauseCenter",
  shouldInitializeCenter("incidentRootCauseCenter") ? window.createBlueCurrentIncidentRootCauseCenterModule?.(eventBus) : null,
  ["eventBus", "recoveryVerificationCenter"]
);
const correctiveActionPlanCenterModule = startupRegistry.register(
  "correctiveActionPlanCenter",
  shouldInitializeCenter("correctiveActionPlanCenter") ? window.createBlueCurrentCorrectiveActionPlanCenterModule?.(eventBus) : null,
  ["eventBus", "incidentRootCauseCenter"]
);
const exceptionTrendReviewCenterModule = startupRegistry.register(
  "exceptionTrendReviewCenter",
  shouldInitializeCenter("exceptionTrendReviewCenter") ? window.createBlueCurrentExceptionTrendReviewCenterModule?.(eventBus) : null,
  ["eventBus", "incidentRootCauseCenter", "correctiveActionPlanCenter"]
);


const standardWorkLinkageCenterModule = startupRegistry.register(
  "standardWorkLinkageCenter",
  shouldInitializeCenter("standardWorkLinkageCenter") ? window.createBlueCurrentStandardWorkLinkageCenterModule?.(eventBus) : null,
  ["eventBus", "incidentRootCauseCenter", "correctiveActionPlanCenter"]
);
const trainingAssignmentCenterModule = startupRegistry.register(
  "trainingAssignmentCenter",
  shouldInitializeCenter("trainingAssignmentCenter") ? window.createBlueCurrentTrainingAssignmentCenterModule?.(eventBus) : null,
  ["eventBus", "standardWorkLinkageCenter"]
);
const preventionVerificationCenterModule = startupRegistry.register(
  "preventionVerificationCenter",
  shouldInitializeCenter("preventionVerificationCenter") ? window.createBlueCurrentPreventionVerificationCenterModule?.(eventBus) : null,
  ["eventBus", "correctiveActionPlanCenter", "trainingAssignmentCenter"]
);


const aipToolRegistryCenterModule = startupRegistry.register(
  "aipToolRegistryCenter",
  shouldInitializeCenter("aipToolRegistryCenter") ? window.createBlueCurrentAIPToolRegistryCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const aipAgentRuntimeCenterModule = startupRegistry.register(
  "aipAgentRuntimeCenter",
  shouldInitializeCenter("aipAgentRuntimeCenter") ? window.createBlueCurrentAIPAgentRuntimeCenterModule?.(eventBus) : null,
  ["eventBus", "aipToolRegistryCenter"]
);
const aipPromptOrchestratorCenterModule = startupRegistry.register(
  "aipPromptOrchestratorCenter",
  shouldInitializeCenter("aipPromptOrchestratorCenter") ? window.createBlueCurrentAIPPromptOrchestratorCenterModule?.(eventBus) : null,
  ["eventBus", "aipToolRegistryCenter", "aipAgentRuntimeCenter"]
);


const aipGovernanceCenterModule = startupRegistry.register(
  "aipGovernanceCenter",
  shouldInitializeCenter("aipGovernanceCenter") ? window.createBlueCurrentAIPGovernanceCenterModule?.(eventBus) : null,
  ["eventBus", "aipToolRegistryCenter"]
);
const aipMissionControlCenterModule = startupRegistry.register(
  "aipMissionControlCenter",
  shouldInitializeCenter("aipMissionControlCenter") ? window.createBlueCurrentAIPMissionControlCenterModule?.(eventBus) : null,
  ["eventBus", "aipAgentRuntimeCenter", "aipGovernanceCenter"]
);
const aipApprovalQueueCenterModule = startupRegistry.register(
  "aipApprovalQueueCenter",
  shouldInitializeCenter("aipApprovalQueueCenter") ? window.createBlueCurrentAIPApprovalQueueCenterModule?.(eventBus) : null,
  ["eventBus", "aipPromptOrchestratorCenter", "aipGovernanceCenter"]
);
const aipContextGraphCenterModule = startupRegistry.register(
  "aipContextGraphCenter",
  shouldInitializeCenter("aipContextGraphCenter") ? window.createBlueCurrentAIPContextGraphCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "aipAgentRuntimeCenter"]
);
const aipMemoryVaultCenterModule = startupRegistry.register(
  "aipMemoryVaultCenter",
  shouldInitializeCenter("aipMemoryVaultCenter") ? window.createBlueCurrentAIPMemoryVaultCenterModule?.(eventBus) : null,
  ["eventBus", "aipAgentRuntimeCenter"]
);
const aipScenarioLabCenterModule = startupRegistry.register(
  "aipScenarioLabCenter",
  shouldInitializeCenter("aipScenarioLabCenter") ? window.createBlueCurrentAIPScenarioLabCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "aipContextGraphCenter"]
);
const aipAgentBuilderCenterModule = startupRegistry.register(
  "aipAgentBuilderCenter",
  shouldInitializeCenter("aipAgentBuilderCenter") ? window.createBlueCurrentAIPAgentBuilderCenterModule?.(eventBus) : null,
  ["eventBus", "aipToolRegistryCenter"]
);
const aipEvaluationCenterModule = startupRegistry.register(
  "aipEvaluationCenter",
  shouldInitializeCenter("aipEvaluationCenter") ? window.createBlueCurrentAIPEvaluationCenterModule?.(eventBus) : null,
  ["eventBus", "aipAgentRuntimeCenter"]
);
const aipRunbookCompilerCenterModule = startupRegistry.register(
  "aipRunbookCompilerCenter",
  shouldInitializeCenter("aipRunbookCompilerCenter") ? window.createBlueCurrentAIPRunbookCompilerCenterModule?.(eventBus) : null,
  ["eventBus", "aipPromptOrchestratorCenter"]
);
const aipPromptLibraryCenterModule = startupRegistry.register(
  "aipPromptLibraryCenter",
  shouldInitializeCenter("aipPromptLibraryCenter") ? window.createBlueCurrentAIPPromptLibraryCenterModule?.(eventBus) : null,
  ["eventBus", "aipAgentBuilderCenter"]
);
const aipDeploymentControlCenterModule = startupRegistry.register(
  "aipDeploymentControlCenter",
  shouldInitializeCenter("aipDeploymentControlCenter") ? window.createBlueCurrentAIPDeploymentControlCenterModule?.(eventBus) : null,
  ["eventBus", "aipAgentBuilderCenter", "aipEvaluationCenter"]
);
const aipObservabilityCenterModule = startupRegistry.register(
  "aipObservabilityCenter",
  shouldInitializeCenter("aipObservabilityCenter") ? window.createBlueCurrentAIPObservabilityCenterModule?.(eventBus) : null,
  ["eventBus", "aipAgentRuntimeCenter", "aipDeploymentControlCenter"]
);

const aipKnowledgeSourceCenterModule = startupRegistry.register(
  "aipKnowledgeSourceCenter",
  shouldInitializeCenter("aipKnowledgeSourceCenter") ? window.createBlueCurrentAIPKnowledgeSourceCenterModule?.(eventBus) : null,
  ["eventBus", "aipPromptLibraryCenter"]
);
const aipModelRoutingCenterModule = startupRegistry.register(
  "aipModelRoutingCenter",
  shouldInitializeCenter("aipModelRoutingCenter") ? window.createBlueCurrentAIPModelRoutingCenterModule?.(eventBus) : null,
  ["eventBus", "aipGovernanceCenter"]
);
const aipSafetyTestCenterModule = startupRegistry.register(
  "aipSafetyTestCenter",
  shouldInitializeCenter("aipSafetyTestCenter") ? window.createBlueCurrentAIPSafetyTestCenterModule?.(eventBus) : null,
  ["eventBus", "aipKnowledgeSourceCenter", "aipModelRoutingCenter", "aipGovernanceCenter"]
);


const aipEvidenceLedgerCenterModule = startupRegistry.register(
  "aipEvidenceLedgerCenter",
  shouldInitializeCenter("aipEvidenceLedgerCenter") ? window.createBlueCurrentAIPEvidenceLedgerCenterModule?.(eventBus) : null,
  ["eventBus", "aipAgentRuntimeCenter", "aipObservabilityCenter"]
);
const aipUsageBudgetCenterModule = startupRegistry.register(
  "aipUsageBudgetCenter",
  shouldInitializeCenter("aipUsageBudgetCenter") ? window.createBlueCurrentAIPUsageBudgetCenterModule?.(eventBus) : null,
  ["eventBus", "aipModelRoutingCenter", "aipObservabilityCenter"]
);
const aipControlRoomCenterModule = startupRegistry.register(
  "aipControlRoomCenter",
  shouldInitializeCenter("aipControlRoomCenter") ? window.createBlueCurrentAIPControlRoomCenterModule?.(eventBus) : null,
  ["eventBus", "aipSafetyTestCenter", "aipKnowledgeSourceCenter", "aipEvidenceLedgerCenter", "aipUsageBudgetCenter", "aipDeploymentControlCenter"]
);


const aipActionSandboxCenterModule = startupRegistry.register(
  "aipActionSandboxCenter",
  shouldInitializeCenter("aipActionSandboxCenter") ? window.createBlueCurrentAIPActionSandboxCenterModule?.(eventBus) : null,
  ["eventBus", "aipApprovalQueueCenter", "aipGovernanceCenter"]
);
const aipQualityScorecardCenterModule = startupRegistry.register(
  "aipQualityScorecardCenter",
  shouldInitializeCenter("aipQualityScorecardCenter") ? window.createBlueCurrentAIPQualityScorecardCenterModule?.(eventBus) : null,
  ["eventBus", "aipEvaluationCenter", "aipSafetyTestCenter", "aipEvidenceLedgerCenter", "aipObservabilityCenter"]
);
const aipReleaseCertificationCenterModule = startupRegistry.register(
  "aipReleaseCertificationCenter",
  shouldInitializeCenter("aipReleaseCertificationCenter") ? window.createBlueCurrentAIPReleaseCertificationCenterModule?.(eventBus) : null,
  ["eventBus", "aipControlRoomCenter", "aipQualityScorecardCenter", "aipActionSandboxCenter", "aipSafetyTestCenter"]
);

const aipTaskDelegationCenterModule = startupRegistry.register(
  "aipTaskDelegationCenter",
  shouldInitializeCenter("aipTaskDelegationCenter") ? window.createBlueCurrentAIPTaskDelegationCenterModule?.(eventBus) : null,
  ["eventBus", "aipApprovalQueueCenter"]
);
const aipCollaborationTranscriptCenterModule = startupRegistry.register(
  "aipCollaborationTranscriptCenter",
  shouldInitializeCenter("aipCollaborationTranscriptCenter") ? window.createBlueCurrentAIPCollaborationTranscriptCenterModule?.(eventBus) : null,
  ["eventBus", "aipAgentRuntimeCenter", "aipMissionControlCenter", "aipTaskDelegationCenter"]
);
const aipPilotLaunchCenterModule = startupRegistry.register(
  "aipPilotLaunchCenter",
  shouldInitializeCenter("aipPilotLaunchCenter") ? window.createBlueCurrentAIPPilotLaunchCenterModule?.(eventBus) : null,
  ["eventBus", "aipReleaseCertificationCenter", "aipSafetyTestCenter", "aipDeploymentControlCenter", "aipTaskDelegationCenter"]
);

const aipPilotObservationCenterModule = startupRegistry.register(
  "aipPilotObservationCenter",
  shouldInitializeCenter("aipPilotObservationCenter") ? window.createBlueCurrentAIPPilotObservationCenterModule?.(eventBus) : null,
  ["eventBus", "aipPilotLaunchCenter"]
);
const aipHumanFeedbackCenterModule = startupRegistry.register(
  "aipHumanFeedbackCenter",
  shouldInitializeCenter("aipHumanFeedbackCenter") ? window.createBlueCurrentAIPHumanFeedbackCenterModule?.(eventBus) : null,
  ["eventBus", "aipAgentRuntimeCenter"]
);
const aipLearningLoopCenterModule = startupRegistry.register(
  "aipLearningLoopCenter",
  shouldInitializeCenter("aipLearningLoopCenter") ? window.createBlueCurrentAIPLearningLoopCenterModule?.(eventBus) : null,
  ["eventBus", "aipPilotObservationCenter", "aipHumanFeedbackCenter", "aipEvaluationCenter"]
);

const aipImprovementBacklogCenterModule = startupRegistry.register(
  "aipImprovementBacklogCenter",
  shouldInitializeCenter("aipImprovementBacklogCenter") ? window.createBlueCurrentAIPImprovementBacklogCenterModule?.(eventBus) : null,
  ["eventBus", "aipLearningLoopCenter", "aipHumanFeedbackCenter", "aipEvaluationCenter"]
);
const aipPromptExperimentCenterModule = startupRegistry.register(
  "aipPromptExperimentCenter",
  shouldInitializeCenter("aipPromptExperimentCenter") ? window.createBlueCurrentAIPPromptExperimentCenterModule?.(eventBus) : null,
  ["eventBus", "aipPromptLibraryCenter", "aipEvaluationCenter"]
);
const aipLearningReleaseGateCenterModule = startupRegistry.register(
  "aipLearningReleaseGateCenter",
  shouldInitializeCenter("aipLearningReleaseGateCenter") ? window.createBlueCurrentAIPLearningReleaseGateCenterModule?.(eventBus) : null,
  ["eventBus", "aipImprovementBacklogCenter", "aipPromptExperimentCenter", "aipSafetyTestCenter", "aipLearningLoopCenter"]
);


const aipCommandConsoleCenterModule = startupRegistry.register(
  "aipCommandConsoleCenter",
  shouldInitializeCenter("aipCommandConsoleCenter") ? window.createBlueCurrentAIPCommandConsoleCenterModule?.(eventBus) : null,
  ["eventBus", "aipAgentRuntimeCenter", "aipModelRoutingCenter"]
);
const aipExecutionPlanCenterModule = startupRegistry.register(
  "aipExecutionPlanCenter",
  shouldInitializeCenter("aipExecutionPlanCenter") ? window.createBlueCurrentAIPExecutionPlanCenterModule?.(eventBus) : null,
  ["eventBus", "aipCommandConsoleCenter", "aipApprovalQueueCenter"]
);
const aipOutcomeReviewCenterModule = startupRegistry.register(
  "aipOutcomeReviewCenter",
  shouldInitializeCenter("aipOutcomeReviewCenter") ? window.createBlueCurrentAIPOutcomeReviewCenterModule?.(eventBus) : null,
  ["eventBus", "aipExecutionPlanCenter", "aipHumanFeedbackCenter"]
);


const aipPolicyComposerCenterModule = startupRegistry.register(
  "aipPolicyComposerCenter",
  shouldInitializeCenter("aipPolicyComposerCenter") ? window.createBlueCurrentAIPPolicyComposerCenterModule?.(eventBus) : null,
  ["eventBus", "aipGovernanceCenter", "aipPromptLibraryCenter"]
);
const aipToolGatewayCenterModule = startupRegistry.register(
  "aipToolGatewayCenter",
  shouldInitializeCenter("aipToolGatewayCenter") ? window.createBlueCurrentAIPToolGatewayCenterModule?.(eventBus) : null,
  ["eventBus", "aipToolRegistryCenter", "aipKnowledgeSourceCenter"]
);
const aipRunSchedulerCenterModule = startupRegistry.register(
  "aipRunSchedulerCenter",
  shouldInitializeCenter("aipRunSchedulerCenter") ? window.createBlueCurrentAIPRunSchedulerCenterModule?.(eventBus) : null,
  ["eventBus", "aipExecutionPlanCenter", "aipApprovalQueueCenter", "aipPolicyComposerCenter", "aipToolGatewayCenter"]
);
const aipPolicyEnforcementCenterModule = startupRegistry.register(
  "aipPolicyEnforcementCenter",
  shouldInitializeCenter("aipPolicyEnforcementCenter") ? window.createBlueCurrentAIPPolicyEnforcementCenterModule?.(eventBus) : null,
  ["eventBus", "aipPolicyComposerCenter"]
);
const aipExecutionQueueCenterModule = startupRegistry.register(
  "aipExecutionQueueCenter",
  shouldInitializeCenter("aipExecutionQueueCenter") ? window.createBlueCurrentAIPExecutionQueueCenterModule?.(eventBus) : null,
  ["eventBus", "aipExecutionPlanCenter", "aipApprovalQueueCenter", "aipPolicyEnforcementCenter"]
);
const aipAutonomyBoundaryCenterModule = startupRegistry.register(
  "aipAutonomyBoundaryCenter",
  shouldInitializeCenter("aipAutonomyBoundaryCenter") ? window.createBlueCurrentAIPAutonomyBoundaryCenterModule?.(eventBus) : null,
  ["eventBus", "aipPolicyEnforcementCenter", "aipExecutionQueueCenter", "aipToolGatewayCenter", "aipRunSchedulerCenter"]
);


const hospitalityOntologyCenterModule = startupRegistry.register(
  "hospitalityOntologyCenter",
  shouldInitializeCenter("hospitalityOntologyCenter") ? window.createBlueCurrentHospitalityOntologyCenterModule?.(eventBus) : null,
  ["eventBus"]
);
const decisionObjectCenterModule = startupRegistry.register(
  "decisionObjectCenter",
  shouldInitializeCenter("decisionObjectCenter") ? window.createBlueCurrentDecisionObjectCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "hospitalityOntologyCenter"]
);
const causalDecisionTraceCenterModule = startupRegistry.register(
  "causalDecisionTraceCenter",
  shouldInitializeCenter("causalDecisionTraceCenter") ? window.createBlueCurrentCausalDecisionTraceCenterModule?.(eventBus) : null,
  ["eventBus", "decisionObjectCenter"]
);
const relationshipGraphCenterModule = startupRegistry.register(
  "relationshipGraphCenter",
  shouldInitializeCenter("relationshipGraphCenter") ? window.createBlueCurrentRelationshipGraphCenterModule?.(eventBus) : null,
  ["eventBus", "hospitalityOntologyCenter"]
);
const contextResolutionCenterModule = startupRegistry.register(
  "contextResolutionCenter",
  shouldInitializeCenter("contextResolutionCenter") ? window.createBlueCurrentContextResolutionCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "relationshipGraphCenter", "decisionObjectCenter"]
);
const decisionDependencyCenterModule = startupRegistry.register(
  "decisionDependencyCenter",
  shouldInitializeCenter("decisionDependencyCenter") ? window.createBlueCurrentDecisionDependencyCenterModule?.(eventBus) : null,
  ["eventBus", "decisionObjectCenter", "relationshipGraphCenter", "contextResolutionCenter"]
);

const operationalReasoningCenterModule = startupRegistry.register(
  "operationalReasoningCenter",
  shouldInitializeCenter("operationalReasoningCenter") ? window.createBlueCurrentOperationalReasoningCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "contextResolutionCenter", "decisionDependencyCenter"]
);
const counterfactualAnalysisCenterModule = startupRegistry.register(
  "counterfactualAnalysisCenter",
  shouldInitializeCenter("counterfactualAnalysisCenter") ? window.createBlueCurrentCounterfactualAnalysisCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "operationalReasoningCenter"]
);
const multiStepPlanCenterModule = startupRegistry.register(
  "multiStepPlanCenter",
  shouldInitializeCenter("multiStepPlanCenter") ? window.createBlueCurrentMultiStepPlanCenterModule?.(eventBus) : null,
  ["eventBus", "operationalReasoningCenter", "counterfactualAnalysisCenter", "decisionDependencyCenter"]
);


const operationalTwinCenterModule = startupRegistry.register(
  "operationalTwinCenter",
  shouldInitializeCenter("operationalTwinCenter") ? window.createBlueCurrentOperationalTwinCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "relationshipGraphCenter", "contextResolutionCenter"]
);
const constraintPropagationCenterModule = startupRegistry.register(
  "constraintPropagationCenter",
  shouldInitializeCenter("constraintPropagationCenter") ? window.createBlueCurrentConstraintPropagationCenterModule?.(eventBus) : null,
  ["eventBus", "operationalTwinCenter", "counterfactualAnalysisCenter", "decisionDependencyCenter"]
);
const planVerificationCenterModule = startupRegistry.register(
  "planVerificationCenter",
  shouldInitializeCenter("planVerificationCenter") ? window.createBlueCurrentPlanVerificationCenterModule?.(eventBus) : null,
  ["eventBus", "multiStepPlanCenter", "operationalTwinCenter", "constraintPropagationCenter"]
);


const operationalMemoryCenterModule = startupRegistry.register(
  "operationalMemoryCenter",
  shouldInitializeCenter("operationalMemoryCenter") ? window.createBlueCurrentOperationalMemoryCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "operationalTwinCenter"]
);
const decisionHorizonForecastCenterModule = startupRegistry.register(
  "decisionHorizonForecastCenter",
  shouldInitializeCenter("decisionHorizonForecastCenter") ? window.createBlueCurrentDecisionHorizonForecastCenterModule?.(eventBus) : null,
  ["eventBus", "operationalMemoryCenter", "constraintPropagationCenter"]
);
const executiveReasoningBriefCenterModule = startupRegistry.register(
  "executiveReasoningBriefCenter",
  shouldInitializeCenter("executiveReasoningBriefCenter") ? window.createBlueCurrentExecutiveReasoningBriefCenterModule?.(eventBus) : null,
  ["eventBus", "operationalReasoningCenter", "multiStepPlanCenter", "planVerificationCenter", "decisionHorizonForecastCenter"]
);

const portfolioReasoningCenterModule = startupRegistry.register(
  "portfolioReasoningCenter",
  shouldInitializeCenter("portfolioReasoningCenter") ? window.createBlueCurrentPortfolioReasoningCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "executiveReasoningBriefCenter"]
);
const decisionLeverageCenterModule = startupRegistry.register(
  "decisionLeverageCenter",
  shouldInitializeCenter("decisionLeverageCenter") ? window.createBlueCurrentDecisionLeverageCenterModule?.(eventBus) : null,
  ["eventBus", "decisionDependencyCenter", "portfolioReasoningCenter"]
);
const portfolioCoordinationPlanCenterModule = startupRegistry.register(
  "portfolioCoordinationPlanCenter",
  shouldInitializeCenter("portfolioCoordinationPlanCenter") ? window.createBlueCurrentPortfolioCoordinationPlanCenterModule?.(eventBus) : null,
  ["eventBus", "portfolioReasoningCenter", "decisionLeverageCenter", "executiveReasoningBriefCenter"]
);

const enterpriseConstraintCenterModule = startupRegistry.register(
  "enterpriseConstraintCenter",
  shouldInitializeCenter("enterpriseConstraintCenter") ? window.createBlueCurrentEnterpriseConstraintCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "portfolioReasoningCenter", "decisionDependencyCenter"]
);
const coordinatedScenarioCenterModule = startupRegistry.register(
  "coordinatedScenarioCenter",
  shouldInitializeCenter("coordinatedScenarioCenter") ? window.createBlueCurrentCoordinatedScenarioCenterModule?.(eventBus) : null,
  ["eventBus", "enterpriseConstraintCenter", "portfolioReasoningCenter"]
);
const coordinationGateCenterModule = startupRegistry.register(
  "coordinationGateCenter",
  shouldInitializeCenter("coordinationGateCenter") ? window.createBlueCurrentCoordinationGateCenterModule?.(eventBus) : null,
  ["eventBus", "enterpriseConstraintCenter", "coordinatedScenarioCenter", "portfolioCoordinationPlanCenter", "planVerificationCenter"]
);

const coordinationExecutionCenterModule = startupRegistry.register(
  "coordinationExecutionCenter",
  shouldInitializeCenter("coordinationExecutionCenter") ? window.createBlueCurrentCoordinationExecutionCenterModule?.(eventBus) : null,
  ["eventBus", "coordinationGateCenter", "portfolioCoordinationPlanCenter"]
);
const enterpriseOutcomeCenterModule = startupRegistry.register(
  "enterpriseOutcomeCenter",
  shouldInitializeCenter("enterpriseOutcomeCenter") ? window.createBlueCurrentEnterpriseOutcomeCenterModule?.(eventBus) : null,
  ["eventBus", "coordinationExecutionCenter", "portfolioReasoningCenter", "enterpriseConstraintCenter"]
);
const v41CertificationCenterModule = startupRegistry.register(
  "v41CertificationCenter",
  shouldInitializeCenter("v41CertificationCenter") ? window.createBlueCurrentV41CertificationCenterModule?.(eventBus) : null,
  ["eventBus", "hospitalityOntologyCenter", "coordinationGateCenter", "enterpriseOutcomeCenter", "executiveReasoningBriefCenter"]
);

const reasoningBenchmarkCenterModule = startupRegistry.register(
  "reasoningBenchmarkCenter",
  shouldInitializeCenter("reasoningBenchmarkCenter") ? window.createBlueCurrentReasoningBenchmarkCenterModule?.(eventBus) : null,
  ["eventBus", "v41CertificationCenter", "operationalReasoningCenter", "decisionHorizonForecastCenter", "planVerificationCenter", "enterpriseOutcomeCenter"]
);
const reasoningDriftCenterModule = startupRegistry.register(
  "reasoningDriftCenter",
  shouldInitializeCenter("reasoningDriftCenter") ? window.createBlueCurrentReasoningDriftCenterModule?.(eventBus) : null,
  ["eventBus", "reasoningBenchmarkCenter", "operationalMemoryCenter"]
);
const reasoningImprovementGateCenterModule = startupRegistry.register(
  "reasoningImprovementGateCenter",
  shouldInitializeCenter("reasoningImprovementGateCenter") ? window.createBlueCurrentReasoningImprovementGateCenterModule?.(eventBus) : null,
  ["eventBus", "v41CertificationCenter", "reasoningBenchmarkCenter", "reasoningDriftCenter"]
);


const adaptiveStrategyCenterModule = startupRegistry.register(
  "adaptiveStrategyCenter",
  shouldInitializeCenter("adaptiveStrategyCenter") ? window.createBlueCurrentAdaptiveStrategyCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "operationalReasoningCenter", "decisionHorizonForecastCenter", "enterpriseConstraintCenter"]
);
const decisionTradeoffCenterModule = startupRegistry.register(
  "decisionTradeoffCenter",
  shouldInitializeCenter("decisionTradeoffCenter") ? window.createBlueCurrentDecisionTradeoffCenterModule?.(eventBus) : null,
  ["eventBus", "adaptiveStrategyCenter"]
);
const executiveWorkspaceCenterModule = startupRegistry.register(
  "executiveWorkspaceCenter",
  shouldInitializeCenter("executiveWorkspaceCenter") ? window.createBlueCurrentExecutiveWorkspaceCenterModule?.(eventBus) : null,
  ["eventBus", "adaptiveStrategyCenter", "decisionTradeoffCenter", "executiveReasoningBriefCenter", "planVerificationCenter", "reasoningImprovementGateCenter"]
);

const predictiveOptimizationCenterModule = startupRegistry.register(
  "predictiveOptimizationCenter",
  shouldInitializeCenter("predictiveOptimizationCenter") ? window.createBlueCurrentPredictiveOptimizationCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "adaptiveStrategyCenter", "decisionTradeoffCenter", "decisionHorizonForecastCenter"]
);
const agentNegotiationCenterModule = startupRegistry.register(
  "agentNegotiationCenter",
  shouldInitializeCenter("agentNegotiationCenter") ? window.createBlueCurrentAgentNegotiationCenterModule?.(eventBus) : null,
  ["eventBus", "predictiveOptimizationCenter", "operationalReasoningCenter"]
);
const v41ProductionReadinessCenterModule = startupRegistry.register(
  "v41ProductionReadinessCenter",
  shouldInitializeCenter("v41ProductionReadinessCenter") ? window.createBlueCurrentV41ProductionReadinessCenterModule?.(eventBus) : null,
  ["eventBus", "v41CertificationCenter", "reasoningBenchmarkCenter", "reasoningDriftCenter", "predictiveOptimizationCenter", "agentNegotiationCenter"]
);

const decisionRuntimeCenterModule = startupRegistry.register(
  "decisionRuntimeCenter",
  shouldInitializeCenter("decisionRuntimeCenter") ? window.createBlueCurrentDecisionRuntimeCenterModule?.(eventBus) : null,
  ["eventBus", "v41ProductionReadinessCenter", "predictiveOptimizationCenter", "agentNegotiationCenter", "executiveWorkspaceCenter"]
);
const interventionRehearsalCenterModule = startupRegistry.register(
  "interventionRehearsalCenter",
  shouldInitializeCenter("interventionRehearsalCenter") ? window.createBlueCurrentInterventionRehearsalCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "decisionRuntimeCenter", "multiStepPlanCenter"]
);
const v41PilotCertificationCenterModule = startupRegistry.register(
  "v41PilotCertificationCenter",
  shouldInitializeCenter("v41PilotCertificationCenter") ? window.createBlueCurrentV41PilotCertificationCenterModule?.(eventBus) : null,
  ["eventBus", "v41ProductionReadinessCenter", "decisionRuntimeCenter", "interventionRehearsalCenter", "reasoningBenchmarkCenter"]
);

const pilotDecisionTelemetryCenterModule = startupRegistry.register(
  "pilotDecisionTelemetryCenter",
  shouldInitializeCenter("pilotDecisionTelemetryCenter") ? window.createBlueCurrentPilotDecisionTelemetryCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "v41PilotCertificationCenter", "decisionRuntimeCenter", "interventionRehearsalCenter"]
);
const reasoningOutcomeLearningCenterModule = startupRegistry.register(
  "reasoningOutcomeLearningCenter",
  shouldInitializeCenter("reasoningOutcomeLearningCenter") ? window.createBlueCurrentReasoningOutcomeLearningCenterModule?.(eventBus) : null,
  ["eventBus", "pilotDecisionTelemetryCenter", "predictiveOptimizationCenter", "reasoningBenchmarkCenter"]
);
const v41EnterpriseReleaseCenterModule = startupRegistry.register(
  "v41EnterpriseReleaseCenter",
  shouldInitializeCenter("v41EnterpriseReleaseCenter") ? window.createBlueCurrentV41EnterpriseReleaseCenterModule?.(eventBus) : null,
  ["eventBus", "v41PilotCertificationCenter", "pilotDecisionTelemetryCenter", "reasoningOutcomeLearningCenter", "v41ProductionReadinessCenter", "reasoningDriftCenter"]
);
const enterpriseDecisionConsoleCenterModule = startupRegistry.register(
  "enterpriseDecisionConsoleCenter",
  shouldInitializeCenter("enterpriseDecisionConsoleCenter") ? window.createBlueCurrentEnterpriseDecisionConsoleCenterModule?.(eventBus) : null,
  ["eventBus", "v41EnterpriseReleaseCenter", "pilotDecisionTelemetryCenter", "reasoningOutcomeLearningCenter", "decisionRuntimeCenter", "predictiveOptimizationCenter"]
);
const evidenceReconciliationCenterModule = startupRegistry.register(
  "evidenceReconciliationCenter",
  shouldInitializeCenter("evidenceReconciliationCenter") ? window.createBlueCurrentEvidenceReconciliationCenterModule?.(eventBus) : null,
  ["eventBus", "v41EnterpriseReleaseCenter", "enterpriseDecisionConsoleCenter", "pilotDecisionTelemetryCenter", "reasoningOutcomeLearningCenter"]
);
const v41ClosureCertificationCenterModule = startupRegistry.register(
  "v41ClosureCertificationCenter",
  shouldInitializeCenter("v41ClosureCertificationCenter") ? window.createBlueCurrentV41ClosureCertificationCenterModule?.(eventBus) : null,
  ["eventBus", "v41EnterpriseReleaseCenter", "enterpriseDecisionConsoleCenter", "evidenceReconciliationCenter", "reasoningBenchmarkCenter", "reasoningDriftCenter"]
);


const liveConnectorRuntimeCenterModule = startupRegistry.register(
  "liveConnectorRuntimeCenter",
  shouldInitializeCenter("liveConnectorRuntimeCenter") ? window.createBlueCurrentLiveConnectorRuntimeCenterModule?.(eventBus) : null,
  ["eventBus"]
);
const canonicalEventGatewayCenterModule = startupRegistry.register(
  "canonicalEventGatewayCenter",
  shouldInitializeCenter("canonicalEventGatewayCenter") ? window.createBlueCurrentCanonicalEventGatewayCenterModule?.(eventBus) : null,
  ["eventBus", "liveConnectorRuntimeCenter"]
);
const liveSourceHealthCenterModule = startupRegistry.register(
  "liveSourceHealthCenter",
  shouldInitializeCenter("liveSourceHealthCenter") ? window.createBlueCurrentLiveSourceHealthCenterModule?.(eventBus) : null,
  ["eventBus", "liveConnectorRuntimeCenter", "canonicalEventGatewayCenter"]
);
const eventContractRegistryCenterModule = startupRegistry.register(
  "eventContractRegistryCenter",
  shouldInitializeCenter("eventContractRegistryCenter") ? window.createBlueCurrentEventContractRegistryCenterModule?.(eventBus) : null,
  ["eventBus", "liveConnectorRuntimeCenter"]
);
const eventRecoveryCenterModule = startupRegistry.register(
  "eventRecoveryCenter",
  shouldInitializeCenter("eventRecoveryCenter") ? window.createBlueCurrentEventRecoveryCenterModule?.(eventBus) : null,
  ["eventBus", "eventContractRegistryCenter"]
);
const liveOperationsBridgeCenterModule = startupRegistry.register(
  "liveOperationsBridgeCenter",
  shouldInitializeCenter("liveOperationsBridgeCenter") ? window.createBlueCurrentLiveOperationsBridgeCenterModule?.(eventBus, appState) : null,
  ["eventBus", "canonicalEventGatewayCenter", "eventContractRegistryCenter"]
);

const sourceAdapterRegistryCenterModule = startupRegistry.register(
  "sourceAdapterRegistryCenter",
  shouldInitializeCenter("sourceAdapterRegistryCenter") ? window.createBlueCurrentSourceAdapterRegistryCenterModule?.(eventBus) : null,
  ["eventBus", "liveConnectorRuntimeCenter", "eventContractRegistryCenter"]
);
const deliveryAssuranceCenterModule = startupRegistry.register(
  "deliveryAssuranceCenter",
  shouldInitializeCenter("deliveryAssuranceCenter") ? window.createBlueCurrentDeliveryAssuranceCenterModule?.(eventBus) : null,
  ["eventBus", "eventRecoveryCenter", "sourceAdapterRegistryCenter"]
);
const ingestionObservabilityCenterModule = startupRegistry.register(
  "ingestionObservabilityCenter",
  shouldInitializeCenter("ingestionObservabilityCenter") ? window.createBlueCurrentIngestionObservabilityCenterModule?.(eventBus) : null,
  ["eventBus", "deliveryAssuranceCenter", "liveSourceHealthCenter"]
);

const sourceCheckpointCenterModule = startupRegistry.register(
  "sourceCheckpointCenter",
  shouldInitializeCenter("sourceCheckpointCenter") ? window.createBlueCurrentSourceCheckpointCenterModule?.(eventBus) : null,
  ["eventBus", "ingestionObservabilityCenter"]
);
const replayWindowCenterModule = startupRegistry.register(
  "replayWindowCenter",
  shouldInitializeCenter("replayWindowCenter") ? window.createBlueCurrentReplayWindowCenterModule?.(eventBus) : null,
  ["eventBus", "sourceCheckpointCenter"]
);
const reasoningFeedGateCenterModule = startupRegistry.register(
  "reasoningFeedGateCenter",
  shouldInitializeCenter("reasoningFeedGateCenter") ? window.createBlueCurrentReasoningFeedGateCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "sourceCheckpointCenter", "ingestionObservabilityCenter"]
);

const streamReconciliationCenterModule = startupRegistry.register(
  "streamReconciliationCenter",
  shouldInitializeCenter("streamReconciliationCenter") ? window.createBlueCurrentStreamReconciliationCenterModule?.(eventBus) : null,
  ["eventBus", "sourceCheckpointCenter"]
);
const connectorBackpressureCenterModule = startupRegistry.register(
  "connectorBackpressureCenter",
  shouldInitializeCenter("connectorBackpressureCenter") ? window.createBlueCurrentConnectorBackpressureCenterModule?.(eventBus) : null,
  ["eventBus", "deliveryAssuranceCenter"]
);
const liveTwinSyncCenterModule = startupRegistry.register(
  "liveTwinSyncCenter",
  shouldInitializeCenter("liveTwinSyncCenter") ? window.createBlueCurrentLiveTwinSyncCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "reasoningFeedGateCenter", "streamReconciliationCenter", "connectorBackpressureCenter"]
);


const liveProvenanceCenterModule = startupRegistry.register(
  "liveProvenanceCenter",
  shouldInitializeCenter("liveProvenanceCenter") ? window.createBlueCurrentLiveProvenanceCenterModule?.(eventBus) : null,
  ["eventBus", "liveTwinSyncCenter"]
);
const sourceCutoverCenterModule = startupRegistry.register(
  "sourceCutoverCenter",
  shouldInitializeCenter("sourceCutoverCenter") ? window.createBlueCurrentSourceCutoverCenterModule?.(eventBus) : null,
  ["eventBus", "streamReconciliationCenter", "connectorBackpressureCenter", "sourceCheckpointCenter"]
);
const liveEvidenceCertificationCenterModule = startupRegistry.register(
  "liveEvidenceCertificationCenter",
  shouldInitializeCenter("liveEvidenceCertificationCenter") ? window.createBlueCurrentLiveEvidenceCertificationCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "liveProvenanceCenter", "sourceCutoverCenter", "liveTwinSyncCenter", "reasoningFeedGateCenter"]
);


const connectorAuthCenterModule = startupRegistry.register(
  "connectorAuthCenter",
  shouldInitializeCenter("connectorAuthCenter") ? window.createBlueCurrentConnectorAuthCenterModule?.(eventBus) : null,
  ["eventBus", "liveEvidenceCertificationCenter"]
);
const webhookIngressCenterModule = startupRegistry.register(
  "webhookIngressCenter",
  shouldInitializeCenter("webhookIngressCenter") ? window.createBlueCurrentWebhookIngressCenterModule?.(eventBus) : null,
  ["eventBus", "connectorAuthCenter"]
);
const connectionReadinessCenterModule = startupRegistry.register(
  "connectionReadinessCenter",
  shouldInitializeCenter("connectionReadinessCenter") ? window.createBlueCurrentConnectionReadinessCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "connectorAuthCenter", "webhookIngressCenter", "liveEvidenceCertificationCenter"]
);
const webhookReceiptLedgerCenterModule = startupRegistry.register(
  "webhookReceiptLedgerCenter",
  shouldInitializeCenter("webhookReceiptLedgerCenter") ? window.createBlueCurrentWebhookReceiptLedgerCenterModule?.(eventBus) : null,
  ["eventBus", "webhookIngressCenter"]
);
const credentialRotationCenterModule = startupRegistry.register(
  "credentialRotationCenter",
  shouldInitializeCenter("credentialRotationCenter") ? window.createBlueCurrentCredentialRotationCenterModule?.(eventBus) : null,
  ["eventBus", "connectorAuthCenter"]
);
const providerLaunchCertificationCenterModule = startupRegistry.register(
  "providerLaunchCertificationCenter",
  shouldInitializeCenter("providerLaunchCertificationCenter") ? window.createBlueCurrentProviderLaunchCertificationCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "connectionReadinessCenter", "webhookReceiptLedgerCenter", "credentialRotationCenter"]
);

const providerSlaCenterModule = startupRegistry.register(
  "providerSlaCenter",
  shouldInitializeCenter("providerSlaCenter") ? window.createBlueCurrentProviderSlaCenterModule?.(eventBus) : null,
  ["eventBus", "providerLaunchCertificationCenter"]
);
const providerQuarantineCenterModule = startupRegistry.register(
  "providerQuarantineCenter",
  shouldInitializeCenter("providerQuarantineCenter") ? window.createBlueCurrentProviderQuarantineCenterModule?.(eventBus) : null,
  ["eventBus", "webhookReceiptLedgerCenter"]
);
const providerOperationsGateCenterModule = startupRegistry.register(
  "providerOperationsGateCenter",
  shouldInitializeCenter("providerOperationsGateCenter") ? window.createBlueCurrentProviderOperationsGateCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "providerLaunchCertificationCenter", "providerSlaCenter", "providerQuarantineCenter"]
);


const providerIncidentCenterModule = startupRegistry.register(
  "providerIncidentCenter",
  shouldInitializeCenter("providerIncidentCenter") ? window.createBlueCurrentProviderIncidentCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "providerSlaCenter", "providerQuarantineCenter"]
);
const providerFailoverCenterModule = startupRegistry.register(
  "providerFailoverCenter",
  shouldInitializeCenter("providerFailoverCenter") ? window.createBlueCurrentProviderFailoverCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "connectionReadinessCenter", "providerSlaCenter"]
);
const providerContinuityCertificationCenterModule = startupRegistry.register(
  "providerContinuityCertificationCenter",
  shouldInitializeCenter("providerContinuityCertificationCenter") ? window.createBlueCurrentProviderContinuityCertificationCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "providerOperationsGateCenter", "providerIncidentCenter", "providerFailoverCenter"]
);

const providerRecoveryDrillCenterModule = startupRegistry.register(
  "providerRecoveryDrillCenter",
  shouldInitializeCenter("providerRecoveryDrillCenter") ? window.createBlueCurrentProviderRecoveryDrillCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "providerFailoverCenter", "providerContinuityCertificationCenter"]
);
const providerContinuityTelemetryCenterModule = startupRegistry.register(
  "providerContinuityTelemetryCenter",
  shouldInitializeCenter("providerContinuityTelemetryCenter") ? window.createBlueCurrentProviderContinuityTelemetryCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "providerIncidentCenter", "providerContinuityCertificationCenter"]
);
const v42ReleaseCertificationCenterModule = startupRegistry.register(
  "v42ReleaseCertificationCenter",
  shouldInitializeCenter("v42ReleaseCertificationCenter") ? window.createBlueCurrentV42ReleaseCertificationCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "providerRecoveryDrillCenter", "providerContinuityTelemetryCenter", "providerContinuityCertificationCenter"]
);

const locationSourceBindingCenterModule = startupRegistry.register("locationSourceBindingCenter",shouldInitializeCenter("locationSourceBindingCenter") ? window.createBlueCurrentLocationSourceBindingCenterModule?.(eventBus, appState) : null,["eventBus","appState","v42ReleaseCertificationCenter"]);
const liveCoverageMatrixCenterModule = startupRegistry.register("liveCoverageMatrixCenter",shouldInitializeCenter("liveCoverageMatrixCenter") ? window.createBlueCurrentLiveCoverageMatrixCenterModule?.(eventBus, appState) : null,["eventBus","appState","locationSourceBindingCenter"]);
const enterpriseLiveReadinessCenterModule = startupRegistry.register("enterpriseLiveReadinessCenter",shouldInitializeCenter("enterpriseLiveReadinessCenter") ? window.createBlueCurrentEnterpriseLiveReadinessCenterModule?.(eventBus, appState) : null,["eventBus","appState","liveCoverageMatrixCenter","v42ReleaseCertificationCenter"]);
const locationCutoverCenterModule = startupRegistry.register("locationCutoverCenter",shouldInitializeCenter("locationCutoverCenter") ? window.createBlueCurrentLocationCutoverCenterModule?.(eventBus, appState) : null,["eventBus","appState","enterpriseLiveReadinessCenter"]);
const portfolioLiveTelemetryCenterModule = startupRegistry.register("portfolioLiveTelemetryCenter",shouldInitializeCenter("portfolioLiveTelemetryCenter") ? window.createBlueCurrentPortfolioLiveTelemetryCenterModule?.(eventBus, appState) : null,["eventBus","appState","locationCutoverCenter"]);
const enterprisePilotCutoverCenterModule = startupRegistry.register("enterprisePilotCutoverCenter",shouldInitializeCenter("enterprisePilotCutoverCenter") ? window.createBlueCurrentEnterprisePilotCutoverCenterModule?.(eventBus, appState) : null,["eventBus","appState","portfolioLiveTelemetryCenter","enterpriseLiveReadinessCenter"]);

const operationsWorkspaceCenterModule = startupRegistry.register(
  "operationsWorkspaceCenter",
  shouldInitializeCenter("operationsWorkspaceCenter") ? window.createBlueCurrentOperationsWorkspaceCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const shiftIntelligenceCenterModule = startupRegistry.register(
  "shiftIntelligenceCenter",
  shouldInitializeCenter("shiftIntelligenceCenter") ? window.createBlueCurrentShiftIntelligenceCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState"]
);
const executiveDecisionFeedCenterModule = startupRegistry.register(
  "executiveDecisionFeedCenter",
  shouldInitializeCenter("executiveDecisionFeedCenter") ? window.createBlueCurrentExecutiveDecisionFeedCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "shiftIntelligenceCenter"]
);
const operationsCopilotCenterModule = startupRegistry.register(
  "operationsCopilotCenter",
  shouldInitializeCenter("operationsCopilotCenter") ? window.createBlueCurrentOperationsCopilotCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "shiftIntelligenceCenter", "executiveDecisionFeedCenter"]
);
const trustedDatasetCenterModule = startupRegistry.register(
  "trustedDatasetCenter",
  shouldInitializeCenter("trustedDatasetCenter") ? window.createBlueCurrentTrustedDatasetCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "sourcePromotionCenter"]
);
const dataLineageCenterModule = startupRegistry.register(
  "dataLineageCenter",
  shouldInitializeCenter("dataLineageCenter") ? window.createBlueCurrentDataLineageCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "trustedDatasetCenter"]
);
const pilotSyncRehearsalCenterModule = startupRegistry.register(
  "pilotSyncRehearsalCenter",
  shouldInitializeCenter("pilotSyncRehearsalCenter") ? window.createBlueCurrentPilotSyncRehearsalCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "trustedDatasetCenter", "dataLineageCenter", "connectorConfigurationCenter"]
);
const v37CertificationCenterModule = startupRegistry.register(
  "v37CertificationCenter",
  shouldInitializeCenter("v37CertificationCenter") ? window.createBlueCurrentV37CertificationCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "productionRuntimeCenter", "productionSmokeTestCenter", "deploymentRehearsalCenter", "environmentGateCenter", "acceptanceSignoffCenter"]
);
const pilotLaunchCenterModule = startupRegistry.register(
  "pilotLaunchCenter",
  shouldInitializeCenter("pilotLaunchCenter") ? window.createBlueCurrentPilotLaunchCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "experienceQualityCenter", "pilotOnboardingCenter", "runtimeRecoveryCenter"]
);

const pilotEvidenceCenterModule = startupRegistry.register(
  "pilotEvidenceCenter",
  shouldInitializeCenter("pilotEvidenceCenter") ? window.createBlueCurrentPilotEvidenceCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "pilotLaunchCenter"]
);
const accessReadinessCenterModule = startupRegistry.register(
  "accessReadinessCenter",
  shouldInitializeCenter("accessReadinessCenter") ? window.createBlueCurrentAccessReadinessCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "pilotLaunchCenter"]
);
const releaseCertificationCenterModule = startupRegistry.register(
  "releaseCertificationCenter",
  shouldInitializeCenter("releaseCertificationCenter") ? window.createBlueCurrentReleaseCertificationCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "pilotEvidenceCenter", "accessReadinessCenter", "runtimeRecoveryCenter"]
);

const integrationControlCenterModule = startupRegistry.register(
  "integrationControlCenter",
  shouldInitializeCenter("integrationControlCenter") ? window.createBlueCurrentIntegrationControlCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "releaseCertificationCenter"]
);
const signalQualityCenterModule = startupRegistry.register(
  "signalQualityCenter",
  shouldInitializeCenter("signalQualityCenter") ? window.createBlueCurrentSignalQualityCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "integrationControlCenter"]
);
const pilotTelemetryCenterModule = startupRegistry.register(
  "pilotTelemetryCenter",
  shouldInitializeCenter("pilotTelemetryCenter") ? window.createBlueCurrentPilotTelemetryCenterModule?.(eventBus, appState) : null,
  ["eventBus", "appState", "integrationControlCenter", "signalQualityCenter", "runtimeRecoveryCenter"]
);

const restaurantPerformanceCenterModule = startupRegistry.register(
  "restaurantPerformanceCenter",
  shouldInitializeCenter("restaurantPerformanceCenter")
    ? window.createBlueCurrentRestaurantPerformanceCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState"]
);

const outcomeIntelligenceCenterModule = startupRegistry.register(
  "outcomeIntelligenceCenter",
  shouldInitializeCenter("outcomeIntelligenceCenter")
    ? window.createBlueCurrentOutcomeIntelligenceCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "restaurantPerformanceCenter"]
);

const executiveBriefingCenterModule = startupRegistry.register(
  "executiveBriefingCenter",
  shouldInitializeCenter("executiveBriefingCenter")
    ? window.createBlueCurrentExecutiveBriefingCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "restaurantPerformanceCenter", "outcomeIntelligenceCenter"]
);

const aiOrchestrationCenterModule = startupRegistry.register(
  "aiOrchestrationCenter",
  shouldInitializeCenter("aiOrchestrationCenter")
    ? window.createBlueCurrentAiOrchestrationCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState"]
);

const operationalDigitalTwinCenterModule = startupRegistry.register(
  "operationalDigitalTwinCenter",
  shouldInitializeCenter("operationalDigitalTwinCenter")
    ? window.createBlueCurrentOperationalDigitalTwinCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "aiOrchestrationCenter"]
);

const portfolioIntelligenceCenterModule = startupRegistry.register(
  "portfolioIntelligenceCenter",
  shouldInitializeCenter("portfolioIntelligenceCenter")
    ? window.createBlueCurrentPortfolioIntelligenceCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "operationalDigitalTwinCenter"]
);

const portfolioPerformanceCenterModule = startupRegistry.register(
  "portfolioPerformanceCenter",
  shouldInitializeCenter("portfolioPerformanceCenter")
    ? window.createBlueCurrentPortfolioPerformanceCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "restaurantPerformanceCenter", "outcomeIntelligenceCenter", "portfolioIntelligenceCenter"]
);

const performanceLearningCenterModule = startupRegistry.register(
  "performanceLearningCenter",
  shouldInitializeCenter("performanceLearningCenter")
    ? window.createBlueCurrentPerformanceLearningCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "restaurantPerformanceCenter", "outcomeIntelligenceCenter", "portfolioPerformanceCenter"]
);

const pilotReleaseCenterModule = startupRegistry.register(
  "pilotReleaseCenter",
  shouldInitializeCenter("pilotReleaseCenter")
    ? window.createBlueCurrentPilotReleaseCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "restaurantPerformanceCenter", "outcomeIntelligenceCenter", "executiveBriefingCenter", "portfolioPerformanceCenter", "performanceLearningCenter"]
);

const predictiveServiceCenterModule = startupRegistry.register(
  "predictiveServiceCenter",
  shouldInitializeCenter("predictiveServiceCenter")
    ? window.createBlueCurrentPredictiveServiceCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "operationalDigitalTwinCenter", "portfolioIntelligenceCenter"]
);

const autonomousPolicyCenterModule = startupRegistry.register(
  "autonomousPolicyCenter",
  shouldInitializeCenter("autonomousPolicyCenter")
    ? window.createBlueCurrentAutonomousPolicyCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "predictiveServiceCenter", "portfolioIntelligenceCenter"]
);

const executiveWorkflowCenterModule = startupRegistry.register(
  "executiveWorkflowCenter",
  shouldInitializeCenter("executiveWorkflowCenter")
    ? window.createBlueCurrentExecutiveWorkflowCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "autonomousPolicyCenter", "predictiveServiceCenter"]
);



const pilotOperationsCenterModule = startupRegistry.register(
  "pilotOperationsCenter",
  shouldInitializeCenter("pilotOperationsCenter")
    ? window.createBlueCurrentPilotOperationsCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "pilotReleaseCenter", "executiveWorkflowCenter"]
);

const pilotReviewCenterModule = startupRegistry.register(
  "pilotReviewCenter",
  shouldInitializeCenter("pilotReviewCenter")
    ? window.createBlueCurrentPilotReviewCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "pilotOperationsCenter", "pilotReleaseCenter", "outcomeIntelligenceCenter", "executiveBriefingCenter"]
);

const deploymentReadinessCenterModule = startupRegistry.register(
  "deploymentReadinessCenter",
  shouldInitializeCenter("deploymentReadinessCenter")
    ? window.createBlueCurrentDeploymentReadinessCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "pilotReviewCenter", "pilotReleaseCenter"]
);

const postLaunchValueCenterModule = startupRegistry.register(
  "postLaunchValueCenter",
  shouldInitializeCenter("postLaunchValueCenter")
    ? window.createBlueCurrentPostLaunchValueCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "deploymentReadinessCenter", "outcomeIntelligenceCenter", "restaurantPerformanceCenter", "portfolioPerformanceCenter"]
);

const expansionBenchmarkCenterModule = startupRegistry.register(
  "expansionBenchmarkCenter",
  shouldInitializeCenter("expansionBenchmarkCenter")
    ? window.createBlueCurrentExpansionBenchmarkCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "postLaunchValueCenter", "portfolioPerformanceCenter", "outcomeIntelligenceCenter", "performanceLearningCenter"]
);

const performanceGovernanceCenterModule = startupRegistry.register(
  "performanceGovernanceCenter",
  shouldInitializeCenter("performanceGovernanceCenter")
    ? window.createBlueCurrentPerformanceGovernanceCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "expansionBenchmarkCenter", "postLaunchValueCenter", "executiveBriefingCenter", "outcomeIntelligenceCenter", "performanceLearningCenter"]
);


const enterpriseValuePlanCenterModule = startupRegistry.register(
  "enterpriseValuePlanCenter",
  shouldInitializeCenter("enterpriseValuePlanCenter")
    ? window.createBlueCurrentEnterpriseValuePlanCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "performanceGovernanceCenter", "expansionBenchmarkCenter", "postLaunchValueCenter", "outcomeIntelligenceCenter"]
);

const marginIntelligenceCenterModule = startupRegistry.register(
  "marginIntelligenceCenter",
  shouldInitializeCenter("marginIntelligenceCenter")
    ? window.createBlueCurrentMarginIntelligenceCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "restaurantPerformanceCenter", "outcomeIntelligenceCenter", "enterpriseValuePlanCenter"]
);

const costVarianceCenterModule = startupRegistry.register(
  "costVarianceCenter",
  shouldInitializeCenter("costVarianceCenter")
    ? window.createBlueCurrentCostVarianceCenterModule?.(eventBus, appState)
    : null,
  ["eventBus", "appState", "marginIntelligenceCenter", "predictiveServiceCenter", "outcomeIntelligenceCenter"]
);

const executiveCommandCenterModule = startupRegistry.register("executiveCommandCenter", fullPlatformStartup ? window.createBlueCurrentExecutiveCommandCenterModule?.(eventBus, appState, cloudFoundationModule) : null, ["eventBus","appState","cloudFoundation","authOrganizations","aiRestaurantBrain"]);

// V32.3 retires the legacy Autonomous Operations renderer. Its DOM contract
// belonged to an older view and was the final source of startup-time null errors.
const operationsDirectorModule = startupRegistry.skip(
  "operationsDirector",
  "Legacy renderer retired; replacement will use the V32.3 module lifecycle.",
  ["eventBus", "appState", "cloudFoundation", "authOrganizations", "executiveCommandCenter"]
);
startupRegistry.skip(
  "autonomousOperations",
  "Superseded legacy alias retained only for compatibility reporting.",
  ["eventBus", "appState", "cloudFoundation", "authOrganizations", "executiveCommandCenter"]
);

// Exposed temporarily for browser-console testing.
window.blueCurrent = {
  eventBus,
  appState,
  motionEngine,
  modules: {
    concierge: conciergeModule,
    digitalTwin: digitalTwinModule,
    executive: executiveModule,
    missionControl: missionControlModule,
    guestJourney: guestJourneyModule,
    timeMachine: timeMachineModule,
    portfolioMode: portfolioModeModule,
    predictiveOperations: predictiveOperationsModule,
    blueCurrentLive: blueCurrentLiveModule,
    intelligenceNetwork: intelligenceNetworkModule,
    autonomousOperations: operationsDirectorModule,
    unifiedCommand: unifiedCommandCenterModule,
    guidedShift: guidedShiftCenterModule,
    operatorCopilot: operatorCopilotCenterModule,
    roleExperience: roleExperienceCenterModule,
    commandActionInbox: commandActionInboxCenterModule,
    shiftCloseout: shiftCloseoutCenterModule,
    digitalTwinVisualization: digitalTwinVisualizationCenterModule,
    executiveMorningBrief: executiveMorningBriefCenterModule,
    intelligenceGraph: intelligenceGraphCenterModule,
    predictiveOverlay: predictiveOverlayCenterModule,
    restaurantReplay: restaurantReplayCenterModule,
    explainableDecision: explainableDecisionCenterModule,
    crossLocationPulse: crossLocationPulseCenterModule,
    profitScenario: profitScenarioCenterModule,
    smartAlertRouter: smartAlertRouterCenterModule,
    guestRecovery: guestRecoveryCenterModule,
    laborDeployment: laborDeploymentCenterModule,
    serviceQuality: serviceQualityCenterModule,
    reservationYield: reservationYieldCenterModule,
    kitchenThroughput: kitchenThroughputCenterModule,
    shiftProfitPulse: shiftProfitPulseCenterModule,
    inventoryWaste: inventoryWasteCenterModule,
    menuMix: menuMixCenterModule,
    dailyProfitPlan: dailyProfitPlanCenterModule,
    vendorPurchase: vendorPurchaseCenterModule,
    demandPrepForecast: demandPrepForecastCenterModule,
    profitCloseout: profitCloseoutCenterModule,
    supplierVariance: supplierVarianceCenterModule,
    prepExecution: prepExecutionCenterModule,
    weeklyProfitReview: weeklyProfitReviewCenterModule,
    teamCollaboration: teamCollaborationCenterModule,
    enterpriseOperations: enterpriseOperationsCenterModule,
    operationalKnowledge: operationalKnowledgeCenterModule,
    experienceQuality: experienceQualityCenterModule,
    demoMode: demoModeCenterModule,
    pilotOnboarding: pilotOnboardingCenterModule,
    operatorWorkspace: operatorWorkspaceCenterModule,
    runtimeRecovery: runtimeRecoveryCenterModule,
    featurePackLoader: featurePackLoaderCenterModule,
    startupPerformance: startupPerformanceCenterModule,
    bootRecovery: bootRecoveryCenterModule,
    backgroundActivityGovernor: backgroundActivityGovernorCenterModule,
    startupProfiles: startupProfileCenterModule,
    assetHealth: assetHealthCenterModule,
    idlePackWarmup: idlePackWarmupCenterModule,
    eventStormGuard: eventStormGuardCenterModule,
    renderBudget: renderBudgetCenterModule,
    adaptivePack: adaptivePackCenterModule,
    memoryPressure: memoryPressureCenterModule,
    centerSuspension: centerSuspensionCenterModule,
    networkRequestBudget: networkRequestCenterModule,
    stateChurn: stateChurnCenterModule,
    runtimeCircuitBreaker: runtimeCircuitBreakerCenterModule,
    subscriptionLifecycle: subscriptionLifecycleCenterModule,
    storageFootprint: storageFootprintCenterModule,
    runtimeReadiness: runtimeReadinessCenterModule,
    performanceBaseline: performanceBaselineCenterModule,
    performanceRegression: performanceRegressionCenterModule,
    productionRuntime: productionRuntimeCenterModule,
    releaseCandidate: releaseCandidateCenterModule,
    rollbackCheckpoint: rollbackCheckpointCenterModule,
    productionSmokeTest: productionSmokeTestCenterModule,
    deploymentRehearsal: deploymentRehearsalCenterModule,
    environmentGate: environmentGateCenterModule,
    acceptanceSignoff: acceptanceSignoffCenterModule,
    v37Certification: v37CertificationCenterModule,
    connectorConfiguration: connectorConfigurationCenterModule,
    dataIntakeSandbox: dataIntakeSandboxCenterModule,
    pilotSignalBridge: pilotSignalBridgeCenterModule,
    canonicalMapping: canonicalMappingCenterModule,
    ingestionQueue: ingestionQueueCenterModule,
    sourcePromotion: sourcePromotionCenterModule,
    priorityFocus: priorityFocusCenterModule,
    actionOwnership: actionOwnershipCenterModule,
    shiftHandoffSnapshot: shiftHandoffSnapshotCenterModule,
    decisionExecutionLedger: decisionExecutionLedgerCenterModule,
    outcomeCapture: outcomeCaptureCenterModule,
    shiftCloseBrief: shiftCloseBriefCenterModule,
    recommendationCalibration: recommendationCalibrationCenterModule,
    operationsLearningReview: operationsLearningReviewCenterModule,
    nextShiftPlan: nextShiftPlanCenterModule,
    openingReadiness: openingReadinessCenterModule,
    shiftCheckpoint: shiftCheckpointCenterModule,
    dailyValueReport: dailyValueReportCenterModule,
    serviceExceptionQueue: serviceExceptionQueueCenterModule,
    escalationControl: escalationControlCenterModule,
    recoveryVerification: recoveryVerificationCenterModule,
    incidentRootCause: incidentRootCauseCenterModule,
    correctiveActionPlan: correctiveActionPlanCenterModule,
    exceptionTrendReview: exceptionTrendReviewCenterModule,
    aipToolRegistry: aipToolRegistryCenterModule,
    aipAgentRuntime: aipAgentRuntimeCenterModule,
    aipPromptOrchestrator: aipPromptOrchestratorCenterModule,
    aipGovernance: aipGovernanceCenterModule,
    aipMissionControl: aipMissionControlCenterModule,
    aipApprovalQueue: aipApprovalQueueCenterModule,
    aipContextGraph: aipContextGraphCenterModule,
    aipMemoryVault: aipMemoryVaultCenterModule,
    aipScenarioLab: aipScenarioLabCenterModule,
    operationsWorkspace: operationsWorkspaceCenterModule,
    shiftIntelligence: shiftIntelligenceCenterModule,
    executiveDecisionFeed: executiveDecisionFeedCenterModule,
    operationsCopilot: operationsCopilotCenterModule,
    trustedDataset: trustedDatasetCenterModule,
    dataLineage: dataLineageCenterModule,
    pilotSyncRehearsal: pilotSyncRehearsalCenterModule,
    pilotLaunch: pilotLaunchCenterModule,
    pilotEvidence: pilotEvidenceCenterModule,
    accessReadiness: accessReadinessCenterModule,
    releaseCertification: releaseCertificationCenterModule,
    integrationControl: integrationControlCenterModule,
    signalQuality: signalQualityCenterModule,
    pilotTelemetry: pilotTelemetryCenterModule,
    restaurantPerformance: restaurantPerformanceCenterModule,
    outcomeIntelligence: outcomeIntelligenceCenterModule,
    executiveBriefing: executiveBriefingCenterModule,
    aiOrchestrationCenter: aiOrchestrationCenterModule,
    operationalDigitalTwin: operationalDigitalTwinCenterModule,
    portfolioIntelligence: portfolioIntelligenceCenterModule,
    portfolioPerformance: portfolioPerformanceCenterModule,
    performanceLearning: performanceLearningCenterModule,
    pilotRelease: pilotReleaseCenterModule,
    pilotOperations: pilotOperationsCenterModule,
    pilotReview: pilotReviewCenterModule,
    deploymentReadiness: deploymentReadinessCenterModule,
    postLaunchValue: postLaunchValueCenterModule,
    expansionBenchmark: expansionBenchmarkCenterModule,
    performanceGovernance: performanceGovernanceCenterModule,
    enterpriseValuePlan: enterpriseValuePlanCenterModule,
    marginIntelligence: marginIntelligenceCenterModule,
    costVariance: costVarianceCenterModule,
    predictiveService: predictiveServiceCenterModule,
    autonomousPolicyCenter: autonomousPolicyCenterModule,
    executiveWorkflowCenter: executiveWorkflowCenterModule
  }
};
window.appState = appState;
window.eventBus = eventBus;

// --------------------------------------------------
// Shared UI renderer
// --------------------------------------------------

function setText(id, value) {
  const element = document.getElementById(id);
  if (element && value !== undefined && value !== null) {
    element.textContent = String(value);
  }
}

function formatExecutiveRevenue(value) {
  const amount = Number(value) || 0;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${Math.round(amount).toLocaleString()}`;
}

function pulseById(id) {
  const element = document.getElementById(id);
  if (!element) return;
  element.classList.remove("is-updating");
  void element.offsetWidth;
  element.classList.add("is-updating");
  window.setTimeout(() => element.classList.remove("is-updating"), 700);
}

function renderSharedState(state, changes = {}) {
  setText("execGuests", Number(state.guestsExpected).toLocaleString());
  setText("execReservations", Number(state.reservationsToday).toLocaleString());
  setText("execCalls", Number(state.callsAnswered).toLocaleString());
  setText("execRevenue", formatExecutiveRevenue(state.estimatedRevenue));
  setText("executiveBrief", state.executiveBrief);

  setText("occupancyLabel", `${state.occupancyPercent}% occupied`);

  if (state.activeTable?.tableNumber) {
    const target = document.getElementById("targetTable");
    target?.setAttribute("data-table", String(state.activeTable.tableNumber));
    target?.classList.add("confirmed");
  }

  const metricMap = {
    guestsExpected: "execGuests",
    reservationsToday: "execReservations",
    callsAnswered: "execCalls",
    estimatedRevenue: "execRevenue",
    executiveBrief: "executiveBrief"
  };

  Object.keys(changes).forEach((key) => {
    if (metricMap[key]) pulseById(metricMap[key]);
  });
}

// --------------------------------------------------
// Domain events → App State
// --------------------------------------------------

eventBus.on("service:started", ({ serviceName, startedAt }) => {
  appState.update({
    serviceStatus: "live",
    executiveBrief: `${serviceName} started at ${startedAt}. Blue Current is monitoring live service.`
  });
});

eventBus.on("concierge:call-started", (call) => {
  appState.update({
    activeCall: call,
    executiveBrief: "An incoming reservation call was answered immediately by Blue Current Concierge."
  });
});

eventBus.on("guest:recognized", (guest) => {
  appState.update({
    activeGuest: guest,
    executiveBrief: `${guest.guestName} was recognized and guest preferences were shared with the operation.`
  });
});

eventBus.on("availability:matched", (match) => {
  appState.update({
    executiveBrief: `Demand recovered: ${match.offeredTime} at Table ${match.tableNumber} was offered when the requested inventory was constrained.`
  });
});

/**
 * The synchronization point for Sprint 1.
 * One confirmation updates state once, then compatibility events allow
 * existing visual modules to react without directly controlling each other.
 */
eventBus.on("reservation:confirmed", ({
  reservation,
  occupancyPercent,
  revenueImpact = 0,
  executiveBrief
}) => {
  const existingReservations = appState.get("reservations") || [];
  const alreadyExists = existingReservations.some(
    (item) => item.id === reservation.id
  );

  const nextReservations = alreadyExists
    ? existingReservations
    : [...existingReservations, reservation];

  const nextState = {
    reservations: nextReservations,
    activeGuest: {
      ...(appState.get("activeGuest") || {}),
      guestName: reservation.guestName,
      occasion: reservation.occasion
    },
    activeTable: {
      tableNumber: reservation.tableNumber,
      partySize: reservation.partySize,
      guestName: reservation.guestName,
      time: reservation.time || reservation.offeredTime || "7:15 PM",
      occasion: reservation.occasion,
      note: reservation.note || "Tree nut allergy",
      vip: true,
      status: "reserved"
    },
    activeCall: null,
    occupancyPercent,
    reservationsToday: appState.get("reservationsToday") + (alreadyExists ? 0 : 1),
    callsAnswered: appState.get("callsAnswered") + (alreadyExists ? 0 : 1),
    guestsExpected: appState.get("guestsExpected") + (alreadyExists ? 0 : reservation.partySize),
    estimatedRevenue: appState.get("estimatedRevenue") + (alreadyExists ? 0 : revenueImpact),
    executiveBrief,
    lastOperationalEvent: {
      type: "reservation:confirmed",
      occurredAt: new Date().toISOString(),
      reservationId: reservation.id
    }
  };

  appState.update(nextState);

  // Compatibility events for existing modules. These are views of the
  // committed state—not separate sources of truth.
  eventBus.emit("reservation:created", reservation);
  eventBus.emit("table:assigned", nextState.activeTable);
  eventBus.emit("occupancy:updated", { occupancyPercent });
  eventBus.emit("executive:updated", {
    guestsExpected: nextState.guestsExpected,
    reservationsToday: nextState.reservationsToday,
    callsAnswered: nextState.callsAnswered,
    estimatedRevenue: nextState.estimatedRevenue
  });
});

// --------------------------------------------------
// State subscriptions
// --------------------------------------------------

// V39.0 — coalesce high-frequency state synchronization into one render per frame.
// This keeps the UI current without flooding the console or repeatedly rendering
// intermediate states produced by one logical operating update.
let pendingSharedState = null;
let pendingSharedChanges = {};
let sharedStateFrame = 0;
let lastStateDebugAt = 0;
const stateDebugEnabled = new URLSearchParams(window.location.search).get("debugState") === "1";

eventBus.on("state:updated", ({ state, changes }) => {
  pendingSharedState = state;
  pendingSharedChanges = { ...pendingSharedChanges, ...(changes || {}) };
  if (sharedStateFrame) return;

  sharedStateFrame = window.requestAnimationFrame(() => {
    sharedStateFrame = 0;
    const nextState = pendingSharedState;
    const nextChanges = pendingSharedChanges;
    pendingSharedState = null;
    pendingSharedChanges = {};
    if (nextState) renderSharedState(nextState, nextChanges);

    if (stateDebugEnabled && performance.now() - lastStateDebugAt >= 2000) {
      lastStateDebugAt = performance.now();
      console.debug("Blue Current state synchronized:", Object.keys(nextChanges));
    }
  });
});

eventBus.on("state:reset", ({ state }) => {
  renderSharedState(state, state);
});

// Initial render before the timeline begins.
renderSharedState(appState.getState(), appState.getState());

// --------------------------------------------------
// Load and start demo timeline
// --------------------------------------------------

motionEngine.load(
  window.createBlueCurrentLiveServiceTimeline(eventBus)
);

if (fullPlatformStartup) motionEngine.start();

const operationalIntelligence = typeof window.createBlueCurrentOperationalIntelligenceModule === "function"
    ? window.createBlueCurrentOperationalIntelligenceModule(eventBus, appState)
    : null;


const guestIntelligenceModule = startupRegistry.register("guestIntelligence", fullPlatformStartup ? window.createBlueCurrentGuestIntelligenceModule?.(eventBus, appState, cloudFoundationModule) : null, ["eventBus","appState","cloudFoundation","authOrganizations"]);
if (window.blueCurrent?.modules) window.blueCurrent.modules.guestIntelligence = guestIntelligenceModule;

const workforceFoundationModule = startupRegistry.register("workforceFoundation", fullPlatformStartup ? window.createBlueCurrentWorkforceFoundationModule?.(eventBus, appState, cloudFoundationModule) : null, ["eventBus","appState","cloudFoundation","authOrganizations"]);

const schedulingModule = startupRegistry.register("scheduling", fullPlatformStartup ? window.createBlueCurrentSchedulingModule?.(eventBus, appState, cloudFoundationModule) : null, ["eventBus","appState","cloudFoundation","authOrganizations","workforceFoundation"]);

const workforceIntelligenceModule = startupRegistry.register("workforceIntelligence", fullPlatformStartup ? window.createBlueCurrentWorkforceIntelligenceModule?.(eventBus, appState, cloudFoundationModule) : null, ["eventBus","appState","cloudFoundation","authOrganizations","guestIntelligence","workforceFoundation"]);

const inventoryIntelligenceModule = startupRegistry.register("inventoryIntelligence", fullPlatformStartup ? window.createBlueCurrentInventoryIntelligenceModule?.(eventBus, appState, cloudFoundationModule) : null, ["eventBus","appState","cloudFoundation","authOrganizations","workforceIntelligence"]);

const timeClockModule = startupRegistry.register("timeClock", fullPlatformStartup ? window.createBlueCurrentTimeClockModule?.(eventBus, appState, cloudFoundationModule) : null, ["eventBus","appState","cloudFoundation","authOrganizations","workforceIntelligence"]);

// Publish one deterministic startup summary after all active modules register.
queueMicrotask(() => {
  const report = startupRegistry.complete();
  window.blueCurrent.startup = report;
  console.info(`[Blue Current V${report.build}] startup complete in ${report.durationMs}ms`, report);
});
