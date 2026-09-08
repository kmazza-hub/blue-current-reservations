
(function () {
  "use strict";

  function createAuthOrganizationsModule(eventBus, appState, cloudFoundationModule) {
    const api = cloudFoundationModule?.api || new window.BlueCurrentCloudApi("");
    const $ = id => document.getElementById(id);
    let current = null;

    function validateApi() {
      const required = ["login", "logout", "me", "switchOrganization", "createInvitation"];
      const missing = required.filter(method => typeof api?.[method] !== "function");
      if (missing.length) {
        const error = new Error(`Cloud API compatibility failure: missing ${missing.join(", ")}`);
        error.code = "INCOMPATIBLE_CLOUD_API";
        throw error;
      }
      return true;
    }

    function openAuth() {
      $("authOverlay")?.classList.add("open");
      document.body.classList.add("auth-locked");
    }

    function closeAuth() {
      $("authOverlay")?.classList.remove("open");
      document.body.classList.remove("auth-locked");
    }

    function setMessage(message, error = false) {
      const el = $("authMessage");
      if (!el) return;
      el.textContent = message;
      el.classList.toggle("error", error);
    }

    function renderSession(session) {
      current = session;
      $("authUserName").textContent = session.user.name;
      $("authUserRole").textContent = String(session.role).replaceAll("_", " ");
      $("authUserEmail").textContent = session.user.email;
      $("authSessionStatus").textContent = "Authenticated";
      $("authSessionStatus").className = "auth-session-status active";
      const orgSelect = $("authOrganizationSelect");
      orgSelect.innerHTML = session.organizations.map(item =>
        `<option value="${item.organizationId}" ${item.organizationId === session.organizationId ? "selected" : ""}>${item.organizationId === "org_chefs" ? "Chefs International" : "Blue Harbor Hospitality"} · ${item.role.replaceAll("_"," ")}</option>`
      ).join("");
      appState.update({
        authenticatedUser: session.user,
        activeOrganizationId: session.organizationId,
        activeRole: session.role,
        authorizedLocationIds: session.locationIds
      });
    }

    async function restore() {
      try {
        validateApi();
      } catch (error) {
        openAuth();
        setMessage(`${error.message}. Hard-refresh the page once.`, true);
        eventBus.emit("auth:compatibility-error", { message: error.message });
        return;
      }
      if (!api.token) return openAuth();
      try {
        const me = await api.me();
        renderSession(me);
        closeAuth();
        eventBus.emit("auth:restored", me);
      } catch (_) {
        api.setToken("");
        openAuth();
      }
    }

    $("authLoginForm")?.addEventListener("submit", async event => {
      event.preventDefault();
      setMessage("Signing in…");
      try {
        validateApi();
        const session = await api.login({
          email: $("authEmail").value.trim(),
          password: $("authPassword").value
        });
        api.setToken(session.token);
        renderSession(session);
        closeAuth();
        setMessage("");
        eventBus.emit("auth:signed-in", session);
        cloudFoundationModule?.reconnect?.();
      } catch (error) {
        setMessage(error.message, true);
      }
    });

    $("authDemoKeith")?.addEventListener("click", () => {
      $("authEmail").value = "keith@bluecurrent.demo";
      $("authPassword").value = "BlueCurrent23!";
    });

    $("authDemoSarah")?.addEventListener("click", () => {
      $("authEmail").value = "sarah@bluecurrent.demo";
      $("authPassword").value = "Manager23!";
    });

    $("authLogout")?.addEventListener("click", async () => {
      try { await api.logout(); } catch (_) {}
      api.setToken("");
      current = null;
      appState.update({ authenticatedUser: null, activeOrganizationId: null, activeRole: null });
      eventBus.emit("auth:signed-out", {});
      openAuth();
    });

    $("authOrganizationSelect")?.addEventListener("change", async event => {
      try {
        const switched = await api.switchOrganization(event.target.value);
        const refreshed = await api.me();
        renderSession(refreshed);
        eventBus.emit("auth:organization-switched", switched);
        cloudFoundationModule?.reconnect?.();
      } catch (error) {
        alert(error.message);
        renderSession(current);
      }
    });

    $("authInviteForm")?.addEventListener("submit", async event => {
      event.preventDefault();
      const result = $("authInviteResult");
      result.textContent = "Creating invitation…";
      try {
        const invitation = await api.createInvitation({
          email: $("authInviteEmail").value.trim(),
          role: $("authInviteRole").value,
          locationIds: [$("authInviteLocation").value]
        });
        result.textContent = `Invitation created: ${invitation.token}`;
        event.target.reset();
        eventBus.emit("auth:invitation-created", invitation);
      } catch (error) {
        result.textContent = error.message;
      }
    });

    eventBus.emit("auth:module-ready", {
      version: "23.0.1",
      apiVersion: api.version || "unknown",
      compatible: typeof api.login === "function"
    });

    restore();

    return {
      open: openAuth,
      getSession: () => current,
      api
    };
  }

  window.createBlueCurrentAuthOrganizationsModule = createAuthOrganizationsModule;
})();
