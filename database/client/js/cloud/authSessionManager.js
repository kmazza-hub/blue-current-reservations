(function () {
  "use strict";

  const TOKEN_KEY = "blueCurrentV3230Token";
  const CONTEXT_KEY = "blueCurrentV3420AuthContext";

  class AuthSessionCoordinator extends EventTarget {
    constructor() {
      super();
      this.status = "initializing";
      this.session = null;
      this.lastError = null;
      this.restorePromise = null;
      this.readyPromise = new Promise(resolve => { this.resolveReady = resolve; });
    }

    snapshot() {
      return Object.freeze({
        status: this.status,
        authenticated: this.status === "authenticated",
        session: this.session,
        lastError: this.lastError
      });
    }

    emit(type, detail = {}) {
      this.dispatchEvent(new CustomEvent(type, { detail: { ...detail, snapshot: this.snapshot() } }));
      window.dispatchEvent(new CustomEvent(`bluecurrent:${type}`, { detail: { ...detail, snapshot: this.snapshot() } }));
    }

    persistContext(session) {
      if (!session) {
        localStorage.removeItem(CONTEXT_KEY);
        return;
      }
      localStorage.setItem(CONTEXT_KEY, JSON.stringify({
        organizationId: session.organizationId || null,
        locationIds: Array.isArray(session.locationIds) ? session.locationIds : [],
        role: session.role || null,
        userId: session.user?.id || null,
        updatedAt: new Date().toISOString()
      }));
    }

    readContext() {
      try { return JSON.parse(localStorage.getItem(CONTEXT_KEY)) || null; }
      catch (_) { return null; }
    }

    setStatus(status, detail = {}) {
      this.status = status;
      this.lastError = detail.error || null;
      this.emit("auth-session-state", { status, ...detail });
    }

    async restore(api) {
      if (this.restorePromise) return this.restorePromise;

      this.restorePromise = (async () => {
        const token = localStorage.getItem(TOKEN_KEY) || "";
        if (!token) {
          this.session = null;
          this.setStatus("anonymous", { reason: "no-token" });
          this.resolveReady?.(this.snapshot());
          return this.snapshot();
        }

        this.setStatus("restoring");
        try {
          api.setToken(token);
          const session = await api.me();
          this.session = session;
          this.persistContext(session);
          this.setStatus("authenticated", { session, restored: true });
          this.resolveReady?.(this.snapshot());
          return this.snapshot();
        } catch (error) {
          api.setToken("");
          this.session = null;
          this.persistContext(null);
          this.setStatus("anonymous", { reason: "restore-failed", error });
          this.resolveReady?.(this.snapshot());
          return this.snapshot();
        }
      })();

      return this.restorePromise;
    }

    whenReady() {
      return this.readyPromise;
    }

    authenticate(session, api) {
      if (session?.token) api?.setToken?.(session.token);
      this.session = session;
      this.persistContext(session);
      this.status = "authenticated";
      this.lastError = null;
      this.emit("auth-session-state", { status: "authenticated", session, restored: false });
      return this.snapshot();
    }

    updateSession(session) {
      this.session = session;
      this.persistContext(session);
      this.status = "authenticated";
      this.emit("auth-session-state", { status: "authenticated", session, updated: true });
      return this.snapshot();
    }

    expire(detail = {}) {
      localStorage.removeItem(TOKEN_KEY);
      this.session = null;
      this.persistContext(null);
      this.status = "anonymous";
      this.lastError = detail.reason || "Session expired.";
      this.emit("auth-session-expired", detail);
      this.emit("auth-session-state", { status: "anonymous", reason: "expired", ...detail });
      return this.snapshot();
    }

    signOut(api) {
      api?.setToken?.("");
      this.session = null;
      this.persistContext(null);
      this.status = "anonymous";
      this.lastError = null;
      this.emit("auth-session-state", { status: "anonymous", reason: "signed-out" });
      return this.snapshot();
    }
  }

  window.BlueCurrentAuthSession = new AuthSessionCoordinator();
  window.BLUE_CURRENT_AUTH_SESSION_VERSION = "34.2.0";
})();