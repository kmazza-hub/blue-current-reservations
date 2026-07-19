const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const yearElement = document.querySelector("#year");

const demoModal = document.querySelector(".demo-modal");
const demoTrigger = document.querySelector(".demo-trigger");
const modalClose = document.querySelector(".modal-close");
const modalBackdrop = document.querySelector(".modal-backdrop");
const demoSteps = [...document.querySelectorAll(".demo-step")];
const demoProgress = document.querySelector(".demo-progress");

const faqItems = document.querySelectorAll(".faq-item");
const leadForm = document.querySelector("#lead-form");
const formToast = document.querySelector(".form-toast");

let demoTimers = [];

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

function closeMenu() {
  if (!menuButton || !siteNav) return;

  menuButton.classList.remove("active");
  siteNav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

if (menuButton && siteNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");

    menuButton.classList.toggle("active", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

function clearDemoTimers() {
  demoTimers.forEach((timer) => window.clearTimeout(timer));
  demoTimers = [];
}

function resetDemo() {
  clearDemoTimers();

  demoSteps.forEach((step, index) => {
    step.classList.toggle("active", index === 0);
  });

  demoProgress?.classList.remove("animate");

  window.requestAnimationFrame(() => {
    demoProgress?.classList.add("animate");
  });

  demoTimers.push(
    window.setTimeout(() => {
      demoSteps.forEach((step, index) => {
        step.classList.toggle("active", index === 1);
      });
    }, 1600)
  );

  demoTimers.push(
    window.setTimeout(() => {
      demoSteps.forEach((step, index) => {
        step.classList.toggle("active", index === 2);
      });
    }, 3200)
  );

  demoTimers.push(
    window.setTimeout(() => {
      resetDemo();
    }, 5000)
  );
}

function openDemo() {
  if (!demoModal) return;

  demoModal.hidden = false;
  document.body.classList.add("modal-open");
  resetDemo();
  modalClose?.focus();
}

function closeDemo() {
  if (!demoModal) return;

  clearDemoTimers();
  demoModal.hidden = true;
  document.body.classList.remove("modal-open");
  demoTrigger?.focus();
}

demoTrigger?.addEventListener("click", openDemo);
modalClose?.addEventListener("click", closeDemo);
modalBackdrop?.addEventListener("click", closeDemo);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && demoModal && !demoModal.hidden) {
    closeDemo();
  }
});

faqItems.forEach((item, index) => {
  const button = item.querySelector("button");
  const icon = button?.querySelector("i");

  if (index === 0) {
    item.classList.add("open");
  }

  button?.addEventListener("click", () => {
    const isOpen = item.classList.contains("open");

    faqItems.forEach((otherItem) => {
      otherItem.classList.remove("open");

      const otherButton = otherItem.querySelector("button");
      const otherIcon = otherButton?.querySelector("i");

      otherButton?.setAttribute("aria-expanded", "false");
      if (otherIcon) otherIcon.textContent = "+";
    });

    if (!isOpen) {
      item.classList.add("open");
      button.setAttribute("aria-expanded", "true");
      if (icon) icon.textContent = "−";
    }
  });
});

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
    }
  );

  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("visible"));
}

leadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = leadForm.querySelector('button[type="submit"]');
  const originalText = submitButton?.innerHTML;

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
    formToast?.classList.add("show");

    window.setTimeout(() => {
      formToast?.classList.remove("show");
    }, 4500);
  } catch (error) {
    window.alert(
      "The form could not be submitted locally. Once the site is deployed on Netlify, submissions will work automatically."
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  }
});


if (window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".button").forEach((button) => {
    button.addEventListener("mousemove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;

      button.style.transform = `translate(${x * 0.06}px, ${y * 0.08}px) translateY(-2px)`;
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "";
    });
  });
}
