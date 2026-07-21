
(function () {
  "use strict";

  function createCloudFoundationModule(eventBus, appState) {
    const api = new window.BlueCurrentCloudApi("");
    const $ = id => document.getElementById(id);
    let connected = false;
    let bootstrap = null;

    function setStatus(status, detail) {
      const badge = $("cloudConnectionStatus");
      if (badge) {
        badge.textContent = status;
        badge.className = `cloud-status ${status.toLowerCase().replace(/\s+/g, "-")}`;
      }
      if ($("cloudConnectionDetail")) $("cloudConnectionDetail").textContent = detail;
    }

    function renderBootstrap(data) {
      bootstrap = data;
      $("cloudOrgCount").textContent = data.organizations.length;
      $("cloudLocationCount").textContent = data.locations.length;
      $("cloudUserCount").textContent = data.users.length;
      $("cloudAuditCount").textContent = data.auditLogs.length;
      $("cloudOrganizationList").innerHTML = data.organizations.map(org => `
        <article><span>${org.name.slice(0,2).toUpperCase()}</span><div><strong>${org.name}</strong><small>${org.status} environment</small></div><em>${data.locations.filter(loc => loc.organizationId === org.id).length} locations</em></article>
      `).join("");
      $("cloudRecentAudit").innerHTML = data.auditLogs.slice(0, 6).map(log => `
        <article><time>${new Date(log.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</time><div><strong>${log.actor}</strong><p>${log.action}</p></div></article>
      `).join("") || "<p>No cloud audit records yet.</p>";
      $("cloudReservationCount").textContent = data.reservations.length;
    }

    async function connect() {
      setStatus("Connecting", "Contacting local Blue Current Cloud service…");
      try {
        const health = await api.health();
        connected = true;
        setStatus("Connected", `Cloud Core V${health.version} · Authentication ${health.auth || "ready"} · Database ${health.database}`);
        if (api.token) renderBootstrap(await api.bootstrap());
        appState.update({ cloudConnected: true, cloudVersion: health.version, cloudLastSync: health.now });
        eventBus.emit("cloud:connected", health);
      } catch (error) {
        connected = false;
        setStatus("Offline mode", "Start the included Node server to enable durable cloud persistence.");
        appState.update({ cloudConnected: false });
        eventBus.emit("cloud:disconnected", { error: error.message });
      }
    }

    $("cloudRefresh")?.addEventListener("click", connect);

    $("cloudCreateReservation")?.addEventListener("click", async () => {
      if (!connected) return connect();
      const button = $("cloudCreateReservation");
      button.disabled = true;
      try {
        const reservation = await api.createReservation({
          locationId: "loc_marina",
          guestName: `Cloud Guest ${Math.floor(Math.random() * 900 + 100)}`,
          partySize: Math.floor(Math.random() * 5) + 2,
          actor: "V22 Cloud Console"
        });
        eventBus.emit("reservation:created", reservation);
        appState.appendReservation?.(reservation);
        if (api.token) renderBootstrap(await api.bootstrap());
      } catch (error) {
        setStatus("Cloud error", error.message);
      } finally {
        button.disabled = false;
      }
    });

    $("cloudMigrateV21")?.addEventListener("click", async () => {
      if (!connected) return connect();
      const local = localStorage.getItem("blueCurrentV21Production");
      if (!local) {
        $("cloudMigrationResult").textContent = "No V21 local configuration was found in this browser.";
        return;
      }
      const parsed = JSON.parse(local);
      await api.recordAudit({
        organizationId: "org_chefs",
        actor: "V22 Migration",
        action: `Imported V21 configuration for ${parsed.organization || "organization"}`,
        category: "migration"
      });
      $("cloudMigrationResult").textContent = "V21 configuration detected and migration audit recorded successfully.";
      if (api.token) renderBootstrap(await api.bootstrap());
      eventBus.emit("cloud:migration-complete", { sourceVersion: "21.0" });
    });

    api.connect((type, payload) => {
      eventBus.emit(type, payload);
      if (type === "reservation:created") {
        appState.appendReservation?.(payload);
        api.bootstrap().then(renderBootstrap).catch(() => {});
      }
      if (type === "configuration:updated") {
        appState.update({ cloudConfiguration: payload, cloudLastSync: new Date().toISOString() });
      }
    });

    connect();

    return { api, reconnect: connect, getBootstrap: () => bootstrap };
  }

  window.createBlueCurrentCloudFoundationModule = createCloudFoundationModule;
})();
