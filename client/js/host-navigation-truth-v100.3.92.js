"use strict";
/**
 * Blue Current V100.3.92 — Host navigation truth continuity.
 * Keeps the selected Host Stand workspace, visible heading, queue, and
 * accessibility state synchronized after every navigation event.
 */
(() => {
  if (window.__bcHostNavigationTruthV100_3_90) return;
  window.__bcHostNavigationTruthV100_3_90 = true;

  const hostMain = document.querySelector(".host-main");
  const hostWorkspace = document.querySelector(".host-workspace");
  const floorPanel = document.querySelector(".host-floor-panel");
  const queuePanel = document.querySelector(".host-queue-panel");
  const navButtons = [...document.querySelectorAll(".host-nav button")];
  const titleStrip = document.getElementById("bcHostWorkspaceTitleV100_2_14");
  if (!hostMain || !hostWorkspace || !floorPanel || !queuePanel || !navButtons.length || !titleStrip) return;

  const heading = hostMain.querySelector(".host-topbar h3");
  const subtitle = hostMain.querySelector(".host-topbar small");
  const normalize = (button) => (button?.textContent || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  const supported = new Set(["floor", "reservations", "waitlist", "guests"]);
  let selected = normalize(navButtons.find((button) => button.classList.contains("active"))) || "floor";
  let scheduled = false;

  const setText = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
  };
  const setHidden = (node, value) => {
    if (node && node.hidden !== value) node.hidden = value;
  };
  const setClass = (node, name, value) => {
    if (node && node.classList.contains(name) !== value) node.classList.toggle(name, value);
  };

  const setNavState = () => {
    navButtons.forEach((button) => {
      const active = normalize(button) === selected;
      setClass(button, "active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  };

  const setQueueView = (name) => {
    const waitlist = document.getElementById("waitlistQueue");
    const arrivals = document.getElementById("arrivalQueue");
    queuePanel.querySelectorAll(".queue-tabs button").forEach((button) => {
      const active = button.dataset.queue === name;
      setClass(button, "active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    setClass(waitlist, "hidden", name !== "waitlist");
    setClass(arrivals, "hidden", name === "waitlist");
  };

  const setTitle = (kicker, title, helper) => {
    const small = titleStrip.querySelector("small");
    const strong = titleStrip.querySelector("strong");
    const span = titleStrip.querySelector("span");
    setText(small, kicker);
    setText(strong, title);
    setText(span, helper);
    setHidden(titleStrip, false);
  };

  const reconcile = () => {
    scheduled = false;
    setNavState();

    if (selected === "reservations") {
      setClass(hostWorkspace, "bc-single-workspace", true);
      setHidden(floorPanel, true);
      setHidden(queuePanel, false);
      setQueueView("arrivals");
      setTitle("Reservations", "Tonight's arrivals", "Who is coming, what matters, and who is ready to seat.");
      setText(heading, "Reservations");
      setText(subtitle, "Tonight · Marina Grille");
      return;
    }

    if (selected === "waitlist") {
      setClass(hostWorkspace, "bc-single-workspace", true);
      setHidden(floorPanel, true);
      setHidden(queuePanel, false);
      setQueueView("waitlist");
      setTitle("Waitlist", "Who is waiting", "Seat the right party quickly. Nothing else competes for attention.");
      setText(heading, "Waitlist");
      setText(subtitle, "Live front-door queue · Marina Grille");
    }
  };

  const scheduleReconcile = () => {
    if (!supported.has(selected) || scheduled) return;
    scheduled = true;
    queueMicrotask(reconcile);
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".host-nav button");
    if (!button) return;
    const next = normalize(button);
    if (!supported.has(next)) return;
    selected = next;
    scheduleReconcile();
    requestAnimationFrame(scheduleReconcile);
    setTimeout(scheduleReconcile, 60);
  }, true);

  const observer = new MutationObserver(() => {
    if (selected === "reservations" || selected === "waitlist") scheduleReconcile();
  });
  observer.observe(hostMain, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "aria-current", "aria-pressed"]
  });

  setNavState();
})();