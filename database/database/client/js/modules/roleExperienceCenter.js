(function () {
  "use strict";
  function createBlueCurrentRoleExperienceCenterModule(eventBus, appState) {
    const root = document.getElementById("roleExperienceCenter");
    if (!root || !window.BlueCurrentRoleExperienceEngine) return null;
    const engine = new window.BlueCurrentRoleExperienceEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    function apply(snapshot) {
      document.body.dataset.blueCurrentRole = snapshot.role;
      document.body.dataset.blueCurrentDensity = snapshot.density;
      document.querySelectorAll("[data-role-experience-section]").forEach(node => node.hidden = !snapshot.visibleSections.includes(node.id));
    }
    function render(snapshot = engine.snapshot()) {
      byId("roleExperienceTitle").textContent = snapshot.profile.label;
      byId("roleExperiencePromise").textContent = snapshot.profile.promise;
      byId("roleExperienceHeadline").textContent = snapshot.headline;
      byId("roleExperienceMetrics").innerHTML = snapshot.primaryMetrics.map(([label, value]) => `<article><small>${esc(label)}</small><strong>${esc(value)}</strong></article>`).join("");
      root.querySelectorAll("[data-role-choice]").forEach(button => button.classList.toggle("is-active", button.dataset.roleChoice === snapshot.role));
      byId("roleExperienceDensity").textContent = snapshot.density === "compact" ? "Use comfortable spacing" : "Use compact spacing";
      byId("roleExperienceUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      apply(snapshot);
    }
    root.addEventListener("click", event => {
      const choice = event.target.closest("[data-role-choice]");
      if (choice) render(engine.setRole(choice.dataset.roleChoice));
    });
    byId("roleExperienceDensity")?.addEventListener("click", () => render(engine.setDensity(engine.snapshot().density === "compact" ? "comfortable" : "compact")));
    byId("roleExperienceShowAll")?.addEventListener("click", () => {
      document.body.classList.remove("blue-current-command-mode");
      document.body.classList.add("blue-current-full-platform-mode");
      document.querySelectorAll("[data-role-experience-section]").forEach(node => node.hidden = false);
    });
    eventBus.on("role-experience:updated", render);
    render(engine.refresh({ reason: "module-start" }));
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }
  window.createBlueCurrentRoleExperienceCenterModule = createBlueCurrentRoleExperienceCenterModule;
})();
