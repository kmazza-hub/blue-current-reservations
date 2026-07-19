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
