
(function () {
  "use strict";

  function createAuthOrganizationsModule(eventBus, appState, cloudFoundationModule) {
    const api = cloudFoundationModule?.api || new window.BlueCurrentCloudApi("");
    const $ = id => document.getElementById(id);
    let current = null;
    const sessionCoordinator = window.BlueCurrentAuthSession;

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

    function commandShell() {
      return $("blueCurrentCommand");
    }

    function moveFocusIntoAuth() {
      const active=document.activeElement;
      const shell=commandShell();
      if(shell && active && shell.contains(active))active.blur?.();
      window.requestAnimationFrame(() => $("authEmail")?.focus?.({preventScroll:true}));
    }

    function focusOutsideAuth() {
      const overlay=$("authOverlay");
      const active=document.activeElement;
      if(overlay && active && overlay.contains(active))active.blur?.();
    }

    function openAuth() {
      const overlay=$("authOverlay");
      if(!overlay)return;
      focusOutsideAuth();
      const shell=commandShell();
      const active=document.activeElement;
      if(shell && active && shell.contains(active))active.blur?.();
      overlay.classList.add("open");
      overlay.removeAttribute("aria-hidden");
      overlay.removeAttribute("inert");
      if(shell){
        shell.setAttribute("aria-hidden","true");
        shell.setAttribute("inert","");
      }
      document.body.classList.add("auth-locked");
      moveFocusIntoAuth();
    }

    function closeAuth() {
      const overlay=$("authOverlay");
      if(!overlay)return;
      focusOutsideAuth();
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden","true");
      overlay.setAttribute("inert","");
      const shell=commandShell();
      if(shell){
        shell.removeAttribute("aria-hidden");
        shell.removeAttribute("inert");
      }
      document.body.classList.remove("auth-locked");
      window.requestAnimationFrame(()=>$("bcCommandTitle")?.focus?.({preventScroll:true}));
    }

    window.BlueCurrentAuthOverlay={open:openAuth,close:closeAuth};

    function setMessage(message, error = false) {
      const el = $("authMessage");
      if (!el) return;
      el.textContent = message;
      el.classList.toggle("error", error);
    }

    function renderSession(session) {
      current = session;
      if ($("authUserName")) $("authUserName").textContent = session.user.name;
      if ($("authUserRole")) $("authUserRole").textContent = String(session.role).replaceAll("_", " ");
      if ($("authUserEmail")) $("authUserEmail").textContent = session.user.email;
      if ($("authSessionStatus")) {
        $("authSessionStatus").textContent = "Authenticated";
        $("authSessionStatus").className = "auth-session-status active";
      }
      const orgSelect = $("authOrganizationSelect");
      if (orgSelect) orgSelect.innerHTML = session.organizations.map(item =>
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
      try {
        const readiness = sessionCoordinator?.restore
          ? await sessionCoordinator.restore(api)
          : api.token
            ? { authenticated: true, session: await api.me() }
            : { authenticated: false };

        if (!readiness.authenticated) {
          openAuth();
          setMessage(readiness.lastError ? "Your session expired. Please sign in again." : "");
          eventBus.emit("auth:required", { reason: readiness.lastError || "anonymous" });
          return;
        }

        renderSession(readiness.session);
        closeAuth();
        setMessage("");
        eventBus.emit("auth:restored", readiness.session);
      } catch (error) {
        api.setToken("");
        sessionCoordinator?.expire?.({ reason: error.message, path: "/api/auth/me" });
        openAuth();
        setMessage("Your session could not be restored. Please sign in again.", true);
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
        sessionCoordinator?.authenticate?.(session, api);
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
      sessionCoordinator?.signOut?.(api);
      current = null;
      appState.update({ authenticatedUser: null, activeOrganizationId: null, activeRole: null });
      eventBus.emit("auth:signed-out", {});
      openAuth();
    });

    $("authOrganizationSelect")?.addEventListener("change", async event => {
      try {
        const switched = await api.switchOrganization(event.target.value);
        const refreshed = await api.me();
        if (sessionCoordinator?.updateSession) {
          sessionCoordinator.updateSession(refreshed);
        } else {
          renderSession(refreshed);
        }
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

    window.addEventListener("bluecurrent:auth-session-expired", event => {
      current = null;
      appState.update({
        authenticatedUser: null,
        activeOrganizationId: null,
        activeRole: null,
        authorizedLocationIds: []
      });
      openAuth();
      setMessage("Your session expired. Please sign in again.", true);
      eventBus.emit("auth:expired", event.detail || {});
    });

    eventBus.emit("auth:module-ready", {
      version: "34.2.0",
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
