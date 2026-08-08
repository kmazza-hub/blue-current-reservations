
"use strict";

const { URL } = require("url");

function sendJson(response, status, payload) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Blue-Current-Idempotency-Key, If-Match, X-Blue-Current-Signature",
    "Access-Control-Expose-Headers": "X-Blue-Current-Idempotency-Replayed, ETag, X-Blue-Current-Resource-Version",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  };
  if (response._idempotencyReplayed) headers["X-Blue-Current-Idempotency-Replayed"] = "true";
  if (response._resourceVersion != null) {
    headers["X-Blue-Current-Resource-Version"] = String(response._resourceVersion);
    headers.ETag = `"${response._resourceVersion}"`;
  }
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));

  const context = response._writeContext;
  if (context && !context.completed) {
    context.completed = true;
    const operation = status < 500
      ? context.idempotencyService.complete(context.idempotencyKey, status, payload)
      : context.idempotencyService.fail(context.idempotencyKey, status, payload);
    operation.catch(() => {});
    if (status >= 200 && status < 400 && context.syncPreparation?.ok) {
      context.syncService.commit({
        key: context.syncPreparation.key,
        organizationId: context.organizationId,
        path: context.path,
        entityId: context.entityId,
        actor: context.actor,
        payload
      }).then(version => {
        response._resourceVersion = version.version;
      }).catch(() => {});
    }
  }
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Payload too large");
  }
  request._rawBody = body;
  request._jsonBody = body ? JSON.parse(body) : {};
  return request._jsonBody;
}

function bearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function createRouter({ database, auditService, idempotencyService, syncReconciliationService, telemetryService, reliabilityAutomationService, reservationService, realtimeHub, authService, floorService, reservationOperationsService, staffOperationsService, kitchenOperationsService, serviceCoordinationService, aiRestaurantBrainService, executiveCommandCenterService, autonomousOperationsService, guestIntelligenceService, workforceIntelligenceService, inventoryIntelligenceService, timeClockService, workforceFoundationService, schedulingService, employeePortalService, commandCenterService, operationsFeedService, actionListService, liveIntegrationService }) {
  return async function route(request, response) {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Blue-Current-Idempotency-Key, If-Match, X-Blue-Current-Signature",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS"
      });
      return response.end();
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return sendJson(response, 200, {
        ok: true,
        version: "44.17.0",
        database: "connected",
        auth: "enabled",
        realtimeClients: realtimeHub.count(),
        now: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/employee-portal/login" && request.method === "POST") {
      const body = await readJson(request);
      const result = await employeePortalService.login(body.employeeId, body.pin);
      return result ? sendJson(response, 200, result) : sendJson(response, 401, { error: "Invalid employee or PIN." });
    }

    if (url.pathname.startsWith("/api/employee-portal/")) {
      const portalToken = (request.headers.authorization || "").replace(/^Bearer /, "");
      const portalAuth = await employeePortalService.authenticate(portalToken);
      if (!portalAuth) return sendJson(response, 401, { error: "Employee portal sign-in required." });
      if (url.pathname === "/api/employee-portal/snapshot" && request.method === "GET") return sendJson(response, 200, await employeePortalService.snapshot(portalAuth.employee.id));
      if (url.pathname === "/api/employee-portal/pto" && request.method === "POST") return sendJson(response, 201, await employeePortalService.requestPto(portalAuth.employee, await readJson(request)));
      if (url.pathname.startsWith("/api/employee-portal/open-shifts/") && request.method === "POST") return sendJson(response, 200, await employeePortalService.claimShift(portalAuth.employee, decodeURIComponent(url.pathname.split("/").pop())));
      if (url.pathname === "/api/employee-portal/swaps" && request.method === "POST") return sendJson(response, 201, await employeePortalService.requestSwap(portalAuth.employee, await readJson(request)));
      if (url.pathname.startsWith("/api/employee-portal/notifications/") && request.method === "PATCH") { const result=await employeePortalService.markRead(portalAuth.employee,decodeURIComponent(url.pathname.split("/").pop())); return result?sendJson(response,200,result):sendJson(response,404,{error:"Notification not found."}); }
    }

    if (url.pathname.startsWith("/api/live/webhooks/") && request.method === "POST") {
      const parts = url.pathname.split("/").filter(Boolean);
      const organizationId = decodeURIComponent(parts[3] || "");
      const source = decodeURIComponent(parts[4] || "");
      if (!organizationId || !source) return sendJson(response, 400, { error: "Webhook organization and source are required." });
      try {
        const body = await readJson(request);
        const bindings = await liveIntegrationService.connectorAuthBindings(organizationId);
        const binding = bindings.bindings.find(item => item.source === source);
        const headerName = binding?.signatureHeader || "x-blue-current-signature";
        const signature = request.headers[headerName] || request.headers["x-blue-current-signature"] || "";
        return sendJson(response, 202, await liveIntegrationService.ingestSignedWebhook(organizationId, source, signature, request._rawBody || "", body));
      } catch (error) {
        try { await liveIntegrationService.recordWebhookFailure(organizationId, source, error); } catch {}
        return sendJson(response, error.statusCode || 400, { error: error.message });
      }
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

    if (url.pathname === "/api/live/connectors" && request.method === "GET") {
      return sendJson(response, 200, { connectors: await liveIntegrationService.listConnectors(organizationId) });
    }

    if (url.pathname === "/api/live/connectors" && request.method === "POST") {
      try {
        const connector = await liveIntegrationService.saveConnector(organizationId, auth.user.name, await readJson(request));
        return sendJson(response, 200, connector);
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }

    if (url.pathname.startsWith("/api/live/connectors/") && url.pathname.endsWith("/test") && request.method === "POST") {
      const id = decodeURIComponent(url.pathname.split("/")[4] || "");
      const connector = await liveIntegrationService.testConnector(organizationId, id, auth.user.name);
      return connector ? sendJson(response, 200, connector) : sendJson(response, 404, { error: "Connector not found." });
    }

    if (url.pathname === "/api/live/events" && request.method === "GET") {
      return sendJson(response, 200, { events: await liveIntegrationService.events(organizationId, url.searchParams.get("limit") || 50) });
    }

    if (url.pathname === "/api/live/events" && request.method === "POST") {
      try {
        const event = await liveIntegrationService.ingestEvent(organizationId, auth.user.name, await readJson(request));
        return sendJson(response, 201, event);
      } catch (error) {
        return sendJson(response, error.statusCode || 400, { error: error.message, deadLetterId: error.deadLetterId || null });
      }
    }

    if (url.pathname === "/api/live/status" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.status(organizationId));
    }

    if (url.pathname === "/api/live/contracts" && request.method === "GET") {
      return sendJson(response, 200, { contracts: liveIntegrationService.contracts() });
    }

    if (url.pathname === "/api/live/adapters" && request.method === "GET") {
      return sendJson(response, 200, { adapters: liveIntegrationService.adapterProfiles() });
    }

    if (url.pathname.startsWith("/api/live/adapters/") && url.pathname.endsWith("/preview") && request.method === "POST") {
      const adapterId = decodeURIComponent(url.pathname.split("/")[4] || "");
      try {
        return sendJson(response, 200, await liveIntegrationService.previewAdapterEvent(adapterId, await readJson(request)));
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }

    if (url.pathname.startsWith("/api/live/adapters/") && url.pathname.endsWith("/ingest") && request.method === "POST") {
      const adapterId = decodeURIComponent(url.pathname.split("/")[4] || "");
      try {
        const event = await liveIntegrationService.ingestAdapterEvent(organizationId, auth.user.name, adapterId, await readJson(request));
        return sendJson(response, event.duplicate ? 200 : 201, event);
      } catch (error) {
        return sendJson(response, error.statusCode || 400, { error: error.message, deadLetterId: error.deadLetterId || null });
      }
    }

    if (url.pathname === "/api/live/delivery-metrics" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.deliveryMetrics(organizationId));
    }

    if (url.pathname === "/api/live/dead-letters" && request.method === "GET") {
      return sendJson(response, 200, { deadLetters: await liveIntegrationService.deadLetters(organizationId, url.searchParams.get("limit") || 50) });
    }

    if (url.pathname.startsWith("/api/live/dead-letters/") && url.pathname.endsWith("/replay") && request.method === "POST") {
      const id = decodeURIComponent(url.pathname.split("/")[4] || "");
      try {
        const result = await liveIntegrationService.replayDeadLetter(organizationId, id, auth.user.name);
        return result ? sendJson(response, 200, result) : sendJson(response, 404, { error: "Dead letter not found." });
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }

    if (url.pathname === "/api/live/operating-snapshot" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.operatingSnapshot(organizationId));
    }

    if (url.pathname === "/api/live/checkpoints" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.sourceCheckpoints(organizationId));
    }

    if (url.pathname === "/api/live/replay-window" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.replayWindow(organizationId, {
        source: url.searchParams.get("source") || "",
        minutes: url.searchParams.get("minutes") || 15,
        limit: url.searchParams.get("limit") || 100
      }));
    }

    if (url.pathname === "/api/live/replay-window/replay" && request.method === "POST") {
      try {
        return sendJson(response, 200, await liveIntegrationService.publishReplayWindow(organizationId, auth.user.name, await readJson(request)));
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }

    if (url.pathname === "/api/live/reasoning-feed" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.reasoningFeed(organizationId));
    }

    if (url.pathname === "/api/live/reconciliation" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.streamReconciliation(organizationId));
    }

    if (url.pathname === "/api/live/backpressure" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.backpressureStatus(organizationId));
    }

    if (url.pathname === "/api/live/backpressure" && request.method === "PUT") {
      try {
        return sendJson(response, 200, await liveIntegrationService.saveBackpressurePolicy(organizationId, auth.user.name, await readJson(request)));
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }

    if (url.pathname === "/api/live/twin-sync" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.twinSyncStatus(organizationId));
    }

    if (url.pathname === "/api/live/twin-sync" && request.method === "POST") {
      try {
        return sendJson(response, 200, await liveIntegrationService.synchronizeTwin(organizationId, auth.user.name));
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }

    if (url.pathname === "/api/live/provenance" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.provenanceLedger(organizationId, url.searchParams.get("limit") || 100));
    }

    if (url.pathname === "/api/live/source-promotion" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.sourcePromotionStatus(organizationId));
    }

    if (url.pathname === "/api/live/source-promotion" && request.method === "POST") {
      try {
        return sendJson(response, 200, await liveIntegrationService.promoteSource(organizationId, auth.user.name, await readJson(request)));
      } catch (error) {
        return sendJson(response, error.statusCode || 400, { error: error.message });
      }
    }

    if (url.pathname === "/api/live/evidence-certification" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.liveEvidenceCertification(organizationId));
    }

    if (url.pathname === "/api/live/evidence-certification" && request.method === "POST") {
      return sendJson(response, 200, await liveIntegrationService.liveEvidenceCertification(organizationId, auth.user.name, true));
    }

    if (url.pathname === "/api/live/auth-bindings" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.connectorAuthBindings(organizationId));
    }

    if (url.pathname === "/api/live/auth-bindings" && request.method === "PUT") {
      try { return sendJson(response, 200, await liveIntegrationService.saveConnectorAuthBinding(organizationId, auth.user.name, await readJson(request))); }
      catch (error) { return sendJson(response, 400, { error: error.message }); }
    }

    if (url.pathname === "/api/live/connection-readiness" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.connectionReadiness(organizationId));
    }

    if (url.pathname === "/api/live/webhook-receipts" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.webhookReceiptLedger(organizationId, url.searchParams.get("limit") || 200));
    }

    if (url.pathname === "/api/live/credential-rotation" && request.method === "POST") {
      try { return sendJson(response, 200, await liveIntegrationService.rotateConnectorSecret(organizationId, auth.user.name, await readJson(request))); }
      catch (error) { return sendJson(response, 400, { error: error.message }); }
    }

    if (url.pathname === "/api/live/provider-launch-certification" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.providerLaunchCertification(organizationId));
    }

    if (url.pathname === "/api/live/provider-launch-certification" && request.method === "POST") {
      return sendJson(response, 200, await liveIntegrationService.providerLaunchCertification(organizationId, auth.user.name, true));
    }

    if (url.pathname === "/api/live/provider-sla" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.providerSlaStatus(organizationId));
    }

    if (url.pathname === "/api/live/provider-sla" && request.method === "PUT") {
      try { return sendJson(response, 200, await liveIntegrationService.saveProviderSlaPolicy(organizationId, auth.user.name, await readJson(request))); }
      catch (error) { return sendJson(response, 400, { error: error.message }); }
    }

    if (url.pathname === "/api/live/provider-quarantine" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.providerQuarantineStatus(organizationId));
    }

    if (url.pathname === "/api/live/provider-quarantine" && request.method === "POST") {
      try { return sendJson(response, 200, await liveIntegrationService.setProviderQuarantine(organizationId, auth.user.name, await readJson(request))); }
      catch (error) { return sendJson(response, 400, { error: error.message }); }
    }

    if (url.pathname === "/api/live/provider-operations-gate" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.providerOperationsGate(organizationId));
    }

    if (url.pathname === "/api/live/provider-operations-gate" && request.method === "POST") {
      return sendJson(response, 200, await liveIntegrationService.providerOperationsGate(organizationId, auth.user.name, true));
    }

    if (url.pathname === "/api/live/provider-incidents" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.providerIncidentLedger(organizationId));
    }

    if (url.pathname === "/api/live/provider-incidents" && request.method === "POST") {
      try { return sendJson(response, 200, await liveIntegrationService.providerIncidentLedger(organizationId, auth.user.name, await readJson(request))); }
      catch (error) { return sendJson(response, 400, { error: error.message }); }
    }

    if (url.pathname === "/api/live/provider-failover" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.providerFailoverPlan(organizationId));
    }

    if (url.pathname === "/api/live/provider-failover" && request.method === "POST") {
      try { return sendJson(response, 200, await liveIntegrationService.providerFailoverPlan(organizationId, auth.user.name, await readJson(request))); }
      catch (error) { return sendJson(response, 400, { error: error.message }); }
    }

    if (url.pathname === "/api/live/provider-continuity-certification" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.providerContinuityCertification(organizationId));
    }

    if (url.pathname === "/api/live/provider-continuity-certification" && request.method === "POST") {
      return sendJson(response, 200, await liveIntegrationService.providerContinuityCertification(organizationId, auth.user.name, true));
    }


    if (url.pathname === "/api/live/provider-recovery-drill" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.providerRecoveryDrill(organizationId));
    }

    if (url.pathname === "/api/live/provider-recovery-drill" && request.method === "POST") {
      try {
        const body = await readJson(request);
        return sendJson(response, 200, await liveIntegrationService.providerRecoveryDrill(organizationId, auth.user.name, { ...body, persist:true }));
      } catch (error) { return sendJson(response, 400, { error:error.message }); }
    }

    if (url.pathname === "/api/live/provider-continuity-telemetry" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.providerContinuityTelemetry(organizationId));
    }

    if (url.pathname === "/api/live/v42-release-certification" && request.method === "GET") {
      return sendJson(response, 200, await liveIntegrationService.v42ReleaseCertification(organizationId));
    }

    if (url.pathname === "/api/live/v42-release-certification" && request.method === "POST") {
      return sendJson(response, 200, await liveIntegrationService.v42ReleaseCertification(organizationId, auth.user.name, true));
    }

    if (url.pathname === "/api/live/location-source-bindings" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.locationSourceBindings(organizationId));
    if (url.pathname === "/api/live/location-source-bindings" && request.method === "POST") { try { return sendJson(response, 200, await liveIntegrationService.locationSourceBindings(organizationId, auth.user.name, await readJson(request))); } catch (error) { return sendJson(response, 400, { error:error.message }); } }
    if (url.pathname === "/api/live/coverage-matrix" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.liveCoverageMatrix(organizationId));
    if (url.pathname === "/api/live/enterprise-readiness" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.enterpriseLiveReadiness(organizationId));
    if (url.pathname === "/api/live/enterprise-readiness" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.enterpriseLiveReadiness(organizationId, auth.user.name, true));
    if (url.pathname === "/api/live/location-cutover" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.locationCutoverControl(organizationId));
    if (url.pathname === "/api/live/location-cutover" && request.method === "POST") { try { return sendJson(response, 200, await liveIntegrationService.locationCutoverControl(organizationId, auth.user.name, await readJson(request))); } catch (error) { return sendJson(response, 400, { error:error.message }); } }
    if (url.pathname === "/api/live/portfolio-telemetry" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.portfolioLiveTelemetry(organizationId));
    if (url.pathname === "/api/live/enterprise-pilot-certification" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.enterprisePilotCutoverCertification(organizationId));
    if (url.pathname === "/api/live/enterprise-pilot-certification" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.enterprisePilotCutoverCertification(organizationId, auth.user.name, true));
    if (url.pathname === "/api/live/pilot-sessions" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.pilotSessions(organizationId));
    if (url.pathname === "/api/live/pilot-sessions" && request.method === "POST") { try { return sendJson(response, 200, await liveIntegrationService.pilotSessions(organizationId, auth.user.name, await readJson(request))); } catch (error) { return sendJson(response, 400, { error:error.message }); } }
    if (url.pathname === "/api/live/pilot-signal-validation" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.pilotSignalValidation(organizationId));
    if (url.pathname === "/api/live/mvp-readiness-certification" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.mvpReadinessCertification(organizationId));
    if (url.pathname === "/api/live/mvp-readiness-certification" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.mvpReadinessCertification(organizationId, auth.user.name, true));


    if (url.pathname === "/api/live/pilot-slo" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.pilotSlo(organizationId));
    if (url.pathname === "/api/live/pilot-support" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.pilotSupport(organizationId));
    if (url.pathname === "/api/live/pilot-support" && request.method === "POST") { try { return sendJson(response, 200, await liveIntegrationService.pilotSupport(organizationId, auth.user.name, await readJson(request))); } catch (error) { return sendJson(response, 400, { error:error.message }); } }
    if (url.pathname === "/api/live/mvp-go-live-certification" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.mvpGoLiveCertification(organizationId));
    if (url.pathname === "/api/live/mvp-go-live-certification" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.mvpGoLiveCertification(organizationId, auth.user.name, true));

    if (url.pathname === "/api/live/production-rollout" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.productionRolloutPlan(organizationId));
    if (url.pathname === "/api/live/production-rollout" && request.method === "POST") { try { return sendJson(response, 200, await liveIntegrationService.productionRolloutPlan(organizationId, auth.user.name, await readJson(request))); } catch (error) { return sendJson(response, 400, { error:error.message }); } }
    if (url.pathname === "/api/live/rollback-readiness" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.rollbackReadiness(organizationId));
    if (url.pathname === "/api/live/production-release-certification" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.productionReleaseCertification(organizationId));
    if (url.pathname === "/api/live/production-release-certification" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.productionReleaseCertification(organizationId, auth.user.name, true));

    if (url.pathname === "/api/live/production-observation" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.productionObservationSessions(organizationId));
    if (url.pathname === "/api/live/production-observation" && request.method === "POST") { try { return sendJson(response, 200, await liveIntegrationService.productionObservationSessions(organizationId, auth.user.name, await readJson(request))); } catch (error) { return sendJson(response, 400, { error:error.message }); } }
    if (url.pathname === "/api/live/production-health" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.productionHealthTelemetry(organizationId));
    if (url.pathname === "/api/live/v42-closure-certification" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.v42ClosureCertification(organizationId));
    if (url.pathname === "/api/live/v42-closure-certification" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.v42ClosureCertification(organizationId, auth.user.name, true));
    if (url.pathname === "/api/executive/live-brief" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveLiveBrief(organizationId));
    if (url.pathname === "/api/executive/risk-queue" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveRiskQueue(organizationId));
    if (url.pathname === "/api/executive/decision-gate" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveDecisionGate(organizationId));
    if (url.pathname === "/api/executive/decision-gate" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.executiveDecisionGate(organizationId, auth.user.name, true));
    if (url.pathname === "/api/executive/insights" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveInsights(organizationId));
    if (url.pathname === "/api/executive/recommendations" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveRecommendations(organizationId));
    if (url.pathname === "/api/executive/workspace-v43" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveDecisionWorkspaceV43(organizationId));
    if (url.pathname === "/api/executive/workspace-v43" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.executiveDecisionWorkspaceV43(organizationId, auth.user.name, true));
    if (url.pathname === "/api/executive/kpi-studio" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveKpiStudio(organizationId));
    if (url.pathname === "/api/executive/kpi-studio" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.executiveKpiStudio(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/executive/timeline" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveTimeline(organizationId));
    if (url.pathname === "/api/executive/portfolio-health" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executivePortfolioHealth(organizationId));
    if (url.pathname === "/api/executive/knowledge-graph" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveKnowledgeGraph(organizationId));
    if (url.pathname === "/api/executive/reasoning" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveReasoning(organizationId));
    if (url.pathname === "/api/executive/simulate" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.executiveDecisionSimulation(organizationId, await readJson(request)));
    if (url.pathname === "/api/executive/ai-console" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.executiveAiConsole(organizationId, await readJson(request)));
    if (url.pathname === "/api/executive/conversation-session" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveConversationSession(organizationId));
    if (url.pathname === "/api/executive/conversation-session" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.executiveConversationSession(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/executive/evidence-citations" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveEvidenceCitationMap(organizationId));
    if (url.pathname === "/api/executive/action-drafts" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveActionDraft(organizationId));
    if (url.pathname === "/api/executive/action-drafts" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.executiveActionDraft(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/executive/ai-readiness" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveAiReadiness(organizationId));
    if (url.pathname === "/api/executive/intent-router" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.executiveIntentRouter(organizationId, await readJson(request)));
    if (url.pathname === "/api/executive/approval-queue" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveApprovalQueue(organizationId));
    if (url.pathname === "/api/executive/approval-queue" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.executiveApprovalQueue(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/executive/workflows" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.executiveWorkflowComposer(organizationId));
    if (url.pathname === "/api/executive/workflows" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.executiveWorkflowComposer(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/executive/v43-closure" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.v43ClosureCertification(organizationId));
    if (url.pathname === "/api/executive/v43-closure" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.v43ClosureCertification(organizationId, auth.user.name, true));
    if (url.pathname === "/api/aip/capabilities" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipCapabilityRegistry(organizationId));
    if (url.pathname === "/api/aip/automations" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipAutomationCompiler(organizationId));
    if (url.pathname === "/api/aip/automations" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.aipAutomationCompiler(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/aip/sandbox" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipExecutionSandbox(organizationId));
    if (url.pathname === "/api/aip/sandbox" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.aipExecutionSandbox(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/aip/runtime-readiness" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipRuntimeReadiness(organizationId));
    if (url.pathname === "/api/aip/agent-runs" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipAgentRuns(organizationId));
    if (url.pathname === "/api/aip/agent-runs" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.aipAgentRuns(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/aip/execution-context" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipExecutionContext(organizationId, url.searchParams.get("runId")));
    if (url.pathname === "/api/aip/runtime-control" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipRuntimeLifecycle(organizationId, url.searchParams.get("runId")));
    if (url.pathname === "/api/aip/runtime-control" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.aipAgentRunControl(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/aip/orchestrations" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipMultiAgentOrchestrations(organizationId));
    if (url.pathname === "/api/aip/orchestrations" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.aipMultiAgentOrchestrations(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/aip/orchestration-context" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipOrchestrationContext(organizationId, url.searchParams.get("orchestrationId")));
    if (url.pathname === "/api/aip/orchestration-control" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.aipOrchestrationControl(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/aip/approvals" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipApprovalOrchestration(organizationId));
    if (url.pathname === "/api/aip/approvals" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.aipApprovalOrchestration(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/aip/coordination-readiness" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipCoordinationReadiness(organizationId));
    if (url.pathname === "/api/aip/workflow-definitions" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipWorkflowDefinitions(organizationId));
    if (url.pathname === "/api/aip/workflow-definitions" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.aipWorkflowDefinitions(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/aip/workflow-instances" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipWorkflowInstances(organizationId));
    if (url.pathname === "/api/aip/workflow-instances" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.aipWorkflowInstances(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/aip/workflow-control" && request.method === "POST") return sendJson(response, 200, await liveIntegrationService.aipWorkflowControl(organizationId, auth.user.name, await readJson(request)));
    if (url.pathname === "/api/aip/workflow-history" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipWorkflowHistory(organizationId, url.searchParams.get("instanceId")));
    if (url.pathname === "/api/aip/workflow-readiness" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipWorkflowReadiness(organizationId));


    if (url.pathname === "/api/observability/snapshot" && request.method === "GET") {
      return sendJson(response, 200, await telemetryService.snapshot());
    }

    if (url.pathname === "/api/reliability/slo" && request.method === "GET") {
      return sendJson(response, 200, await reliabilityAutomationService.evaluate(organizationId));
    }

    if (url.pathname === "/api/reliability/slo" && request.method === "PUT") {
      const body = request._jsonBody || await readJson(request);
      const objectives = Array.isArray(body.objectives) ? body.objectives : [];
      return sendJson(response, 200, {
        objectives: await reliabilityAutomationService.saveObjectives(
          objectives,
          auth.user.name,
          organizationId
        )
      });
    }

    if (url.pathname === "/api/reliability/history" && request.method === "GET") {
      return sendJson(response, 200, await reliabilityAutomationService.history());
    }

    if (url.pathname.startsWith("/api/reliability/runbooks/") && request.method === "POST") {
      const body = request._jsonBody || await readJson(request);
      const runbookId = decodeURIComponent(url.pathname.split("/").pop());
      const execution = await reliabilityAutomationService.executeRunbook(
        runbookId,
        body,
        auth.user.name,
        organizationId
      );
      if (!execution) return sendJson(response, 404, { error: "Runbook not found." });
      return sendJson(response, 200, execution);
    }

    if (url.pathname === "/api/observability/incidents" && request.method === "POST") {
      const body = request._jsonBody || await readJson(request);
      const incident = await telemetryService.createIncident({
        ...body,
        organizationId
      }, auth.user.name);
      await auditService.record({
        organizationId,
        actor: auth.user.name,
        action: `Observability incident created: ${incident.title}`,
        category: "observability"
      });
      return sendJson(response, 201, incident);
    }

    if (url.pathname.startsWith("/api/observability/incidents/") && request.method === "PATCH") {
      const body = request._jsonBody || await readJson(request);
      const incidentId = decodeURIComponent(url.pathname.split("/").pop());
      const incident = await telemetryService.updateIncident(incidentId, body, auth.user.name);
      if (!incident) return sendJson(response, 404, { error: "Incident not found." });
      await auditService.record({
        organizationId,
        actor: auth.user.name,
        action: `Observability incident updated: ${incident.title}`,
        category: "observability"
      });
      return sendJson(response, 200, incident);
    }

    const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
    if (writeMethods.has(request.method)) {
      const idempotencyKey = idempotencyService.key(request, organizationId);
      if (idempotencyKey) {
        const existing = await idempotencyService.find(idempotencyKey);
        if (existing?.status === "complete" || existing?.status === "failed") {
          response._idempotencyReplayed = true;
          return sendJson(response, existing.responseStatus, existing.responsePayload);
        }
        if (existing?.status === "processing") {
          return sendJson(response, 409, {
            error: "An operation with this idempotency key is already processing.",
            code: "IDEMPOTENCY_IN_PROGRESS"
          });
        }
        await idempotencyService.reserve(idempotencyKey, {
          method: request.method,
          path: url.pathname,
          organizationId,
          userId: auth.user.id
        });
      }

      const body = request._jsonBody || await readJson(request);
      const entityId = body.id || body.entityId || body.reservationId || body.tableId ||
        decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "collection");
      const ifMatch = request.headers["if-match"];
      const expectedVersion = ifMatch
        ? Number(String(ifMatch).replaceAll('"', ""))
        : body.baseVersion ?? null;
      const preparation = await syncReconciliationService.prepare({
        organizationId,
        path: url.pathname,
        entityId,
        expectedVersion
      });

      if (!preparation.ok) {
        const current = await database.get("resourceVersions", preparation.key);
        if (idempotencyKey) {
          await idempotencyService.fail(idempotencyKey, 412, {
            error: "The resource changed after the client snapshot.",
            code: "VERSION_CONFLICT",
            version: preparation.currentVersion,
            expectedVersion: preparation.expectedVersion,
            current: current?.lastPayload || null
          });
        }
        return sendJson(response, 412, {
          error: "The resource changed after the client snapshot.",
          code: "VERSION_CONFLICT",
          version: preparation.currentVersion,
          expectedVersion: preparation.expectedVersion,
          current: current?.lastPayload || null
        });
      }

      response._writeContext = {
        idempotencyService,
        syncService: syncReconciliationService,
        idempotencyKey,
        syncPreparation: preparation,
        organizationId,
        path: url.pathname,
        entityId,
        actor: auth.user.name,
        completed: false
      };
    }

    if (url.pathname === "/api/sync/reconcile" && request.method === "POST") {
      const body = request._jsonBody || await readJson(request);
      return sendJson(response, 200, await syncReconciliationService.reconcile(
        organizationId,
        Array.isArray(body.entries) ? body.entries : []
      ));
    }

    if (url.pathname === "/api/sync/versions" && request.method === "GET") {
      const db = await database.read();
      return sendJson(response, 200, {
        organizationId,
        versions: (db.resourceVersions || []).filter(item => item.organizationId === organizationId)
      });
    }

    if (url.pathname === "/api/audit/reconcile" && request.method === "POST") {
      const body = request._jsonBody || await readJson(request);
      const db = await database.read();
      const cloudEntries = (db.auditLogs || []).filter(item => item.organizationId === organizationId);
      const clientIds = new Set(Array.isArray(body.entryIds) ? body.entryIds : []);
      return sendJson(response, 200, {
        organizationId,
        reconciledAt: new Date().toISOString(),
        cloudHead: cloudEntries.at(-1)?.id || null,
        cloudEntries,
        missingOnClient: cloudEntries.filter(item => !clientIds.has(item.id)),
        receivedClientHead: body.headHash || null
      });
    }

    if (url.pathname === "/api/operations-feed" && request.method === "GET") {
      const locationId = url.searchParams.get("locationId") || "loc_marina";
      const category = url.searchParams.get("category") || "all";
      const limit = Number(url.searchParams.get("limit") || 40);
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 200, await operationsFeedService.list(organizationId, locationId, category, limit));
    }

    if (url.pathname === "/api/manager-actions" && request.method === "GET") {
      const locationId = url.searchParams.get("locationId") || "loc_marina";
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 200, await actionListService.list(organizationId, locationId));
    }

    if (url.pathname === "/api/manager-actions" && request.method === "POST") {
      const body = await readJson(request);
      const locationId = body.locationId || "loc_marina";
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      const created = await actionListService.create(organizationId, locationId, body, auth.user);
      return sendJson(response, 201, created);
    }

    const managerActionMatch = url.pathname.match(/^\/api\/manager-actions\/([^/]+)$/);
    if (managerActionMatch && request.method === "PATCH") {
      const body = await readJson(request);
      const locationId = body.locationId || "loc_marina";
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      const updated = await actionListService.update(
        organizationId,
        locationId,
        decodeURIComponent(managerActionMatch[1]),
        body,
        auth.user
      );
      return updated
        ? sendJson(response, 200, updated)
        : sendJson(response, 404, { error: "Manager action not found." });
    }

    if (managerActionMatch && request.method === "DELETE") {
      const locationId = url.searchParams.get("locationId") || "loc_marina";
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      const deleted = await actionListService.delete(
        organizationId,
        locationId,
        decodeURIComponent(managerActionMatch[1]),
        auth.user
      );
      return deleted
        ? sendJson(response, 200, { deleted: true, action: deleted })
        : sendJson(response, 404, { error: "Manager action not found." });
    }

    if (url.pathname === "/api/command-center" && request.method === "GET") {
      const locationId = url.searchParams.get("locationId") || "loc_marina";
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      const snapshot = await commandCenterService.snapshot(organizationId, locationId);
      return snapshot ? sendJson(response, 200, snapshot) : sendJson(response, 404, { error: "Location not found." });
    }

    if (url.pathname === "/api/command-center/handoffs" && request.method === "POST") {
      const body = await readJson(request);
      const locationId = body.locationId || "loc_marina";
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      try {
        const handoff = await commandCenterService.createHandoff(organizationId, locationId, auth.user, body);
        return sendJson(response, 201, handoff);
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }

    const handoffAckMatch = url.pathname.match(/^\/api\/command-center\/handoffs\/([^/]+)\/acknowledge$/);
    if (handoffAckMatch && request.method === "PATCH") {
      const handoff = await commandCenterService.acknowledgeHandoff(organizationId, decodeURIComponent(handoffAckMatch[1]), auth.user);
      return handoff ? sendJson(response, 200, handoff) : sendJson(response, 404, { error: "Shift handoff not found." });
    }

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


    if (url.pathname === "/api/floor" && request.method === "GET") {
      const locationId = url.searchParams.get("locationId") || "loc_marina";
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 200, await floorService.snapshot(locationId));
    }

    if (url.pathname.startsWith("/api/floor/tables/") && request.method === "PATCH") {
      if (!authService.can(auth, "write") && !authService.can(auth, "write_operations")) {
        return sendJson(response, 403, { error: "Floor write permission required." });
      }
      const tableId = decodeURIComponent(url.pathname.split("/").pop());
      const table = await database.get("tables", tableId);
      if (!table || !canAccessLocation(table.locationId)) {
        return sendJson(response, 404, { error: "Table not found." });
      }
      const body = await readJson(request);
      const updated = await floorService.updateTable(
        tableId,
        body,
        auth.user.name,
        organizationId
      );
      return sendJson(response, 200, updated);
    }

    if (url.pathname === "/api/floor/waitlist" && request.method === "POST") {
      if (!authService.can(auth, "write") && !authService.can(auth, "write_reservations")) {
        return sendJson(response, 403, { error: "Waitlist write permission required." });
      }
      const body = await readJson(request);
      if (!canAccessLocation(body.locationId)) {
        return sendJson(response, 403, { error: "Location access denied." });
      }
      return sendJson(response, 201, await floorService.addWaitlist(
        body,
        auth.user.name,
        organizationId
      ));
    }

    if (url.pathname === "/api/floor/seat-waitlist" && request.method === "POST") {
      if (!authService.can(auth, "write") && !authService.can(auth, "write_reservations")) {
        return sendJson(response, 403, { error: "Seating permission required." });
      }
      const body = await readJson(request);
      const table = await database.get("tables", body.tableId);
      if (!table || !canAccessLocation(table.locationId)) {
        return sendJson(response, 404, { error: "Table not found." });
      }
      const result = await floorService.seatWaitlist(
        body.waitlistId,
        body.tableId,
        auth.user.name,
        organizationId
      );
      return result
        ? sendJson(response, 200, result)
        : sendJson(response, 409, { error: "Unable to seat this party." });
    }









    if (url.pathname === "/api/scheduling" && request.method === "GET") {
      const locationId=url.searchParams.get("locationId")||"loc_marina"; if(!canAccessLocation(locationId))return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await schedulingService.snapshot(organizationId,locationId,url.searchParams.get("weekStart")));
    }
    if (url.pathname === "/api/scheduling/shifts" && request.method === "POST") {
      if(!authService.can(auth,"write")&&!authService.can(auth,"write_operations"))return sendJson(response,403,{error:"Scheduling write permission required."});
      const body=await readJson(request);if(!canAccessLocation(body.locationId))return sendJson(response,403,{error:"Location access denied."});return sendJson(response,201,await schedulingService.create(body,auth.user.name,organizationId));
    }
    if (url.pathname.startsWith("/api/scheduling/shifts/") && request.method === "PATCH") {const id=decodeURIComponent(url.pathname.split("/").pop());const result=await schedulingService.update(id,await readJson(request),auth.user.name,organizationId);return result?sendJson(response,200,result):sendJson(response,404,{error:"Shift not found."});}
    if (url.pathname.startsWith("/api/scheduling/shifts/") && request.method === "DELETE") {const id=decodeURIComponent(url.pathname.split("/").pop());return (await schedulingService.remove(id,auth.user.name,organizationId))?sendJson(response,200,{ok:true}):sendJson(response,404,{error:"Shift not found."});}
    if (url.pathname === "/api/scheduling/publish" && request.method === "POST") {const body=await readJson(request);if(!canAccessLocation(body.locationId))return sendJson(response,403,{error:"Location access denied."});return sendJson(response,200,await schedulingService.publish(body,auth.user.name,organizationId));}
    if (url.pathname === "/api/scheduling/copy-previous" && request.method === "POST") {const body=await readJson(request);if(!canAccessLocation(body.locationId))return sendJson(response,403,{error:"Location access denied."});return sendJson(response,200,await schedulingService.copyPrevious(body,auth.user.name,organizationId));}
    if (url.pathname === "/api/scheduling/ai/smart-fill" && request.method === "POST") {const result=await schedulingService.smartFill(await readJson(request),auth.user.name,organizationId);return result?sendJson(response,200,result):sendJson(response,404,{error:"Shift not found."});}

    if (url.pathname === "/api/workforce-foundation" && request.method === "GET") {
      const locationId = url.searchParams.get("locationId") || "loc_marina";
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 200, await workforceFoundationService.snapshot(organizationId, locationId));
    }
    if (url.pathname === "/api/workforce-foundation/employees" && request.method === "POST") {
      if (!authService.can(auth, "write") && !authService.can(auth, "write_operations")) return sendJson(response, 403, { error: "Workforce write permission required." });
      const body = await readJson(request);
      if (!canAccessLocation(body.locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 201, await workforceFoundationService.createEmployee(body, auth.user.name, organizationId));
    }
    if (url.pathname.startsWith("/api/workforce-foundation/employees/") && request.method === "PATCH") {
      const id = decodeURIComponent(url.pathname.split("/").pop());
      const updated = await workforceFoundationService.updateEmployee(id, await readJson(request), auth.user.name, organizationId);
      return updated ? sendJson(response, 200, updated) : sendJson(response, 404, { error: "Employee not found." });
    }
    if (url.pathname === "/api/workforce-foundation/availability" && request.method === "POST") {
      const result = await workforceFoundationService.saveAvailability(await readJson(request), auth.user.name, organizationId);
      return result ? sendJson(response, 200, result) : sendJson(response, 404, { error: "Employee not found." });
    }
    if (url.pathname === "/api/workforce-foundation/pto" && request.method === "POST") {
      const result = await workforceFoundationService.requestPto(await readJson(request), auth.user.name, organizationId);
      return result ? sendJson(response, 201, result) : sendJson(response, 404, { error: "Employee not found." });
    }
    if (url.pathname.startsWith("/api/workforce-foundation/pto/") && request.method === "PATCH") {
      const id = decodeURIComponent(url.pathname.split("/").pop());
      const body = await readJson(request);
      const result = await workforceFoundationService.decidePto(id, body.status, body.managerComment, auth.user.name, organizationId);
      return result ? sendJson(response, 200, result) : sendJson(response, 404, { error: "PTO request not found." });
    }
    if (url.pathname === "/api/workforce-foundation/shift-templates" && request.method === "POST") {
      const body = await readJson(request);
      if (!canAccessLocation(body.locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 201, await workforceFoundationService.createShiftTemplate(body, auth.user.name, organizationId));
    }

    if (url.pathname === "/api/timeclock" && request.method === "GET") {
      const locationId = url.searchParams.get("locationId") || "loc_marina";
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 200, await timeClockService.snapshot(organizationId, locationId));
    }
    if (url.pathname === "/api/timeclock/clock-in" && request.method === "POST") {
      const body = await readJson(request);
      if (!canAccessLocation(body.locationId || "loc_marina")) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 201, await timeClockService.clockIn(body, auth.user.name, organizationId));
    }
    if (url.pathname === "/api/timeclock/clock-out" && request.method === "POST") return sendJson(response, 200, await timeClockService.clockOut(await readJson(request), auth.user.name, organizationId));
    if (url.pathname === "/api/timeclock/break-start" && request.method === "POST") return sendJson(response, 201, await timeClockService.startBreak(await readJson(request), auth.user.name, organizationId));
    if (url.pathname === "/api/timeclock/break-end" && request.method === "POST") return sendJson(response, 200, await timeClockService.endBreak(await readJson(request), auth.user.name, organizationId));
    if (url.pathname.startsWith("/api/timeclock/timecards/") && request.method === "PATCH") {
      const timecardId = decodeURIComponent(url.pathname.split("/").pop());
      return sendJson(response, 200, await timeClockService.correct(timecardId, await readJson(request), auth.user.name, organizationId));
    }

    if (url.pathname === "/api/inventory-intelligence" && request.method === "GET") return sendJson(response,200,await inventoryIntelligenceService.snapshot(organizationId,url.searchParams.get("locationId")||"loc_marina"));
    if (url.pathname.startsWith("/api/inventory-intelligence/recommendations/") && request.method === "POST") {
      const id=decodeURIComponent(url.pathname.split("/").pop()), body=await readJson(request);
      return sendJson(response,200,await inventoryIntelligenceService.act(id,body,auth.user.name,organizationId));
    }
    if (url.pathname === "/api/inventory-intelligence/purchase-orders" && request.method === "POST") {
      const body=await readJson(request);
      return sendJson(response,201,await inventoryIntelligenceService.createPurchaseOrder(body,auth.user.name,organizationId));
    }
    if (url.pathname.startsWith("/api/inventory-intelligence/policies/") && request.method === "PATCH") {
      const locationId=decodeURIComponent(url.pathname.split("/").pop()), body=await readJson(request);
      return sendJson(response,200,await inventoryIntelligenceService.updatePolicy(locationId,body,auth.user.name,organizationId));
    }

    if (url.pathname === "/api/workforce-intelligence" && request.method === "GET") return sendJson(response,200,await workforceIntelligenceService.snapshot(organizationId,url.searchParams.get("locationId")||"loc_marina"));
    if (url.pathname.startsWith("/api/workforce-intelligence/recommendations/") && request.method === "POST") { const id=decodeURIComponent(url.pathname.split("/").pop()),body=await readJson(request); return sendJson(response,200,await workforceIntelligenceService.act(id,body,auth.user.name,organizationId)); }
    if (url.pathname.startsWith("/api/workforce-intelligence/plans/") && request.method === "PATCH") { const locationId=decodeURIComponent(url.pathname.split("/").pop()),body=await readJson(request); return sendJson(response,200,await workforceIntelligenceService.updatePlan(locationId,body,auth.user.name,organizationId)); }

    if (url.pathname === "/api/guest-intelligence" && request.method === "GET") return sendJson(response,200,await guestIntelligenceService.snapshot(organizationId));
    if (url.pathname.startsWith("/api/guest-intelligence/campaigns/") && url.pathname.endsWith("/launch") && request.method === "POST") { const id=url.pathname.split("/")[4]; const result=await guestIntelligenceService.launchCampaign(id,auth.user.name,organizationId); return result?sendJson(response,200,result):sendJson(response,404,{error:"Campaign not found."}); }
    if (url.pathname.startsWith("/api/guest-intelligence/profiles/") && url.pathname.endsWith("/recovery") && request.method === "POST") { const id=url.pathname.split("/")[4],body=await readJson(request); return sendJson(response,200,await guestIntelligenceService.recordRecovery(id,body,auth.user.name,organizationId)); }

    if (url.pathname === "/api/autonomous-operations" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.snapshot(organizationId));
    if (url.pathname === "/api/autonomous-operations/run" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      return sendJson(response,200,await autonomousOperationsService.runCycle(organizationId,auth.user.name));
    }
    if (url.pathname === "/api/autonomous-operations/policy" && request.method === "PATCH") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Policy permission required."});
      return sendJson(response,200,await autonomousOperationsService.updatePolicy(await readJson(request),auth.user.name,organizationId));
    }
    if (url.pathname.startsWith("/api/autonomous-operations/actions/") && request.method === "PATCH") {
      const id=decodeURIComponent(url.pathname.split("/").pop()),updated=await autonomousOperationsService.decide(id,await readJson(request),auth.user.name,organizationId);
      return updated?sendJson(response,200,updated):sendJson(response,404,{error:"Action not found."});
    }
    if (url.pathname === "/api/autonomous-operations/ask" && request.method === "POST") {
      const body=await readJson(request);return sendJson(response,200,await autonomousOperationsService.ask(body.question,organizationId));
    }

    if (url.pathname === "/api/executive-command" && request.method === "GET") {
      return sendJson(response,200,await executiveCommandCenterService.snapshot(organizationId));
    }
    if (url.pathname.startsWith("/api/executive-command/goals/") && request.method === "PATCH") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Executive goal permission required."});
      const goalId=decodeURIComponent(url.pathname.split("/").pop()), body=await readJson(request), goal=await database.get("executiveGoals",goalId);
      if(!goal||goal.organizationId!==organizationId) return sendJson(response,404,{error:"Goal not found."});
      return sendJson(response,200,await executiveCommandCenterService.updateGoal(goalId,body,auth.user.name,organizationId));
    }

    if (url.pathname === "/api/ai-brain" && request.method === "GET") {
      const locationId = url.searchParams.get("locationId") || "loc_marina";
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 200, await aiRestaurantBrainService.snapshot(locationId));
    }

    if (url.pathname.startsWith("/api/ai-brain/recommendations/") && request.method === "PATCH") {
      if (!authService.can(auth, "write") && !authService.can(auth, "write_operations")) {
        return sendJson(response, 403, { error: "AI decision permission required." });
      }
      const recommendationId = decodeURIComponent(url.pathname.split("/").pop());
      const body = await readJson(request);
      if (!canAccessLocation(body.locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 200, await aiRestaurantBrainService.decide(
        recommendationId, body, auth.user.name, organizationId
      ));
    }

    if (url.pathname === "/api/ai-brain/refresh" && request.method === "POST") {
      if (!authService.can(auth, "write") && !authService.can(auth, "write_operations")) {
        return sendJson(response, 403, { error: "AI decision permission required." });
      }
      const body = await readJson(request);
      if (!canAccessLocation(body.locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 200, await aiRestaurantBrainService.reset(
        body.locationId, auth.user.name, organizationId
      ));
    }

    if (url.pathname === "/api/service-coordination" && request.method === "GET") {
      const locationId=url.searchParams.get("locationId")||"loc_marina";
      if(!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await serviceCoordinationService.snapshot(locationId));
    }
    if (url.pathname === "/api/service-coordination" && request.method === "POST") {
      if(!authService.can(auth,"write")&&!authService.can(auth,"write_operations")) return sendJson(response,403,{error:"Service write permission required."});
      const body=await readJson(request); if(!canAccessLocation(body.locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,201,await serviceCoordinationService.createFromTable(body,auth.user.name,organizationId));
    }
    if (url.pathname.startsWith("/api/service-coordination/flows/") && request.method === "PATCH") {
      if(!authService.can(auth,"write")&&!authService.can(auth,"write_operations")) return sendJson(response,403,{error:"Service write permission required."});
      const id=decodeURIComponent(url.pathname.split("/").pop()); const body=await readJson(request);
      const flow=await serviceCoordinationService.updateFlow(id,body,auth.user.name,organizationId);
      return flow?sendJson(response,200,flow):sendJson(response,404,{error:"Service flow not found."});
    }
    if (url.pathname.startsWith("/api/service-coordination/deliver/") && request.method === "POST") {
      const id=decodeURIComponent(url.pathname.split("/").pop()); const flow=await serviceCoordinationService.markDelivered(id,auth.user.name,organizationId);
      return flow?sendJson(response,200,flow):sendJson(response,404,{error:"Service flow not found."});
    }

    if (url.pathname === "/api/kitchen-operations" && request.method === "GET") {const locationId=url.searchParams.get("locationId")||"loc_marina";if(!canAccessLocation(locationId))return sendJson(response,403,{error:"Location access denied."});return sendJson(response,200,await kitchenOperationsService.snapshot(locationId));}
    if (url.pathname === "/api/kitchen-operations" && request.method === "POST") {if(!authService.can(auth,"write")&&!authService.can(auth,"write_operations"))return sendJson(response,403,{error:"Kitchen write permission required."});const body=await readJson(request);return sendJson(response,201,await kitchenOperationsService.createTicket(body,auth.user.name,organizationId));}
    if (url.pathname.startsWith("/api/kitchen-operations/tickets/") && request.method === "PATCH") {const id=decodeURIComponent(url.pathname.split("/").pop());const body=await readJson(request);return sendJson(response,200,await kitchenOperationsService.updateTicket(id,body,auth.user.name,organizationId));}
    if (url.pathname === "/api/kitchen-operations/item" && request.method === "PATCH") {const body=await readJson(request);return sendJson(response,200,await kitchenOperationsService.updateItem(body.ticketId,body.itemId,body.patch||{},auth.user.name,organizationId));}

    if (url.pathname === "/api/staff-operations" && request.method === "GET") {
      const locationId = url.searchParams.get("locationId") || "loc_marina";
      if (!canAccessLocation(locationId)) return sendJson(response, 403, { error: "Location access denied." });
      return sendJson(response, 200, await staffOperationsService.snapshot(locationId));
    }

    if (url.pathname.startsWith("/api/staff-operations/staff/") && request.method === "PATCH") {
      if (!authService.can(auth, "write") && !authService.can(auth, "manage_users")) {
        return sendJson(response, 403, { error: "Staff write permission required." });
      }
      const staffId = decodeURIComponent(url.pathname.split("/").pop());
      const staff = await database.get("staff", staffId);
      if (!staff || !canAccessLocation(staff.locationId)) return sendJson(response, 404, { error: "Staff member not found." });
      const body = await readJson(request);
      return sendJson(response, 200, await staffOperationsService.updateStaff(
        staffId, body, auth.user.name, organizationId
      ));
    }

    if (url.pathname === "/api/staff-operations/assign-section" && request.method === "POST") {
      if (!authService.can(auth, "write") && !authService.can(auth, "manage_users")) {
        return sendJson(response, 403, { error: "Staff write permission required." });
      }
      const body = await readJson(request);
      const result = await staffOperationsService.assignSection(
        body.sectionId, body.serverId, auth.user.name, organizationId
      );
      return result ? sendJson(response, 200, result) : sendJson(response, 409, { error: "Unable to assign section." });
    }

    if (url.pathname === "/api/staff-operations/reassign-table" && request.method === "POST") {
      if (!authService.can(auth, "write") && !authService.can(auth, "manage_users")) {
        return sendJson(response, 403, { error: "Staff write permission required." });
      }
      const body = await readJson(request);
      const result = await staffOperationsService.reassignTable(
        body.tableId, body.serverId, auth.user.name, organizationId
      );
      return result ? sendJson(response, 200, result) : sendJson(response, 409, { error: "Unable to reassign table." });
    }

    if (url.pathname === "/api/reservation-operations" && request.method === "GET") {
      const locationId = url.searchParams.get("locationId") || "loc_marina";
      if (!canAccessLocation(locationId)) {
        return sendJson(response, 403, { error: "Location access denied." });
      }
      return sendJson(response, 200, await reservationOperationsService.list(locationId));
    }

    if (url.pathname === "/api/reservation-operations" && request.method === "POST") {
      if (!authService.can(auth, "write") && !authService.can(auth, "write_reservations")) {
        return sendJson(response, 403, { error: "Reservation write permission required." });
      }
      const body = await readJson(request);
      if (!canAccessLocation(body.locationId)) {
        return sendJson(response, 403, { error: "Location access denied." });
      }
      return sendJson(response, 201, await reservationOperationsService.create(
        body,
        auth.user.name,
        organizationId
      ));
    }

    if (url.pathname.startsWith("/api/reservation-operations/") && request.method === "PATCH") {
      if (!authService.can(auth, "write") && !authService.can(auth, "write_reservations")) {
        return sendJson(response, 403, { error: "Reservation write permission required." });
      }
      const reservationId = decodeURIComponent(url.pathname.split("/").pop());
      const reservation = await database.get("reservations", reservationId);
      if (!reservation || !canAccessLocation(reservation.locationId)) {
        return sendJson(response, 404, { error: "Reservation not found." });
      }
      const body = await readJson(request);
      const updated = await reservationOperationsService.update(
        reservationId,
        body,
        auth.user.name,
        organizationId
      );
      return sendJson(response, 200, updated);
    }

    if (url.pathname === "/api/reservation-operations/seat" && request.method === "POST") {
      if (!authService.can(auth, "write") && !authService.can(auth, "write_reservations")) {
        return sendJson(response, 403, { error: "Seating permission required." });
      }
      const body = await readJson(request);
      const reservation = await database.get("reservations", body.reservationId);
      const table = await database.get("tables", body.tableId);
      if (!reservation || !table || !canAccessLocation(reservation.locationId)) {
        return sendJson(response, 404, { error: "Reservation or table not found." });
      }
      const result = await reservationOperationsService.seat(
        body.reservationId,
        body.tableId,
        auth.user.name,
        organizationId
      );
      return result
        ? sendJson(response, 200, result)
        : sendJson(response, 409, { error: "Unable to seat this reservation." });
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
