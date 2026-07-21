
"use strict";

const { URL } = require("url");

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Payload too large");
  }
  return body ? JSON.parse(body) : {};
}

function bearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function createRouter({ database, auditService, reservationService, realtimeHub, authService }) {
  return async function route(request, response) {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
      });
      return response.end();
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return sendJson(response, 200, {
        ok: true,
        version: "23.0",
        database: "connected",
        auth: "enabled",
        realtimeClients: realtimeHub.count(),
        now: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const body = await readJson(request);
      const result = await authService.login(body.email, body.password, body.organizationId);
      return result
        ? sendJson(response, 200, result)
        : sendJson(response, 401, { error: "Invalid email, password, or organization access." });
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      await authService.logout(bearerToken(request));
      return sendJson(response, 200, { ok: true });
    }

    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      const auth = await authService.authenticate(bearerToken(request));
      if (!auth) return sendJson(response, 401, { error: "Authentication required." });
      const db = await database.read();
      const memberships = (db.memberships || []).filter(item => item.userId === auth.user.id);
      return sendJson(response, 200, {
        user: auth.user,
        organizationId: auth.membership.organizationId,
        role: auth.membership.role,
        locationIds: auth.membership.locationIds,
        organizations: memberships
      });
    }

    if (url.pathname === "/api/auth/switch-organization" && request.method === "POST") {
      const token = bearerToken(request);
      const body = await readJson(request);
      const switched = await authService.switchOrganization(token, body.organizationId);
      return switched
        ? sendJson(response, 200, switched)
        : sendJson(response, 403, { error: "Organization access denied." });
    }

    const auth = await authService.authenticate(bearerToken(request));
    if (!auth) return sendJson(response, 401, { error: "Authentication required." });

    const organizationId = auth.membership.organizationId;
    const allowedLocations = auth.membership.locationIds || [];
    const canAccessLocation = locationId =>
      allowedLocations.includes("*") || allowedLocations.includes(locationId);

    if (url.pathname === "/api/bootstrap" && request.method === "GET") {
      const db = await database.read();
      const locations = (db.locations || []).filter(item =>
        item.organizationId === organizationId && canAccessLocation(item.id)
      );
      const locationIds = new Set(locations.map(item => item.id));
      return sendJson(response, 200, {
        organizations: (db.organizations || []).filter(item => item.id === organizationId),
        locations,
        users: (db.users || []).filter(user =>
          (db.memberships || []).some(m => m.userId === user.id && m.organizationId === organizationId)
        ).map(user => authService.publicUser(user)),
        configurations: (db.configurations || []).filter(item => locationIds.has(item.locationId)),
        featureFlags: (db.featureFlags || []).filter(item => item.organizationId === organizationId),
        auditLogs: (db.auditLogs || []).filter(item => item.organizationId === organizationId).slice(-25).reverse(),
        reservations: (db.reservations || []).filter(item => locationIds.has(item.locationId)).slice(-25).reverse(),
        auth: {
          user: auth.user,
          role: auth.membership.role,
          locationIds: auth.membership.locationIds
        }
      });
    }

    if (url.pathname === "/api/reservations" && request.method === "GET") {
      const reservations = await database.list("reservations", item => canAccessLocation(item.locationId));
      return sendJson(response, 200, reservations);
    }

    if (url.pathname === "/api/reservations" && request.method === "POST") {
      if (!authService.can(auth, "write") && !authService.can(auth, "write_reservations")) {
        return sendJson(response, 403, { error: "Reservation write permission required." });
      }
      const body = await readJson(request);
      if (!canAccessLocation(body.locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 201, await reservationService.create({ ...body, actor: auth.user.name }));
    }

    if (url.pathname === "/api/audit" && request.method === "GET") {
      const logs = await database.list("auditLogs", item => item.organizationId === organizationId);
      return sendJson(response, 200, logs.slice(-100).reverse());
    }

    if (url.pathname === "/api/audit" && request.method === "POST") {
      if (!authService.can(auth, "write")) return sendJson(response, 403, { error: "Write permission required." });
      const body = await readJson(request);
      return sendJson(response, 201, await auditService.record({
        ...body,
        organizationId,
        actor: auth.user.name
      }));
    }

    if (url.pathname === "/api/invitations" && request.method === "GET") {
      if (!authService.can(auth, "invite")) return sendJson(response, 403, { error: "Invite permission required." });
      return sendJson(response, 200, await database.list("invitations", item => item.organizationId === organizationId));
    }

    if (url.pathname === "/api/invitations" && request.method === "POST") {
      if (!authService.can(auth, "invite")) return sendJson(response, 403, { error: "Invite permission required." });
      const body = await readJson(request);
      const invitation = {
        id: `inv_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        organizationId,
        email: String(body.email).toLowerCase(),
        role: body.role || "host",
        locationIds: body.locationIds || [],
        status: "pending",
        token: `BC23-${Math.random().toString(36).slice(2,10).toUpperCase()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      await database.create("invitations", invitation);
      await auditService.record({
        organizationId,
        actor: auth.user.name,
        action: `Invited ${invitation.email} as ${invitation.role}`,
        category: "access"
      });
      return sendJson(response, 201, invitation);
    }

    if (url.pathname.startsWith("/api/configurations/") && request.method === "PATCH") {
      if (!authService.can(auth, "manage_settings")) {
        return sendJson(response, 403, { error: "Settings permission required." });
      }
      const id = decodeURIComponent(url.pathname.split("/").pop());
      const existing = await database.get("configurations", id);
      if (!existing || !canAccessLocation(existing.locationId)) {
        return sendJson(response, 404, { error: "Configuration not found." });
      }
      const body = await readJson(request);
      const updated = await database.update("configurations", id, body);
      await auditService.record({
        organizationId,
        action: `Configuration ${id} updated`,
        category: "configuration",
        actor: auth.user.name
      });
      realtimeHub.publish("configuration:updated", { ...updated, organizationId });
      return sendJson(response, 200, updated);
    }

    return false;
  };
}

module.exports = createRouter;
