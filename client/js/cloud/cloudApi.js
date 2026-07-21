
(function () {
  "use strict";

  class CloudApi {
    static VERSION = "23.0.1";
    static CAPABILITIES = Object.freeze([
      "health", "login", "logout", "me", "switchOrganization",
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
      ["connected", "reservation:created", "configuration:updated"].forEach(type => {
        this.eventSource.addEventListener(type, event => {
          const payload = event.data ? JSON.parse(event.data) : {};
          onEvent(type, payload);
        });
      });
      return () => this.eventSource?.close();
    }
  }

  window.BlueCurrentCloudApi = CloudApi;
  window.BLUE_CURRENT_CLIENT_BUILD = "23.0.1";
})();
