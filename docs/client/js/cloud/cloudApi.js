
(function () {
  "use strict";

  class CloudApi {
    constructor(baseUrl = "") {
      this.baseUrl = baseUrl;
      this.eventSource = null;
    }

    async request(path, options = {}) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Request failed: ${response.status}`);
      }
      return response.json();
    }

    health() { return this.request("/api/health"); }
    bootstrap() { return this.request("/api/bootstrap"); }
    listReservations() { return this.request("/api/reservations"); }
    createReservation(payload) {
      return this.request("/api/reservations", { method: "POST", body: JSON.stringify(payload) });
    }
    listAudit() { return this.request("/api/audit"); }
    recordAudit(payload) {
      return this.request("/api/audit", { method: "POST", body: JSON.stringify(payload) });
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
})();
