const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navAnchors = document.querySelectorAll(".nav-links a");

const callTimer = document.querySelector("#call-timer");
const transcriptText = document.querySelector("#transcript-text");
const speakerLabel = document.querySelector("#speaker-label");
const callStateIcon = document.querySelector("#call-state-icon");
const callStateTitle = document.querySelector("#call-state-title");
const callStateSubtitle = document.querySelector("#call-state-subtitle");
const smsPhone = document.querySelector("#sms-phone");
const revenueChip = document.querySelector("#revenue-chip");
const liveReservationRow = document.querySelector("#live-reservation-row");

const metricReservations = document.querySelector("#metric-reservations");
const metricGuests = document.querySelector("#metric-guests");
const metricRevenue = document.querySelector("#metric-revenue");
const metricReservationsDelta = document.querySelector("#metric-reservations-delta");

const liveDemoTrigger = document.querySelector(".live-demo-trigger");
const demoModal = document.querySelector(".demo-modal");
const modalClose = document.querySelector(".modal-close");
const modalBackdrop = document.querySelector(".modal-backdrop");
const modalCopy = document.querySelector("#modal-copy");
const modalSpeaker = document.querySelector("#modal-speaker");
const modalStageLabel = document.querySelector("#modal-stage-label");
const modalTimer = document.querySelector("#modal-timer");
const modalSteps = [...document.querySelectorAll(".modal-steps article")];
const modalProgress = document.querySelector(".modal-progress");

const leadForm = document.querySelector("#lead-form");
const successToast = document.querySelector(".success-toast");
const year = document.querySelector("#year");
const cursorGlow = document.querySelector(".cursor-glow");

let callLoopTimer;
let modalTimers = [];

if (year) {
  year.textContent = new Date().getFullYear();
}

menuToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("menu-open", isOpen);
});

navAnchors.forEach((anchor) => {
  anchor.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  });
});

const callStages = [
  {
    at: 0,
    speaker: "AI host",
    text: "Good evening, Marina Point. How can I help you?",
    icon: "☎",
    title: "Call connected",
    subtitle: "AI host is listening",
    seconds: 1,
  },
  {
    at: 2200,
    speaker: "Guest",
    text: "Hi, do you have a table for six tonight around seven?",
    icon: "◉",
    title: "Request captured",
    subtitle: "Party of 6 · Tonight",
    seconds: 4,
  },
  {
    at: 4400,
    speaker: "AI host",
    text: "I can help with that. I’m checking tonight’s availability now.",
    icon: "◷",
    title: "Checking availability",
    subtitle: "Reviewing seating rules",
    seconds: 7,
  },
  {
    at: 6700,
    speaker: "AI host",
    text: "I found a patio table at 7:15 PM. Would you like me to confirm it?",
    icon: "✓",
    title: "Table available",
    subtitle: "Patio · 7:15 PM",
    seconds: 10,
  },
  {
    at: 9100,
    speaker: "Guest",
    text: "Yes, that’s perfect.",
    icon: "✓",
    title: "Reservation approved",
    subtitle: "Guest confirmed",
    seconds: 13,
  },
  {
    at: 10800,
    speaker: "AI host",
    text: "You’re confirmed for six guests tonight at 7:15 PM. I’ve sent the details by text.",
    icon: "✉",
    title: "Reservation complete",
    subtitle: "SMS confirmation delivered",
    seconds: 16,
    complete: true,
  },
];

function typeText(element, text, speed = 18) {
  if (!element) return;
  element.textContent = "";
  let index = 0;

  const interval = window.setInterval(() => {
    element.textContent += text[index] || "";
    index += 1;

    if (index >= text.length) {
      window.clearInterval(interval);
    }
  }, speed);
}

function updateStage(stage) {
  if (speakerLabel) speakerLabel.textContent = stage.speaker;
  typeText(transcriptText, stage.text);
  if (callStateIcon) callStateIcon.textContent = stage.icon;
  if (callStateTitle) callStateTitle.textContent = stage.title;
  if (callStateSubtitle) callStateSubtitle.textContent = stage.subtitle;
  if (callTimer) callTimer.textContent = `00:${String(stage.seconds).padStart(2, "0")}`;

  if (stage.complete) {
    smsPhone?.classList.add("show");
    revenueChip?.classList.add("show");
    liveReservationRow?.classList.add("flash");

    if (metricReservations) metricReservations.textContent = "49";
    if (metricGuests) metricGuests.textContent = "132";
    if (metricRevenue) metricRevenue.textContent = "$4,116";
    if (metricReservationsDelta) metricReservationsDelta.textContent = "+9";

    window.setTimeout(() => {
      liveReservationRow?.classList.remove("flash");
    }, 1200);
  }
}

function resetLiveDemo() {
  window.clearTimeout(callLoopTimer);

  smsPhone?.classList.remove("show");
  revenueChip?.classList.remove("show");

  if (metricReservations) metricReservations.textContent = "48";
  if (metricGuests) metricGuests.textContent = "126";
  if (metricRevenue) metricRevenue.textContent = "$3,840";
  if (metricReservationsDelta) metricReservationsDelta.textContent = "+8";

  callStages.forEach((stage) => {
    window.setTimeout(() => updateStage(stage), stage.at);
  });

  callLoopTimer = window.setTimeout(resetLiveDemo, 15000);
}

resetLiveDemo();

function clearModalTimers() {
  modalTimers.forEach((timer) => window.clearTimeout(timer));
  modalTimers = [];
}

const modalStages = [
  {
    at: 0,
    step: 0,
    label: "Incoming call",
    speaker: "AI host",
    copy: "Good evening, Marina Point. How can I help you?",
    time: "00:01",
  },
  {
    at: 1800,
    step: 1,
    label: "Checking availability",
    speaker: "AI host",
    copy: "I’m checking Friday availability for four guests around 7:30 PM.",
    time: "00:06",
  },
  {
    at: 3900,
    step: 2,
    label: "Reservation confirmed",
    speaker: "AI host",
    copy: "I found a table at 7:30 PM and have confirmed it under Jamie Rivera.",
    time: "00:11",
  },
  {
    at: 5900,
    step: 3,
    label: "Guest notified",
    speaker: "System",
    copy: "Confirmation text delivered. The reservation is now visible to the host stand.",
    time: "00:14",
  },
];

function runModalDemo() {
  clearModalTimers();

  modalProgress?.classList.remove("run");
  window.requestAnimationFrame(() => modalProgress?.classList.add("run"));

  modalStages.forEach((stage) => {
    modalTimers.push(
      window.setTimeout(() => {
        modalSteps.forEach((step, index) => {
          step.classList.toggle("active", index === stage.step);
        });

        if (modalStageLabel) modalStageLabel.textContent = stage.label;
        if (modalSpeaker) modalSpeaker.textContent = stage.speaker;
        if (modalTimer) modalTimer.textContent = stage.time;
        typeText(modalCopy, stage.copy, 16);
      }, stage.at)
    );
  });

  modalTimers.push(window.setTimeout(runModalDemo, 7600));
}

function openModal() {
  if (!demoModal) return;

  demoModal.hidden = false;
  document.body.classList.add("modal-open");
  runModalDemo();
  modalClose?.focus();
}

function closeModal() {
  clearModalTimers();
  if (demoModal) demoModal.hidden = true;
  document.body.classList.remove("modal-open");
  liveDemoTrigger?.focus();
}

liveDemoTrigger?.addEventListener("click", openModal);
modalClose?.addEventListener("click", closeModal);
modalBackdrop?.addEventListener("click", closeModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && demoModal && !demoModal.hidden) {
    closeModal();
  }
});

const revealItems = document.querySelectorAll(".reveal, .analytics-card");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries, activeObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("visible");

        const counters = entry.target.querySelectorAll?.("[data-count]") || [];
        counters.forEach(animateCounter);

        activeObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

function animateCounter(element) {
  if (!element || element.dataset.animated === "true") return;

  element.dataset.animated = "true";
  const target = Number(element.dataset.count);
  const decimal = !Number.isInteger(target);
  const duration = 1200;
  const start = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;

    element.textContent = decimal ? current.toFixed(1) : Math.round(current);

    if (progress < 1) {
      window.requestAnimationFrame(update);
    }
  }

  window.requestAnimationFrame(update);
}

leadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = leadForm.querySelector('button[type="submit"]');
  const originalHtml = submitButton?.innerHTML;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Submitting…";
  }

  try {
    const formData = new FormData(leadForm);

    const response = await fetch("/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(formData).toString(),
    });

    if (!response.ok) {
      throw new Error("Submission failed");
    }

    leadForm.reset();
    successToast?.classList.add("show");

    window.setTimeout(() => {
      successToast?.classList.remove("show");
    }, 4200);
  } catch (error) {
    window.alert(
      "This form will submit after the site is deployed to Netlify. Local Live Server previews cannot process Netlify Forms."
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalHtml;
    }
  }
});

if (cursorGlow && window.matchMedia("(pointer: fine)").matches) {
  document.addEventListener("mousemove", (event) => {
    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
  });
}

const heroStage = document.querySelector(".hero-stage");

if (heroStage && window.matchMedia("(pointer: fine)").matches) {
  heroStage.addEventListener("mousemove", (event) => {
    const rect = heroStage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    heroStage.style.transform =
      `perspective(1400px) rotateY(${x * 2.2}deg) rotateX(${y * -1.8}deg)`;
  });

  heroStage.addEventListener("mouseleave", () => {
    heroStage.style.transform = "";
  });
}

if (window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".button").forEach((button) => {
    button.addEventListener("mousemove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;

      button.style.transform =
        `translate(${x * 0.05}px, ${y * 0.07}px) translateY(-2px)`;
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "";
    });
  });
}
