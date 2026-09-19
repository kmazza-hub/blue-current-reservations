"use strict";
/**
 * Blue Current V100.3.93 — Accessible selected-state continuity.
 * Keeps visual selection and assistive-technology state aligned after every
 * workspace or queue render without changing restaurant data.
 */
(() => {
  if (window.__bcAccessibleStateV100_3_92) return;
  window.__bcAccessibleStateV100_3_92 = true;

  let scheduled = false;

  const setAttribute = (element, name, value) => {
    if (!element) return;
    if (value === null) {
      if (element.hasAttribute(name)) element.removeAttribute(name);
      return;
    }
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  };

  const reconcilePrimaryWorkspace = () => {
    const controls = [...document.querySelectorAll(".bc-os-nav [data-bc-workspace]")];
    if (!controls.length) return;
    const selected =
      document.documentElement.dataset.bcWorkspace ||
      controls.find((button) => button.classList.contains("is-active"))?.dataset.bcWorkspace ||
      "command";

    controls.forEach((button) => {
      setAttribute(button, "aria-current", button.dataset.bcWorkspace === selected ? "page" : null);
    });
  };

  const reconcileHostWorkspace = () => {
    const controls = [...document.querySelectorAll(".host-nav button")];
    if (!controls.length) return;
    const active = controls.find((button) => button.classList.contains("active"));
    controls.forEach((button) => {
      setAttribute(button, "aria-current", button === active ? "page" : null);
    });
  };

  const reconcileQueueTabs = () => {
    document.querySelectorAll(".host-queue-panel .queue-tabs").forEach((tablist) => {
      const controls = [...tablist.querySelectorAll("button")];
      const waitlist = document.getElementById("waitlistQueue");
      const arrivals = document.getElementById("arrivalQueue");
      const selected = waitlist && !waitlist.classList.contains("hidden")
        ? "waitlist"
        : arrivals && !arrivals.classList.contains("hidden")
          ? "arrivals"
          : controls.find((button) => button.classList.contains("active"))?.dataset.queue;
      controls.forEach((button) => {
        setAttribute(button, "aria-pressed", String(button.dataset.queue === selected));
      });
    });
  };

  const reconcile = () => {
    scheduled = false;
    reconcilePrimaryWorkspace();
    reconcileHostWorkspace();
    reconcileQueueTabs();
  };

  const scheduleReconcile = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(reconcile);
  };

  document.addEventListener("pointerdown", scheduleReconcile, true);
  document.addEventListener("click", () => {
    scheduleReconcile();
    setTimeout(scheduleReconcile, 80);
    setTimeout(scheduleReconcile, 360);
    setTimeout(scheduleReconcile, 900);
  }, true);
  document.addEventListener("keydown", (event) => {
    if (["Enter", " "].includes(event.key)) scheduleReconcile();
  }, true);

  const observer = new MutationObserver(scheduleReconcile);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "data-bc-workspace"]
  });

  reconcile();
})();