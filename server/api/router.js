
"use strict";

const { URL } = require("url");

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
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

function createRouter({ database, auditService, reservationService, realtimeHub }) {
  return async function route(request, response) {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
      });
      return response.end();
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return sendJson(response, 200, {
        ok: true,
        version: "22.0",
        database: "connected",
        realtimeClients: realtimeHub.count(),
        now: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/bootstrap" && request.method === "GET") {
      const db = await database.read();
      return sendJson(response, 200, {
        organizations: db.organizations,
        locations: db.locations,
        users: db.users,
        configurations: db.configurations,
        featureFlags: db.featureFlags,
        auditLogs: db.auditLogs.slice(-25).reverse(),
        reservations: db.reservations.slice(-25).reverse()
      });
    }

    if (url.pathname === "/api/reservations" && request.method === "GET") {
      return sendJson(response, 200, await database.list("reservations"));
    }

    if (url.pathname === "/api/reservations" && request.method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 201, await reservationService.create(body));
    }

    if (url.pathname === "/api/audit" && request.method === "GET") {
      const logs = await database.list("auditLogs");
      return sendJson(response, 200, logs.slice(-100).reverse());
    }

    if (url.pathname === "/api/audit" && request.method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 201, await auditService.record(body));
    }

    if (url.pathname.startsWith("/api/configurations/") && request.method === "PATCH") {
      const id = decodeURIComponent(url.pathname.split("/").pop());
      const body = await readJson(request);
      const updated = await database.update("configurations", id, body);
      if (!updated) return sendJson(response, 404, { error: "Configuration not found" });
      await auditService.record({ action: `Configuration ${id} updated`, category: "configuration", actor: body.actor || "Cloud API" });
      realtimeHub.publish("configuration:updated", updated);
      return sendJson(response, 200, updated);
    }

    return false;
  };
}

module.exports = createRouter;
