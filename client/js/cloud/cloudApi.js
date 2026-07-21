
(function () {
  "use strict";

  class CloudApi {
    static VERSION = "30.0";
    static CAPABILITIES = Object.freeze([
      "health", "login", "logout", "me", "switchOrganization", "floor", "reservationOperations", "staffOperations", "aiBrain", "executiveCommand", "autonomousOperations", "guestIntelligence", "workforceIntelligence",
      "bootstrap", "reservations", "audit", "invitations", "configuration"
    ]);

    constructor(baseUrl = "") {
      this.baseUrl = baseUrl;
      this.eventSource = null;
      this.token = localStorage.getItem("blueCurrentV23Token") || "";
      this.version = CloudApi.VERSION;
      this.capabilities = [...CloudApi.CAPABILITIES];
    }

    setToken(token) {
      this.token = token || "";
      if (this.token) localStorage.setItem("blueCurrentV23Token", this.token);
      else localStorage.removeItem("blueCurrentV23Token");
    }

    async request(path, options = {}) {
      const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
      if (this.token) headers.Authorization = `Bearer ${this.token}`;
      const response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
      return payload;
    }

    hasCapability(name) { return this.capabilities.includes(name); }
    compatibility() {
      return {
        version: this.version,
        capabilities: [...this.capabilities],
        loginAvailable: typeof this.login === "function"
      };
    }

    health() { return this.request("/api/health"); }
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
  window.BLUE_CURRENT_CLIENT_BUILD = "30.0";
})();
