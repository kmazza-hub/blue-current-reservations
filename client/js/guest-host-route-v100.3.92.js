"use strict";
/**
 * Blue Current V100.3.92 — Guests / Host Stand route continuity.
 * A late, focused route owner closes the gap between the visible Guests
 * controls and the certified Hospitality OS workspace shell.
 */
(() => {
  if (window.__bcGuestHostRouteV100_3_91) return;
  window.__bcGuestHostRouteV100_3_91 = true;

  const routeName = "guests";
  let navigationToken = 0;
  let lastIntentAt = 0;

  const directSection = (node) => {
    while (node && node.parentElement && node.parentElement.id !== "main") node = node.parentElement;
    return node?.parentElement?.id === "main" ? node : null;
  };

  const guestSections = () => {
    const sections = ["host-stand", "guest-intelligence", "guest-journey-live"]
      .map((id) => directSection(document.getElementById(id)))
      .filter(Boolean);
    return [...new Set(sections)];
  };

  const enforce = (token, scroll) => {
    if (token !== navigationToken) return;
    const shellApi = window.BlueCurrentHospitalityShell;
    if (shellApi?.activate) {
      shellApi.activate(routeName, { scroll });
    }

    const command = document.getElementById("blueCurrentCommand");
    const sections = guestSections();
    document.documentElement.dataset.bcWorkspaceIntent = routeName;
    document.documentElement.dataset.bcWorkspace = routeName;
    command?.classList.add("bc-shell-workspace-open");

    document.querySelectorAll("#main > section.bc-workspace-visible").forEach((section) => {
      if (!sections.includes(section)) section.classList.remove("bc-workspace-visible");
    });
    sections.forEach((section) => section.classList.add("bc-workspace-visible"));

    document.querySelectorAll(".bc-os-nav [data-bc-workspace]").forEach((button) => {
      const active = button.dataset.bcWorkspace === routeName;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    const returnBar = document.getElementById("bcWorkspaceReturn");
    const activeLabel = document.getElementById("bcActiveWorkspace");
    if (returnBar) returnBar.hidden = false;
    if (activeLabel) activeLabel.textContent = "Guests";
  };

  const commitGuests = () => {
    const token = ++navigationToken;
    lastIntentAt = Date.now();
    enforce(token, true);
    [0, 80, 320, 900].forEach((delay) => {
      setTimeout(() => enforce(token, false), delay);
    });
  };

  const guestTrigger = (event) => {
    const button = event.target?.closest?.("button,[role='button']");
    if (!button) return false;
    if (button.dataset?.bcWorkspace === routeName) return true;
    const label = (button.textContent || "").replace(/\s+/g, " ").trim();
    return Boolean(button.closest("#blueCurrentCommand") && /^Guests(?:\b|Reservations)/i.test(label));
  };

  window.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || !guestTrigger(event)) return;
    commitGuests();
  }, true);

  window.addEventListener("touchend", (event) => {
    if (!guestTrigger(event)) return;
    commitGuests();
  }, true);

  window.addEventListener("click", (event) => {
    if (!guestTrigger(event) || Date.now() - lastIntentAt < 700) return;
    commitGuests();
  }, true);

  window.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key) || !guestTrigger(event)) return;
    commitGuests();
  }, true);
})();