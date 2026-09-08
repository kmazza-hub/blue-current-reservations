
(function () {
  "use strict";

  function createCloudFoundationModule(eventBus, appState) {
    const api = new window.BlueCurrentCloudApi("");
    const pipeline = window.BlueCurrentRequestPipeline || null;
    const offlineSync = window.BlueCurrentOfflineSync || null;
    const auditLedger = window.BlueCurrentAuditLedger || null;
    const $ = id => document.getElementById(id);
    let connected = false;
    let bootstrap = null;
    let bootstrapPromise = null;
    let bootstrapGeneration = 0;

    function setStatus(status, detail) {
      const badge = $("cloudConnectionStatus");
      if (badge) {
        badge.textContent = status;
        badge.className = `cloud-status ${status.toLowerCase().replace(/\s+/g, "-")}`;
      }
      if ($("cloudConnectionDetail")) $("cloudConnectionDetail").textContent = detail;
    }

    function renderBootstrap(data, options = {}) {
      bootstrap = data;
      const session = window.BlueCurrentAuthSession?.snapshot?.().session || data.auth || null;
      const hydrator = window.BlueCurrentBootstrapHydrator;
      const snapshot = hydrator?.hydrate
        ? hydrator.hydrate(appState, data, session, { source: options.source || "network" })
        : data;

      if ($("cloudOrgCount")) $("cloudOrgCount").textContent = data.organizations.length;
      if ($("cloudLocationCount")) $("cloudLocationCount").textContent = data.locations.length;
      if ($("cloudUserCount")) $("cloudUserCount").textContent = data.users.length;
      if ($("cloudAuditCount")) $("cloudAuditCount").textContent = data.auditLogs.length;
      if ($("cloudOrganizationList")) {
        $("cloudOrganizationList").innerHTML = data.organizations.map(org => `
          <article><span>${org.name.slice(0,2).toUpperCase()}</span><div><strong>${org.name}</strong><small>${org.status} environment</small></div><em>${data.locations.filter(loc => loc.organizationId === org.id).length} locations</em></article>
        `).join("");
      }
      if ($("cloudRecentAudit")) {
        $("cloudRecentAudit").innerHTML = data.auditLogs.slice(0, 6).map(log => `
          <article><time>${new Date(log.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</time><div><strong>${log.actor}</strong><p>${log.action}</p></div></article>
        `).join("") || "<p>No cloud audit records yet.</p>";
      }
      if ($("cloudReservationCount")) $("cloudReservationCount").textContent = data.reservations.length;

      const importedAuditEntries = auditLedger?.importCloudEntries?.(data.auditLogs || []) || 0;
      const reconciliation = auditLedger?.reconcile?.({
        auditLogs: data.auditLogs || [],
        headHash: data.auditHeadHash || null
      }) || null;

      appState.update({
        auditLedgerEntries: auditLedger?.snapshot?.().entries || 0,
        auditLedgerIntegrity: reconciliation?.verification?.valid ?? true,
        auditReconciliationStatus: reconciliation?.status || "unavailable",
        auditPendingCloudCount: reconciliation?.pendingCloud?.length || 0,
        auditMissingLocalCount: reconciliation?.missingLocally?.length || 0
      });

      eventBus.emit("cloud:bootstrap-hydrated", {
        source: options.source || "network",
        snapshot,
        importedAuditEntries,
        reconciliation
      });
      return snapshot;
    }

    async function loadBootstrap(options = {}) {
      if (bootstrapPromise && !options.force) return bootstrapPromise;
      const generation = ++bootstrapGeneration;

      bootstrapPromise = (async () => {
        const data = await api.bootstrap();
        if (generation !== bootstrapGeneration) return bootstrap;
        renderBootstrap(data, { source: "network" });
        appState.update({
          cloudBootstrapStale: false,
          cloudBootstrapLastRefresh: new Date().toISOString()
        });
        return data;
      })();

      try {
        return await bootstrapPromise;
      } finally {
        bootstrapPromise = null;
      }
    }

    async function connect() {
      pipeline?.markStartupPhase?.("Authenticate", "running");
      setStatus("Connecting", "Contacting local Blue Current Cloud service…");
      try {
        const health = await api.health();
        pipeline?.markStartupPhase?.("Connect Cloud", "complete", { version: health.version });
        connected = true;
        appState.update({ cloudConnected: true, cloudVersion: health.version, cloudLastSync: health.now });
        eventBus.emit("cloud:connected", health);

        const auth = window.BlueCurrentAuthSession;
        const readiness = auth?.restore ? await auth.restore(api) : { authenticated: Boolean(api.token) };

        if (readiness.authenticated) {
          pipeline?.markStartupPhase?.("Authenticate", "complete", { restored: true });
          pipeline?.markStartupPhase?.("Restore Session", "complete");
          pipeline?.markStartupPhase?.("Hydrate State", "running");
          const cached = window.BlueCurrentBootstrapHydrator?.hydrateFromCache?.(appState, readiness.session);
          if (cached?.fresh) {
            setStatus("Restoring", `Cached operating state restored. Refreshing Cloud Core V${health.version}…`);
          } else if (cached) {
            setStatus("Refreshing", `A stale cached snapshot was found. Loading current Cloud Core V${health.version} state…`);
          } else {
            setStatus("Connected", `Cloud Core V${health.version} · Session restored · Loading operating state…`);
          }

          await loadBootstrap({ force: true });
          pipeline?.markStartupPhase?.("Hydrate State", "complete", {
            source: window.BlueCurrentBootstrapHydrator?.snapshot?.().source || "network"
          });
          pipeline?.markStartupPhase?.("Start EventBus", "complete");
          pipeline?.markStartupPhase?.("Register Modules", "complete", {
            order: pipeline?.resolveDependencies?.() || []
          });
          pipeline?.markStartupPhase?.("Ready", "complete");
          setStatus("Connected", `Cloud Core V${health.version} · Operating state synchronized · Database ${health.database}`);
          eventBus.emit("cloud:authenticated", readiness.session);
        } else {
          setStatus("Sign in required", `Cloud Core V${health.version} is online. Protected modules are waiting for authentication.`);
          pipeline?.markStartupPhase?.("Authenticate", "blocked", { reason: "sign-in-required" });
          eventBus.emit("cloud:authentication-required", {});
        }
      } catch (error) {
        if (error.code === "AUTH_REQUIRED" || error.code === "SESSION_EXPIRED") {
          setStatus("Sign in required", "Your session is unavailable or expired. Sign in to load protected operations.");
          eventBus.emit("cloud:authentication-required", { error: error.message });
          return;
        }
        connected = false;
        setStatus("Offline mode", error.code === "NETWORK_UNAVAILABLE"
          ? "Unable to reach the included Node service. Start npm start and retry."
          : "Start the included Node server to enable durable cloud persistence.");
        appState.update({ cloudConnected: false });
        eventBus.emit("cloud:disconnected", { error: error.message, code: error.code || "UNKNOWN" });
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
        if (api.token) await loadBootstrap({ force: true });
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
      if (api.token) await loadBootstrap({ force: true });
      eventBus.emit("cloud:migration-complete", { sourceVersion: "21.0" });
    });

    let disconnectEvents = null;

    function connectEvents() {
      disconnectEvents?.();
      disconnectEvents = api.connect((type, payload) => {
        eventBus.emit(type, payload);
        if (type === "reservation:created") {
          pipeline?.invalidate?.(key => key.includes("reservation") || key.includes("bootstrap"));
          window.dispatchEvent(new CustomEvent("bluecurrent:reservation-created", { detail: payload }));
          appState.appendReservation?.(payload);
          loadBootstrap({ force: true }).catch(error => {
            if (!["AUTH_REQUIRED","SESSION_EXPIRED"].includes(error.code)) {
              console.warn("Cloud bootstrap refresh failed", error);
            }
          });
        }
        if (type === "configuration:updated") {
          pipeline?.invalidate?.(key => key.includes("configuration") || key.includes("bootstrap"));
          window.dispatchEvent(new CustomEvent("bluecurrent:configuration-updated", { detail: payload }));
          appState.update({ cloudConfiguration: payload, cloudLastSync: new Date().toISOString() });
        }
      });
    }

    window.addEventListener("bluecurrent:audit-verified", event => {
      const result = event.detail || {};
      appState.update({
        auditLedgerIntegrity: Boolean(result.valid),
        auditLedgerHeadHash: result.headHash || null,
        auditLedgerFailureCount: result.failures?.length || 0,
        auditLedgerLastVerifiedAt: result.verifiedAt || null
      });
      if (!result.valid) {
        setStatus("Audit integrity warning", "The local audit ledger requires review.");
        eventBus.emit("cloud:audit-integrity-failure", result);
      }
    });

    window.addEventListener("bluecurrent:audit-reconciled", event => {
      const result = event.detail || {};
      appState.update({
        auditReconciliationStatus: result.status || "unknown",
        auditPendingCloudCount: result.pendingCloud?.length || 0,
        auditMissingLocalCount: result.missingLocally?.length || 0,
        auditLedgerLastReconciledAt: result.reconciledAt || null
      });
      eventBus.emit("cloud:audit-reconciled", result);
    });

    window.addEventListener("bluecurrent:offline-sync-started", () => {
      setStatus("Synchronizing", "Replaying locally saved operating changes…");
      appState.update({ offlineSyncing: true });
    });

    window.addEventListener("bluecurrent:offline-sync-complete", event => {
      const snapshot = event.detail || offlineSync?.snapshot?.();
      appState.update({
        offlineSyncing: false,
        offlineQueueDepth: snapshot?.queueDepth || 0,
        offlineConflictCount: snapshot?.openConflicts || 0,
        offlineLastSyncAt: snapshot?.metrics?.lastSyncAt || null
      });
      if (connected && window.BlueCurrentAuthSession?.snapshot?.().authenticated) {
        loadBootstrap({ force: true }).catch(() => {});
      }
    });

    window.addEventListener("bluecurrent:offline-queue-changed", event => {
      const snapshot = event.detail || offlineSync?.snapshot?.();
      appState.update({
        offlineQueueDepth: snapshot?.queueDepth || 0,
        offlineConflictCount: snapshot?.openConflicts || 0
      });
    });

    window.addEventListener("bluecurrent:offline-conflict-created", event => {
      const snapshot = offlineSync?.snapshot?.();
      setStatus("Conflict review", "A locally saved change conflicts with newer cloud data.");
      appState.update({
        offlineConflictCount: snapshot?.openConflicts || 0,
        offlineLastConflict: event.detail?.conflict || null
      });
      eventBus.emit("cloud:sync-conflict", event.detail || {});
    });

    window.addEventListener("bluecurrent:auth-session-state", event => {
      if (event.detail?.status === "authenticated") {
        connectEvents();
        connect();
      } else {
        disconnectEvents?.();
        disconnectEvents = null;
        bootstrapGeneration += 1;
        bootstrapPromise = null;
        bootstrap = null;
        appState.update({
          cloudBootstrapReady: false,
          cloudBootstrapStale: false,
          cloudBootstrapSource: null,
          cloudBootstrapHydratedAt: null
        });
      }
    });

    connect();

    return {
      api,
      reconnect: connect,
      getBootstrap: () => bootstrap,
      refreshBootstrap: () => loadBootstrap({ force: true }),
      getBootstrapStatus: () => window.BlueCurrentBootstrapHydrator?.snapshot?.() || null,
      getRequestPipelineStatus: () => pipeline?.metricsSnapshot?.() || null,
      getOfflineSyncStatus: () => offlineSync?.snapshot?.() || null,
      getAuditLedgerStatus: () => auditLedger?.snapshot?.() || null,
      verifyAuditLedger: () => auditLedger?.verify?.() || null,
      reconcileAuditLedger: cloudState => auditLedger?.reconcile?.(cloudState) || null,
      exportAuditLedger: filters => auditLedger?.exportPackage?.(filters || {}) || null,
      downloadAuditLedger: filters => auditLedger?.download?.(filters || {}) || null,
      replayOfflineWrites: () => offlineSync?.replay?.(),
      resolveOfflineConflict: (id, strategy, body) => offlineSync?.resolveConflict?.(id, strategy, body),
      discardOfflineWrite: id => offlineSync?.discard?.(id),
      invalidateRequestCache: predicate => pipeline?.invalidate?.(predicate),
      registerCloudModule: (name, options) => pipeline?.registerModule?.(name, options),
      getAuthReadiness: () => window.BlueCurrentAuthSession?.snapshot?.() || null
    };
  }

  window.createBlueCurrentCloudFoundationModule = createCloudFoundationModule;
})();
