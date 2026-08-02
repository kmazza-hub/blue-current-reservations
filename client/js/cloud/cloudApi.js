
(function () {
  "use strict";

  class CloudApi {
    static VERSION = "34.4.0";
    static CAPABILITIES = Object.freeze([
      "health", "login", "logout", "me", "switchOrganization", "floor", "reservationOperations", "staffOperations", "serviceCoordination", "aiBrain", "executiveCommand", "autonomousOperations", "guestIntelligence", "workforceIntelligence", "inventoryIntelligence", "timeClock", "workforceFoundation", "scheduling",
      "commandCenter", "createShiftHandoff", "acknowledgeShiftHandoff", "operationsFeed", "managerActions", "createManagerAction", "updateManagerAction", "deleteManagerAction", "bootstrap", "reservations", "audit", "invitations", "configuration"
    ]);

    constructor(baseUrl = "") {
      this.baseUrl = baseUrl;
      this.eventSource = null;
      this.token = localStorage.getItem("blueCurrentV3230Token") || "";
      this.version = CloudApi.VERSION;
      this.capabilities = [...CloudApi.CAPABILITIES];
      this.requestSequence = 0;
    }

    setToken(token) {
      this.token = token || "";
      if (this.token) localStorage.setItem("blueCurrentV3230Token", this.token);
      else localStorage.removeItem("blueCurrentV3230Token");
    }

    async request(path, options = {}) {
      const method = String(options.method || "GET").toUpperCase();
      const pipeline = window.BlueCurrentRequestPipeline;
      const config = {
        path,
        method,
        body: options.body || null,
        priority: options.priority,
        timeoutMs: options.timeoutMs,
        retries: options.retries,
        cache: options.cache,
        forceRefresh: options.forceRefresh,
        cachePolicy: options.cachePolicy,
        scope: options.scope || "cloud",
        signal: options.signal
      };

      const execute = () => {
        if (!pipeline?.execute) return this.transportRequest(path, options);
        return pipeline.execute(config, ({ signal }) =>
          this.transportRequest(path, { ...options, signal })
        );
      };

      try {
        const result = await execute();
        if (["POST","PUT","PATCH","DELETE"].includes(method)) {
          window.BlueCurrentAuditLedger?.append?.("write", "cloud-write-completed", {
            path,
            method,
            entityType: options.entityType || null,
            entityId: options.entityId || null,
            result
          }, {
            domain: options.entityType || "cloud",
            source: "cloud-api"
          });
        }
        return result;
      } catch (error) {
        const offlineSync = window.BlueCurrentOfflineSync;
        if (offlineSync?.isQueueable?.(path, method, options) && offlineSync.shouldQueue(error)) {
          return offlineSync.enqueue({
            path,
            method,
            body: options.body || null,
            headers: options.headers || {},
            scope: options.scope || "cloud",
            entityType: options.entityType,
            entityId: options.entityId,
            baseVersion: options.baseVersion,
            optimistic: options.optimistic,
            idempotencyKey: options.idempotencyKey
          }, error);
        }
        throw error;
      }
    }

    async transportRequest(path, options = {}) {
      const requestId = ++this.requestSequence;
      const method = String(options.method || "GET").toUpperCase();
      const publicPaths = new Set([
        "/api/health",
        "/api/auth/login",
        "/api/auth/me"
      ]);
      const isPublicRequest = publicPaths.has(path);
      const coordinator = window.BlueCurrentAuthSession;

      if (!isPublicRequest && coordinator?.whenReady) {
        const readiness = await coordinator.whenReady();
        if (!readiness.authenticated) {
          const error = new Error("Authentication required.");
          error.name = "BlueCurrentAuthError";
          error.code = "AUTH_REQUIRED";
          error.status = 401;
          error.path = path;
          error.requestId = requestId;
          throw error;
        }
      }

      const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
      if (this.token) headers.Authorization = `Bearer ${this.token}`;

      let response;
      try {
        response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
      } catch (cause) {
        const error = new Error("Unable to reach the Blue Current Cloud service.");
        error.name = "BlueCurrentNetworkError";
        error.code = "NETWORK_UNAVAILABLE";
        error.path = path;
        error.method = method;
        error.requestId = requestId;
        error.cause = cause;
        throw error;
      }

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        const error = new Error(payload.error || "Authentication required.");
        error.name = "BlueCurrentAuthError";
        error.code = "SESSION_EXPIRED";
        error.status = 401;
        error.path = path;
        error.method = method;
        error.requestId = requestId;
        coordinator?.expire?.({ reason: error.message, path });
        throw error;
      }

      if (!response.ok) {
        const error = new Error(payload.error || `Request failed: ${response.status}`);
        error.name = "BlueCurrentApiError";
        error.code = payload.code || `HTTP_${response.status}`;
        error.status = response.status;
        error.path = path;
        error.method = method;
        error.requestId = requestId;
        error.payload = payload;
        throw error;
      }

      return payload;
    }

    hasCapability(name) { return this.capabilities.includes(name); }
    compatibility() {
      return {
        version: this.version,
        capabilities: [...this.capabilities],
        loginAvailable: typeof this.login === "function",
        requestPipeline: Boolean(window.BlueCurrentRequestPipeline),
        offlineSync: Boolean(window.BlueCurrentOfflineSync),
        auditLedger: Boolean(window.BlueCurrentAuditLedger)
      };
    }

    batch(requests, options = {}) {
      const pipeline = window.BlueCurrentRequestPipeline;
      if (!pipeline?.batch) {
        return Promise.all(requests.map(item =>
          this.request(item.path, { ...(item.options || {}), ...options })
        ));
      }
      return pipeline.batch(
        requests.map(item => ({
          path: item.path,
          method: item.options?.method || "GET",
          body: item.options?.body || null,
          ...(item.options || {})
        })),
        item => ({ signal }) => this.transportRequest(item.path, {
          ...(item.options || {}),
          method: item.method,
          body: item.body,
          signal
        }),
        options
      );
    }

    requestMetrics() {
      return window.BlueCurrentRequestPipeline?.metricsSnapshot?.() || null;
    }

    offlineSyncStatus() {
      return window.BlueCurrentOfflineSync?.snapshot?.() || null;
    }

    auditLedgerStatus() {
      return window.BlueCurrentAuditLedger?.snapshot?.() || null;
    }

    verifyAuditLedger() {
      return window.BlueCurrentAuditLedger?.verify?.() || null;
    }

    exportAuditLedger(filters = {}) {
      return window.BlueCurrentAuditLedger?.exportPackage?.(filters) || null;
    }

    replayOfflineWrites() {
      return window.BlueCurrentOfflineSync?.replay?.() || Promise.resolve(null);
    }

    resolveSyncConflict(conflictId, strategy, mergedBody = null) {
      return window.BlueCurrentOfflineSync?.resolveConflict?.(conflictId, strategy, mergedBody) || null;
    }

    syncVersions() {
      return this.get("/api/sync/versions", {
        cache: false,
        priority: 70
      });
    }

    reconcileSync(entries = []) {
      return this.post("/api/sync/reconcile", { entries }, {
        cache: false,
        priority: 75,
        offlineQueue: false
      });
    }

    reconcileAudit(entryIds = [], headHash = null) {
      return this.post("/api/audit/reconcile", { entryIds, headHash }, {
        cache: false,
        priority: 75,
        offlineQueue: false
      });
    }

    health() { return this.request("/api/health"); }
    commandCenter(locationId = "loc_marina") { return this.request(`/api/command-center?locationId=${encodeURIComponent(locationId)}`); }
    operationsFeed(locationId = "loc_marina", category = "all", limit = 40) { return this.request(`/api/operations-feed?locationId=${encodeURIComponent(locationId)}&category=${encodeURIComponent(category)}&limit=${encodeURIComponent(limit)}`); }
    managerActions(locationId = "loc_marina") { return this.request(`/api/manager-actions?locationId=${encodeURIComponent(locationId)}`); }
    createManagerAction(payload) { return this.request("/api/manager-actions", { method: "POST", body: JSON.stringify(payload) }); }
    updateManagerAction(id, payload) { return this.request(`/api/manager-actions/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }); }
    deleteManagerAction(id, locationId = "loc_marina") { return this.request(`/api/manager-actions/${encodeURIComponent(id)}?locationId=${encodeURIComponent(locationId)}`, { method: "DELETE" }); }
    createShiftHandoff(payload) { return this.request("/api/command-center/handoffs", { method: "POST", body: JSON.stringify(payload) }); }
    acknowledgeShiftHandoff(id) { return this.request(`/api/command-center/handoffs/${encodeURIComponent(id)}/acknowledge`, { method: "PATCH", body: JSON.stringify({}) }); }

    login(payload) { return this.request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }); }
    logout() { return this.request("/api/auth/logout", { method: "POST" }); }
    me() { return this.request("/api/auth/me"); }
    switchOrganization(organizationId) {
      return this.request("/api/auth/switch-organization", { method: "POST", body: JSON.stringify({ organizationId }) });
    }
    bootstrap() { return this.request("/api/bootstrap"); }
    floor(locationId = "loc_marina") {
      return this.request(`/api/floor?locationId=${encodeURIComponent(locationId)}`);
    }
    updateTable(tableId, payload) {
      return this.request(`/api/floor/tables/${encodeURIComponent(tableId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    }
    addWaitlist(payload) {
      return this.request("/api/floor/waitlist", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
    seatWaitlist(payload) {
      return this.request("/api/floor/seat-waitlist", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    scheduling(locationId="loc_marina",weekStart=""){return this.request(`/api/scheduling?locationId=${encodeURIComponent(locationId)}&weekStart=${encodeURIComponent(weekStart)}`);}
    createScheduleShift(payload){return this.request("/api/scheduling/shifts",{method:"POST",body:JSON.stringify(payload)});}
    updateScheduleShift(id,payload){return this.request(`/api/scheduling/shifts/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(payload)});}
    deleteScheduleShift(id){return this.request(`/api/scheduling/shifts/${encodeURIComponent(id)}`,{method:"DELETE"});}
    publishSchedule(payload){return this.request("/api/scheduling/publish",{method:"POST",body:JSON.stringify(payload)});}
    copyPreviousSchedule(payload){return this.request("/api/scheduling/copy-previous",{method:"POST",body:JSON.stringify(payload)});}
    smartFillScheduleShift(payload){return this.request("/api/scheduling/ai/smart-fill",{method:"POST",body:JSON.stringify(payload)});}

    workforceFoundation(locationId="loc_marina"){return this.request(`/api/workforce-foundation?locationId=${encodeURIComponent(locationId)}`);}
    createWorkforceEmployee(payload){return this.request("/api/workforce-foundation/employees",{method:"POST",body:JSON.stringify(payload)});}
    updateWorkforceEmployee(id,payload){return this.request(`/api/workforce-foundation/employees/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(payload)});}
    saveEmployeeAvailability(payload){return this.request("/api/workforce-foundation/availability",{method:"POST",body:JSON.stringify(payload)});}
    createPtoRequest(payload){return this.request("/api/workforce-foundation/pto",{method:"POST",body:JSON.stringify(payload)});}
    decidePtoRequest(id,status,managerComment=""){return this.request(`/api/workforce-foundation/pto/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({status,managerComment})});}
    createShiftTemplate(payload){return this.request("/api/workforce-foundation/shift-templates",{method:"POST",body:JSON.stringify(payload)});}

    timeClock(locationId="loc_marina"){return this.request(`/api/timeclock?locationId=${encodeURIComponent(locationId)}`);}
    clockIn(payload){return this.request("/api/timeclock/clock-in",{method:"POST",body:JSON.stringify(payload)});}
    clockOut(payload){return this.request("/api/timeclock/clock-out",{method:"POST",body:JSON.stringify(payload)});}
    startBreak(payload){return this.request("/api/timeclock/break-start",{method:"POST",body:JSON.stringify(payload)});}
    endBreak(payload){return this.request("/api/timeclock/break-end",{method:"POST",body:JSON.stringify(payload)});}
    correctTimecard(id,payload){return this.request(`/api/timeclock/timecards/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(payload)});}

    inventoryIntelligence(locationId="loc_marina"){return this.request(`/api/inventory-intelligence?locationId=${encodeURIComponent(locationId)}`);}
    decideInventoryRecommendation(id,payload){return this.request(`/api/inventory-intelligence/recommendations/${encodeURIComponent(id)}`,{method:"POST",body:JSON.stringify(payload)});}
    createInventoryPurchaseOrder(payload){return this.request("/api/inventory-intelligence/purchase-orders",{method:"POST",body:JSON.stringify(payload)});}
    updateInventoryPolicy(locationId,payload){return this.request(`/api/inventory-intelligence/policies/${encodeURIComponent(locationId)}`,{method:"PATCH",body:JSON.stringify(payload)});}

    workforceIntelligence(locationId="loc_marina"){return this.request(`/api/workforce-intelligence?locationId=${encodeURIComponent(locationId)}`);}
    decideWorkforceRecommendation(id,payload){return this.request(`/api/workforce-intelligence/recommendations/${encodeURIComponent(id)}`,{method:"POST",body:JSON.stringify(payload)});}
    updateLaborPlan(locationId,payload){return this.request(`/api/workforce-intelligence/plans/${encodeURIComponent(locationId)}`,{method:"PATCH",body:JSON.stringify(payload)});}
    guestIntelligence(){return this.request("/api/guest-intelligence");}
    launchGuestCampaign(id){return this.request(`/api/guest-intelligence/campaigns/${encodeURIComponent(id)}/launch`,{method:"POST",body:"{}"});}
    completeGuestRecovery(id,payload){return this.request(`/api/guest-intelligence/profiles/${encodeURIComponent(id)}/recovery`,{method:"POST",body:JSON.stringify(payload)});}
    autonomousOperations(){return this.request("/api/autonomous-operations");}
    runAutonomousCycle(){return this.request("/api/autonomous-operations/run",{method:"POST",body:"{}"});}
    updateAutonomousPolicy(payload){return this.request("/api/autonomous-operations/policy",{method:"PATCH",body:JSON.stringify(payload)});}
    decideAutonomousAction(id,payload){return this.request(`/api/autonomous-operations/actions/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(payload)});}
    askOperationsDirector(question){return this.request("/api/autonomous-operations/ask",{method:"POST",body:JSON.stringify({question})});}

    executiveCommand(){return this.request("/api/executive-command");}
    updateExecutiveGoal(goalId,payload){return this.request(`/api/executive-command/goals/${encodeURIComponent(goalId)}`,{method:"PATCH",body:JSON.stringify(payload)});}

    aiBrain(locationId = "loc_marina") {
      return this.request(`/api/ai-brain?locationId=${encodeURIComponent(locationId)}`);
    }
    decideAiRecommendation(recommendationId, payload) {
      return this.request(`/api/ai-brain/recommendations/${encodeURIComponent(recommendationId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    }
    refreshAiBrain(locationId = "loc_marina") {
      return this.request("/api/ai-brain/refresh", {
        method: "POST",
        body: JSON.stringify({ locationId })
      });
    }


    serviceCoordination(locationId = "loc_marina") {
      return this.request(`/api/service-coordination?locationId=${encodeURIComponent(locationId)}`);
    }
    updateServiceFlow(flowId, payload) {
      return this.request(`/api/service-coordination/flows/${encodeURIComponent(flowId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    }
    deliverServiceFlow(flowId) {
      return this.request(`/api/service-coordination/deliver/${encodeURIComponent(flowId)}`, {
        method: "POST",
        body: "{}"
      });
    }

    kitchenOperations(locationId="loc_marina"){return this.request(`/api/kitchen-operations?locationId=${encodeURIComponent(locationId)}`)}
    createKitchenTicket(payload){return this.request("/api/kitchen-operations",{method:"POST",body:JSON.stringify(payload)})}
    updateKitchenTicket(id,payload){return this.request(`/api/kitchen-operations/tickets/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(payload)})}
    updateKitchenItem(ticketId,itemId,patch){return this.request("/api/kitchen-operations/item",{method:"PATCH",body:JSON.stringify({ticketId,itemId,patch})})}

    staffOperations(locationId = "loc_marina") {
      return this.request(`/api/staff-operations?locationId=${encodeURIComponent(locationId)}`);
    }
    updateStaff(staffId, payload) {
      return this.request(`/api/staff-operations/staff/${encodeURIComponent(staffId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    }
    assignSection(payload) {
      return this.request("/api/staff-operations/assign-section", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
    reassignTable(payload) {
      return this.request("/api/staff-operations/reassign-table", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    reservationOperations(locationId = "loc_marina") {
      return this.request(`/api/reservation-operations?locationId=${encodeURIComponent(locationId)}`);
    }
    createOperationalReservation(payload) {
      return this.request("/api/reservation-operations", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
    updateOperationalReservation(reservationId, payload) {
      return this.request(`/api/reservation-operations/${encodeURIComponent(reservationId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    }
    seatOperationalReservation(payload) {
      return this.request("/api/reservation-operations/seat", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    listReservations() { return this.request("/api/reservations"); }
    createReservation(payload) {
      return this.request("/api/reservations", { method: "POST", body: JSON.stringify(payload) });
    }
    listAudit() { return this.request("/api/audit"); }
    recordAudit(payload) {
      return this.request("/api/audit", { method: "POST", body: JSON.stringify(payload) });
    }
    listInvitations() { return this.request("/api/invitations"); }
    createInvitation(payload) {
      return this.request("/api/invitations", { method: "POST", body: JSON.stringify(payload) });
    }
    updateConfiguration(id, payload) {
      return this.request(`/api/configurations/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
    }

    connect(onEvent) {
      if (!window.EventSource) return () => {};
      this.eventSource = new EventSource(`${this.baseUrl}/api/events`);
      ["connected", "reservation:created", "configuration:updated", "floor:table-updated", "floor:guest-seated", "floor:waitlist-added", "reservation:updated", "reservation:seated", "staff:updated", "staff:section-assigned", "staff:table-reassigned", "kitchen:ticket-created", "kitchen:ticket-updated", "kitchen:item-updated", "service:guest-seated", "service:flow-updated", "ai:recommendation-decided", "ai:recommendations-refreshed", "executive:goal-updated", "autonomous:cycle-completed", "autonomous:action-decided", "autonomous:policy-updated", "guest:campaign-launched", "guest:recovery-completed"].forEach(type => {
        this.eventSource.addEventListener(type, event => {
          const payload = event.data ? JSON.parse(event.data) : {};
          onEvent(type, payload);
        });
      });
      return () => this.eventSource?.close();
    }
  }

  window.BlueCurrentCloudApi = CloudApi;
  window.BLUE_CURRENT_CLIENT_BUILD = "34.4.0";
})();
