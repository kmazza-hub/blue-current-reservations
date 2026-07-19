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
