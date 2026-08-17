
"use strict";

const { URL } = require("url");
const APP_VERSION = require("../../package.json").version;

async function sendJson(response, status, payload) {
  const context = response._writeContext;
  if (context && !context.completed) {
    context.completed = true;
    let resourceVersion = null;
    let outcome = status >= 500 ? "failed" : status >= 400 ? "rejected" : "committed";

    try {
      if (status >= 200 && status < 400 && context.syncPreparation?.ok) {
        const version = await context.syncService.commit({
          key: context.syncPreparation.key,
          organizationId: context.organizationId,
          path: context.path,
          entityId: context.entityId,
          actor: context.actor,
          payload
        });
        resourceVersion = version.version;
        response._resourceVersion = resourceVersion;
      }

      if (context.idempotencyKey) {
        if (status >= 500) {
          await context.idempotencyService.fail(context.idempotencyKey, status, payload);
        } else {
          await context.idempotencyService.complete(context.idempotencyKey, status, payload);
        }
      }

      await context.mutationIntegrityService?.finalize(context.operationId, {
        outcome,
        responseStatus: status,
        resourceVersion
      });

      response._writeIntegrity = outcome;
    } catch (error) {
      outcome = "failed";
      response._writeIntegrity = "failed";

      await context.mutationIntegrityService?.finalize(context.operationId, {
        outcome: "failed",
        responseStatus: 503,
        resourceVersion,
        error: error?.message || error
      }).catch(() => {});

      if (context.idempotencyKey) {
        await context.idempotencyService.fail(context.idempotencyKey, 503, {
          error: "The operation changed state but durable write finalization did not complete.",
          code: "WRITE_FINALIZATION_FAILED",
          operationId: context.operationId
        }).catch(() => {});
      }

      status = 503;
      payload = {
        ok: false,
        error: "The operation could not be durably finalized. Reconcile before retrying.",
        code: "WRITE_FINALIZATION_FAILED",
        operationId: context.operationId
      };
    }
  }

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Blue-Current-Idempotency-Key, If-Match, X-Blue-Current-Signature",
    "Access-Control-Expose-Headers": "X-Blue-Current-Idempotency-Replayed, ETag, X-Blue-Current-Resource-Version, X-Blue-Current-Operation-Id, X-Blue-Current-Write-Integrity, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    ...(response._securityHeaders || {})
  };
  if (response._corsOrigin) {
    headers["Access-Control-Allow-Origin"] = response._corsOrigin;
    headers.Vary = "Origin";
  }
  if (response._rateLimit) {
    headers["X-RateLimit-Limit"] = String(response._rateLimit.limit);
    headers["X-RateLimit-Remaining"] = String(response._rateLimit.remaining);
    headers["X-RateLimit-Reset"] = String(Math.ceil(response._rateLimit.resetAt / 1000));
    if (!response._rateLimit.allowed) headers["Retry-After"] = String(response._rateLimit.retryAfterSeconds);
  }
  if (response._idempotencyReplayed) headers["X-Blue-Current-Idempotency-Replayed"] = "true";
  if (response._resourceVersion != null) {
    headers["X-Blue-Current-Resource-Version"] = String(response._resourceVersion);
    headers.ETag = `"${response._resourceVersion}"`;
  }
  if (response._operationId) headers["X-Blue-Current-Operation-Id"] = response._operationId;
  if (response._writeIntegrity) headers["X-Blue-Current-Write-Integrity"] = response._writeIntegrity;

  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  if (request._jsonBody !== undefined) return request._jsonBody;
  let body = "";
  let bytes = 0;
  const maxBytes = Number(request._maxBodyBytes || 1_000_000);
  for await (const chunk of request) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > maxBytes) {
      const error = new Error(`Request body exceeds ${maxBytes} bytes.`);
      error.statusCode = 413;
      error.code = "PAYLOAD_TOO_LARGE";
      throw error;
    }
    body += chunk;
  }
  request._rawBody = body;
  request._jsonBody = body ? JSON.parse(body) : {};
  return request._jsonBody;
}

function bearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function createRouter({ database, auditService, idempotencyService, syncReconciliationService, telemetryService, reliabilityAutomationService, reservationService, realtimeHub, authService, floorService, reservationOperationsService, staffOperationsService, kitchenOperationsService, serviceCoordinationService, aiRestaurantBrainService, executiveCommandCenterService, autonomousOperationsService, guestIntelligenceService, workforceIntelligenceService, inventoryIntelligenceService, timeClockService, workforceFoundationService, schedulingService, employeePortalService, commandCenterService, operationsFeedService, actionListService, liveIntegrationService, repositoryImpactService, repositoryRetirementRehearsalService, retirementAssuranceService, retirementCandidateImpactService, v46ReleaseCertificationService, hospitalityPerformanceService, hospitalityActionWorkspaceService, serviceProfitabilityIntelligenceService, predictiveShiftControlService, managerOperatingRhythmService, multiLocationPerformanceService, pilotValueScorecardService, pilotProofProgramService, executivePilotReviewService, pilotDecisionLedgerService, expansionReadinessService, v48ReleaseCertificationService, rolloutActivationControlService, technicalActivationReadinessService, locationDeploymentPackageService, goLiveCommandService, launchStabilizationService, v49ReleaseCertificationService, productionOperationsHandoffService, productionHealthSupportService, productionIncidentCommandService, productionRecoveryReviewService, productionCorrectiveActionGovernanceService, v50ReleaseCertificationService, pilotOperationalReadinessService, restaurantDayLifecycleService, peakServiceStressTestService, dataIntegrityRecoveryService, rolePermissionCertificationService, operatorUxHardeningService, reservationGuestJourneyCertificationService, liveFloorServiceCertificationService, managementExecutiveAccuracyService, pilotDeploymentPackageService, pilotLaunchControlService, pilotExecutionObservationService, pilotStabilizationExitService, pilotCloseoutOutcomeService, expansionReplicationService, multiLocationExpansionControlService, expansionCohortObservationService, expansionPortfolioProofService, expansionRepeatabilityCertificationService, operationalIntegrationExpansionOrchestrationService, v52OperationalReadinessCertificationService, restaurantWorkflowIntegrationService, peakServiceWorkflowResilienceService, failureRecoveryShiftContinuityService, v53RestaurantOperationalCertificationService, operatorSpeedWorkflowSimplificationService, managerInterventionDecisionSpeedService, roleBasedServiceErgonomicsService, v54OperatorExperienceCertificationService, restaurantIntelligenceDecisionSupportService, profitabilityInterventionAccountabilityService, v55DecisionValueCertificationService, productionPilotEnvironmentReadinessService, pilotReleaseCandidateCertificationService, pilotLiveServiceAcceptanceService, finalProductReleaseCandidateService, finalHardeningRealEnvironmentService, productionLaunchCertificationService, productionMutationIntegrityService, productionBoundaryService, productionConfigurationService, persistenceMigrationReadinessService, persistenceSchemaMappingService, persistenceMigrationVerificationService, persistenceCutoverFrameworkService, persistenceBackfillService, migrationShadowStore, persistenceShadowExecutionService, persistenceReplicationCoordinatorService, operationalDataIntegrityService, restaurantWorkflowCertificationService, liveShiftFailureCertificationService, pilotReadinessCommandCenterService, operatorWorkflowCertificationService, universalHospitalityIntegrationService, commandOperatingPictureService, commandManagerActionService, commandOutcomeVerificationService, commandPlaybookIntelligenceService, commandShiftMemoryService, commandDataSourceTruthService, providerConnectionReadinessService, providerDataReconciliationService, providerIntegrationContinuityService, pilotDataAuthorityCutoverService, pilotRuntimeGuardrailService, pilotIncidentRecoveryCertificationService, pilotShiftCertificationService, livePilotShiftCommandService, livePilotEvidenceOutcomeLedgerService, pilotKpiBaselineValueMeasurementService, pilotPerformanceTrendIntelligenceService, pilotExecutiveReviewExpansionGateService, controlledExpansionLocationReadinessService, expansionLaunchCertificationActivationService, expansionStabilizationSupportControlService, multiLocationPortfolioGovernanceService, portfolioExceptionCommandService, portfolioDecisionAccountabilityService, executiveDecisionOutcomeIntelligenceService, portfolioLearningPlaybookIntelligenceService, playbookEvidenceLifecycleService, playbookGovernanceAuthorityService, intelligenceConsolidationService, architectureFreezeService, integrationReadinessService, connectorSyncReliabilityService, dataReconciliationConflictService, integrationHealthCommandService, integrationCertificationService, restaurantConfigurationService, pilotLocationConfigurationCertificationService, pilotDataWorkflowBindingService, pilotScenarioServiceSimulationService, pilotOperatorAcceptanceService, pilotReadinessLaunchControlService, pilotRuntimeSessionControlService, pilotRuntimeObservabilityIncidentService, pilotSessionCloseoutEvidenceService }) {
  return async function route(request, response) {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "OPTIONS") {
      const origin = productionBoundaryService.corsOrigin(request);
      if (origin === false) return sendJson(response, 403, { error: "Origin is not allowed.", code: "ORIGIN_NOT_ALLOWED" });
      response.writeHead(204, {
        ...(productionBoundaryService.securityHeaders({ api: true })),
        ...(origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {}),
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Blue-Current-Idempotency-Key, If-Match, X-Blue-Current-Signature",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Expose-Headers": "X-Blue-Current-Idempotency-Replayed, ETag, X-Blue-Current-Resource-Version, X-Blue-Current-Operation-Id, X-Blue-Current-Write-Integrity, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset"
      });
      return response.end();
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return sendJson(response, 200, {
        ok: true,
        version: APP_VERSION,
        database: "connected",
        auth: "enabled",
        realtimeClients: realtimeHub.count(),
        now: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/operator-fine-comb/repository-impact" && request.method === "GET") {
      const auth = await authService.authenticate(bearerToken(request));
      if (!auth) return sendJson(response, 401, { error: "Authentication required." });
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Repository impact review permission required."});
      const surfaceId = url.searchParams.get("surfaceId") || "";
      return sendJson(response,200,repositoryImpactService.analyze(surfaceId));
    }

    if (url.pathname === "/api/operator-fine-comb/v46-certification" && request.method === "GET") {
      const auth = await authService.authenticate(bearerToken(request));
      if (!auth) return sendJson(response,401,{error:"Authentication required."});
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"V46 certification permission required."});
      return sendJson(response,200,v46ReleaseCertificationService.snapshot());
    }

    if (url.pathname === "/api/operator-fine-comb/candidate-impact" && request.method === "POST") {
      const auth = await authService.authenticate(bearerToken(request));
      if (!auth) return sendJson(response,401,{error:"Authentication required."});
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Candidate impact permission required."});
      const body=await readJson(request);
      return sendJson(response,200,retirementCandidateImpactService.analyze(body.surfaceIds||[]));
    }

    if (url.pathname === "/api/operator-fine-comb/retirement-assurance" && request.method === "GET") {
      const auth = await authService.authenticate(bearerToken(request));
      if (!auth) return sendJson(response,401,{error:"Authentication required."});
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Retirement assurance permission required."});
      return sendJson(response,200,retirementAssuranceService.snapshot());
    }

    if (url.pathname === "/api/operator-fine-comb/retirement-rehearsal" && request.method === "POST") {
      const auth = await authService.authenticate(bearerToken(request));
      if (!auth) return sendJson(response,401,{error:"Authentication required."});
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Admin permission required for retirement rehearsal."});
      const body=await readJson(request);
      return sendJson(response,200,repositoryRetirementRehearsalService.rehearse(String(body.surfaceId||"")));
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
      const token = bearerToken(request);
      const existingAuth = await authService.authenticate(token);
      await authService.logout(token);
      if (existingAuth) {
        await auditService.record({
          organizationId: existingAuth.membership.organizationId,
          actor: existingAuth.user.name,
          action: "Signed out of Blue Current Cloud",
          category: "security"
        });
      }
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
        permissions: authService.permissionsForRole(auth.membership.role),
        session: {
          id: auth.session.id,
          createdAt: auth.session.createdAt,
          lastSeenAt: auth.session.lastSeenAt || auth.session.createdAt,
          idleExpiresAt: auth.session.idleExpiresAt || null,
          expiresAt: auth.session.expiresAt
        },
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

    const writeOrganizationId = auth.membership.organizationId;

    if (url.pathname === "/api/system/write-integrity" && request.method === "GET") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) {
        return sendJson(response, 403, { error: "Write-integrity diagnostics permission required." });
      }
      return sendJson(response, 200, await productionMutationIntegrityService.snapshot(writeOrganizationId));
    }

    if (url.pathname === "/api/system/database-recovery" && request.method === "GET") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) {
        return sendJson(response, 403, { error: "Database recovery diagnostics permission required." });
      }
      const backups = await database.verifyBackups();
      return sendJson(response, 200, {
        version: "68.50.0",
        database: database.diagnostics(),
        backups,
        mutationIntegrity: await productionMutationIntegrityService.snapshot(writeOrganizationId)
      });
    }

    if (url.pathname === "/api/system/security-boundary" && request.method === "GET") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Security boundary diagnostics require admin permission." });
      }
      return sendJson(response, 200, productionBoundaryService.snapshot());
    }

    if (url.pathname === "/api/system/auth-security" && request.method === "GET") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Authentication security diagnostics require admin permission." });
      }
      return sendJson(response, 200, await authService.securitySnapshot(writeOrganizationId));
    }

    if (url.pathname === "/api/system/deployment-readiness" && request.method === "GET") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Deployment readiness diagnostics require admin permission." });
      }
      return sendJson(response, 200, await productionConfigurationService.validate(database));
    }

    if (url.pathname === "/api/system/persistence-readiness" && request.method === "GET") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Persistence readiness diagnostics require admin permission." });
      }
      return sendJson(response, 200, await persistenceMigrationReadinessService.snapshot());
    }

    if (url.pathname === "/api/system/persistence-schema-map" && request.method === "GET") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Persistence schema mapping requires admin permission." });
      }
      return sendJson(response, 200, await persistenceSchemaMappingService.build());
    }

    if (url.pathname === "/api/system/persistence-source-manifest" && request.method === "GET") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Persistence source manifest requires admin permission." });
      }
      return sendJson(response, 200, await persistenceMigrationVerificationService.sourceManifest());
    }

    if (url.pathname === "/api/system/persistence-cutover" && request.method === "GET") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Persistence cutover status requires admin permission." });
      }
      return sendJson(response, 200, {
        status: await persistenceCutoverFrameworkService.status(),
        phases: persistenceCutoverFrameworkService.phases()
      });
    }

    if (url.pathname === "/api/system/persistence-cutover" && request.method === "POST") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Persistence cutover changes require admin permission." });
      }
      const body=await readJson(request);
      const result=await persistenceCutoverFrameworkService.update({
        ...body,
        actor: auth.user.name
      });
      await auditService.record({
        organizationId: writeOrganizationId,
        actor: auth.user.name,
        action: `Updated persistence migration phase to ${result.phase}`,
        category: "security"
      });
      return sendJson(response, 200, { ok: true, ...result });
    }

    if (url.pathname === "/api/system/persistence-backfill-plan" && request.method === "GET") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Persistence backfill planning requires admin permission." });
      }
      const batchSize=Math.max(1,Math.min(5000,Number(url.searchParams.get("batchSize")||100)));
      const plan=await persistenceBackfillService.plan({batchSize});
      return sendJson(response, 200, {
        version:plan.version,
        generatedAt:plan.generatedAt,
        sourceDriver:plan.sourceDriver,
        batchSize:plan.batchSize,
        totals:plan.totals,
        manifestHash:plan.manifestHash,
        stores:plan.stores.map(store=>({
          store:store.store,kind:store.kind,count:store.count,sha256:store.sha256,
          batches:store.batches.map(batch=>({
            id:batch.id,ordinal:batch.ordinal,offset:batch.offset,count:batch.count,sha256:batch.sha256
          }))
        }))
      });
    }

    if (url.pathname === "/api/system/operational-data-integrity" && request.method === "GET") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) {
        return sendJson(response, 403, { error: "Operational data integrity diagnostics require write permission." });
      }
      return sendJson(response, 200, await operationalDataIntegrityService.certify());
    }

    if (url.pathname === "/api/system/integration-contract" && request.method === "GET") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) {
        return sendJson(response,403,{error:"Integration contract diagnostics require write permission."});
      }
      return sendJson(response,200,{
        version:"75.0.0",
        providers:universalHospitalityIntegrationService.providers(),
        capabilities:universalHospitalityIntegrationService.capabilities(),
        contracts:universalHospitalityIntegrationService.contracts()
      });
    }

    if (url.pathname === "/api/system/integration-health" && request.method === "GET") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) {
        return sendJson(response,403,{error:"Integration health diagnostics require write permission."});
      }
      return sendJson(response,200,await universalHospitalityIntegrationService.health(organizationId));
    }

    if (url.pathname === "/api/system/integration-mappings" && request.method === "GET") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) {
        return sendJson(response,403,{error:"Integration mappings require write permission."});
      }
      return sendJson(response,200,{mappings:await universalHospitalityIntegrationService.mappings(organizationId)});
    }

    if (url.pathname === "/api/system/integration-mappings" && request.method === "POST") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response,403,{error:"Integration mapping changes require admin permission."});
      }
      const body=await readJson(request);
      const mapping=await universalHospitalityIntegrationService.saveMapping(organizationId,auth.user.name,body);
      return sendJson(response,200,{ok:true,mapping});
    }

    if (url.pathname === "/api/system/integration-preview" && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) {
        return sendJson(response,403,{error:"Integration preview requires write permission."});
      }
      const body=await readJson(request);
      return sendJson(response,200,await universalHospitalityIntegrationService.preview(body.provider,body.event||{}));
    }

    if (url.pathname === "/api/system/integration-ingest" && request.method === "POST") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response,403,{error:"Integration ingestion requires admin permission."});
      }
      const body=await readJson(request);
      const event=await universalHospitalityIntegrationService.ingest(
        organizationId,auth.user.name,body.provider,body.event||{}
      );
      return sendJson(response,event.duplicate?200:201,{ok:true,event});
    }

    if (url.pathname === "/api/command/contextual-playbook" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"write") && !authService.can(auth,"admin")) {
        return sendJson(response,403,{error:"Contextual playbook access requires read permission."});
      }
      const locationId=url.searchParams.get("locationId")||null;
      if(locationId && !canAccessLocation(locationId)) {
        return sendJson(response,403,{error:"Location access denied."});
      }
      const picture=await commandOperatingPictureService.snapshot(
        organizationId,auth.allowedLocationIds||[],locationId
      );
      return sendJson(response,200,await commandShiftMemoryService.match(
        organizationId,auth.allowedLocationIds||[],picture.location.id,picture
      ));
    }

    if (url.pathname === "/api/command/playbooks" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"write") && !authService.can(auth,"admin")) {
        return sendJson(response,403,{error:"Command playbook access requires read permission."});
      }
      const locationId=url.searchParams.get("locationId")||null;
      if(locationId && !canAccessLocation(locationId)) {
        return sendJson(response,403,{error:"Location access denied."});
      }
      return sendJson(response,200,await commandPlaybookIntelligenceService.build(
        organizationId,auth.allowedLocationIds||[],locationId
      ));
    }

    if (url.pathname === "/api/command/outcomes" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"write") && !authService.can(auth,"admin")) {
        return sendJson(response,403,{error:"Command outcome access requires read permission."});
      }
      const locationId=url.searchParams.get("locationId")||null;
      if(locationId && !canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await commandOutcomeVerificationService.summary(
        organizationId,auth.allowedLocationIds||[],locationId
      ));
    }

    if (url.pathname === "/api/command/actions" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Command action access requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(locationId && !canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await commandManagerActionService.summary(organizationId,auth.allowedLocationIds||[],locationId));
    }

    if (url.pathname === "/api/command/actions" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"write_operations") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Command action acknowledgement requires operations permission."});
      try{
        const body=await readJson(request);
        const action=await commandManagerActionService.createFromPriority(organizationId,auth.allowedLocationIds||[],body,auth.user.name);
        return sendJson(response,action.duplicate?200:201,{ok:true,action});
      }catch(error){return sendJson(response,error.statusCode||400,{error:error.message,code:error.code||null});}
    }

    if (url.pathname.startsWith("/api/command/actions/") && request.method === "PATCH") {
      if (!authService.can(auth,"write") && !authService.can(auth,"write_operations") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Command action changes require operations permission."});
      const actionId=decodeURIComponent(url.pathname.split("/")[4]||"");
      try{return sendJson(response,200,{ok:true,action:await commandManagerActionService.update(organizationId,auth.allowedLocationIds||[],actionId,await readJson(request),auth.user.name)});}catch(error){return sendJson(response,error.statusCode||400,{error:error.message,code:error.code||null});}
    }

    if (url.pathname === "/api/expansion/stabilization" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion stabilization access requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await expansionStabilizationSupportControlService.status(organizationId,auth.allowedLocationIds||[],locationId));
    }
    if (url.pathname === "/api/expansion/stabilization/configure" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion stabilization configuration requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await expansionStabilizationSupportControlService.configure(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/expansion/stabilization/incidents" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion stabilization incident capture requires write permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,201,await expansionStabilizationSupportControlService.recordIncident(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"operator"));
    }
    if (url.pathname === "/api/expansion/stabilization/incidents/resolve" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion stabilization incident resolution requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await expansionStabilizationSupportControlService.resolveIncident(organizationId,auth.allowedLocationIds||[],locationId,body.incidentId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/expansion/stabilization/graduate" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion stabilization graduation requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await expansionStabilizationSupportControlService.graduate(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"executive"));
    }

    if (url.pathname === "/api/expansion/launch-certification" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion launch certification requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await expansionLaunchCertificationActivationService.status(organizationId,auth.allowedLocationIds||[],locationId));
    }
    if (url.pathname === "/api/expansion/launch-certification/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion launch certification requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await expansionLaunchCertificationActivationService.certify(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"executive"));
    }
    if (url.pathname === "/api/expansion/production-activation" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion production activation requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await expansionLaunchCertificationActivationService.activate(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"executive"));
    }
    if (url.pathname === "/api/expansion/production-activation/rollback" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion production rollback requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await expansionLaunchCertificationActivationService.rollback(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"executive"));
    }

    if (url.pathname === "/api/expansion/location-readiness" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion readiness requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await controlledExpansionLocationReadinessService.evaluate(organizationId,auth.allowedLocationIds||[],locationId));
    }
    if (url.pathname === "/api/expansion/location-readiness" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion readiness configuration requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await controlledExpansionLocationReadinessService.setReadiness(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/expansion/location-readiness/approve-prep" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Expansion rollout preparation approval requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await controlledExpansionLocationReadinessService.approveRolloutPrep(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"executive"));
    }

    if (url.pathname === "/api/pilot/executive-review" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot executive review requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotExecutiveReviewExpansionGateService.evaluate(organizationId,auth.allowedLocationIds||[],locationId));
    }
    if (url.pathname === "/api/pilot/executive-review/operator" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive operator review requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotExecutiveReviewExpansionGateService.setOperatorReview(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/pilot/executive-review/decision" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot executive decision requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotExecutiveReviewExpansionGateService.decide(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"executive"));
    }

    if (url.pathname === "/api/pilot/performance/measurement" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot performance measurement requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      if(!body.shiftId) return sendJson(response,400,{error:"shiftId is required."});
      return sendJson(response,200,await pilotPerformanceTrendIntelligenceService.recordShiftMeasurement(organizationId,auth.allowedLocationIds||[],locationId,body.shiftId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/pilot/performance/trends" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot performance trends require read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotPerformanceTrendIntelligenceService.report(organizationId,auth.allowedLocationIds||[],locationId));
    }

    if (url.pathname === "/api/pilot/kpi-baseline" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"KPI baseline requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotKpiBaselineValueMeasurementService.setBaseline(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/pilot/kpi-value" && request.method === "POST") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"KPI value measurement requires read permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotKpiBaselineValueMeasurementService.report(organizationId,auth.allowedLocationIds||[],locationId,body.shiftId||null,body));
    }

    if (url.pathname === "/api/pilot/evidence" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot evidence access requires read permission."});
      const locationId=url.searchParams.get("locationId")||null,shiftId=url.searchParams.get("shiftId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await livePilotEvidenceOutcomeLedgerService.ledger(organizationId,auth.allowedLocationIds||[],locationId,shiftId));
    }
    if (url.pathname === "/api/pilot/evidence" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot evidence capture requires write permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,201,await livePilotEvidenceOutcomeLedgerService.record(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"operator"));
    }
    if (url.pathname === "/api/pilot/outcome" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot outcome access requires read permission."});
      const locationId=url.searchParams.get("locationId")||null,shiftId=url.searchParams.get("shiftId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await livePilotEvidenceOutcomeLedgerService.outcome(organizationId,auth.allowedLocationIds||[],locationId,shiftId));
    }

    if (url.pathname === "/api/pilot/live-shift" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Live pilot shift access requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await livePilotShiftCommandService.snapshot(organizationId,auth.allowedLocationIds||[],locationId));
    }
    if (url.pathname === "/api/pilot/live-shift/start" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Live pilot shift start requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await livePilotShiftCommandService.start(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/pilot/live-shift/close" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Live pilot shift close requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await livePilotShiftCommandService.close(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"admin"));
    }

    if (url.pathname === "/api/pilot/shift-certification" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot shift certification access requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotShiftCertificationService.evaluate(organizationId,auth.allowedLocationIds||[],locationId));
    }
    if (url.pathname === "/api/pilot/shift-certification/operator-readiness" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operator readiness requires write permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotShiftCertificationService.setOperatorReadiness(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"operator"));
    }
    if (url.pathname === "/api/pilot/shift-certification/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot shift certification requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotShiftCertificationService.certify(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"admin"));
    }

    if (url.pathname === "/api/pilot/incidents" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot incident access requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotIncidentRecoveryCertificationService.list(organizationId,auth.allowedLocationIds||[],locationId));
    }
    if (url.pathname === "/api/pilot/incidents/investigate" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot incident investigation requires write permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotIncidentRecoveryCertificationService.investigate(organizationId,auth.allowedLocationIds||[],locationId,body.incidentId,body,auth.user?.email||auth.user?.id||"operator"));
    }
    if (url.pathname === "/api/pilot/incidents/certify-recovery" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Recovery certification requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotIncidentRecoveryCertificationService.certify(organizationId,auth.allowedLocationIds||[],locationId,body.incidentId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/pilot/incidents/clear-emergency" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Emergency clearance requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotIncidentRecoveryCertificationService.clearEmergency(organizationId,auth.allowedLocationIds||[],locationId,auth.user?.email||auth.user?.id||"admin",body.reason));
    }

    if (url.pathname === "/api/pilot/runtime-safety" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime safety access requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotRuntimeGuardrailService.evaluate(organizationId,auth.allowedLocationIds||[],locationId));
    }
    if (url.pathname === "/api/pilot/runtime-safety/hold" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime hold requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotRuntimeGuardrailService.setHold(organizationId,auth.allowedLocationIds||[],locationId,body.enabled,auth.user?.email||auth.user?.id||"admin",body.reason));
    }
    if (url.pathname === "/api/pilot/runtime-safety/emergency-local" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Emergency local mode requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotRuntimeGuardrailService.emergencyLocal(organizationId,auth.allowedLocationIds||[],locationId,auth.user?.email||auth.user?.id||"admin",body.reason));
    }
    if (url.pathname === "/api/pilot/runtime-safety/incidents" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot incident capture requires write permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,201,await pilotRuntimeGuardrailService.recordIncident(organizationId,auth.allowedLocationIds||[],locationId,body,auth.user?.email||auth.user?.id||"operator"));
    }

    if (url.pathname === "/api/pilot/data-authority" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot authority access requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotDataAuthorityCutoverService.status(organizationId,auth.allowedLocationIds||[],locationId));
    }
    if (url.pathname === "/api/pilot/data-authority/activate" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot authority cutover requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotDataAuthorityCutoverService.activate(organizationId,auth.allowedLocationIds||[],locationId,body.provider,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/pilot/data-authority/rollback" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot authority rollback requires admin permission."});
      const body=await readJsonBody(request),locationId=body.locationId;
      if(!locationId||!canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await pilotDataAuthorityCutoverService.rollback(organizationId,auth.allowedLocationIds||[],locationId,body.reason,auth.user?.email||auth.user?.id||"admin"));
    }

    if (url.pathname === "/api/integrations/continuity" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Integration continuity access requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(locationId && !canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      const target=locationId || (auth.allowedLocationIds||[]).find(id=>id!=="*");
      if(!target)return sendJson(response,400,{error:"A location is required for integration continuity."});
      return sendJson(response,200,await providerIntegrationContinuityService.evaluate(organizationId,auth.allowedLocationIds||[],target));
    }

    if (url.pathname === "/api/pilot/session-closeout" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot closeout portfolio requires read permission."});
      return sendJson(response,200,await pilotSessionCloseoutEvidenceService.portfolio(organizationId));
    }
    if (url.pathname.startsWith("/api/pilot/session-closeout/") && url.pathname.endsWith("/assess") && request.method === "GET") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot closeout assessment requires admin permission."});
      const sessionId=url.pathname.split("/")[4];
      return sendJson(response,200,await pilotSessionCloseoutEvidenceService.assess(organizationId,sessionId));
    }
    if (url.pathname.startsWith("/api/pilot/session-closeout/") && url.pathname.endsWith("/close") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot session closeout requires admin permission."});
      const sessionId=url.pathname.split("/")[4],body=await readJsonBody(request);
      return sendJson(response,201,await pilotSessionCloseoutEvidenceService.closeout(organizationId,sessionId,body,auth.user?.email||auth.user?.id||"operator"));
    }
    if (url.pathname.startsWith("/api/pilot/session-closeout/") && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot closeout evidence requires read permission."});
      const sessionId=url.pathname.split("/")[4];
      return sendJson(response,200,await pilotSessionCloseoutEvidenceService.get(organizationId,sessionId));
    }

    if (url.pathname === "/api/pilot/runtime-observability" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime observability requires read permission."});
      return sendJson(response,200,await pilotRuntimeObservabilityIncidentService.current(organizationId));
    }
    if (url.pathname === "/api/pilot/runtime-observability/metric" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime metrics require admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await pilotRuntimeObservabilityIncidentService.recordMetric(organizationId,body,auth.user?.email||auth.user?.id||"system"));
    }
    if (url.pathname === "/api/pilot/runtime-observability/incident" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime incident creation requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await pilotRuntimeObservabilityIncidentService.createIncident(organizationId,body,auth.user?.email||auth.user?.id||"operator"));
    }
    if (url.pathname.startsWith("/api/pilot/runtime-observability/incident/") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime incident control requires admin permission."});
      const parts=url.pathname.split("/"),incidentId=parts[5],action=String(parts[6]||"").toUpperCase();
      const body=await readJsonBody(request);
      if(action==="ACKNOWLEDGE") return sendJson(response,200,await pilotRuntimeObservabilityIncidentService.acknowledge(organizationId,incidentId,body,auth.user?.email||auth.user?.id||"operator"));
      if(action==="ESCALATE") return sendJson(response,200,await pilotRuntimeObservabilityIncidentService.escalate(organizationId,incidentId,body,auth.user?.email||auth.user?.id||"operator"));
      if(action==="RESOLVE") return sendJson(response,200,await pilotRuntimeObservabilityIncidentService.resolve(organizationId,incidentId,body,auth.user?.email||auth.user?.id||"operator"));
    }
    if (url.pathname.startsWith("/api/pilot/runtime-observability/session/") && url.pathname.endsWith("/timeline") && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime timeline requires read permission."});
      const sessionId=url.pathname.split("/")[5];
      return sendJson(response,200,await pilotRuntimeObservabilityIncidentService.timeline(organizationId,sessionId));
    }

    if (url.pathname === "/api/pilot/runtime-session" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime session requires read permission."});
      return sendJson(response,200,await pilotRuntimeSessionControlService.current(organizationId));
    }
    if (url.pathname === "/api/pilot/runtime-session/start" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime session start requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await pilotRuntimeSessionControlService.start(organizationId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname.startsWith("/api/pilot/runtime-session/") && url.pathname.endsWith("/envelope") && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime envelope requires read permission."});
      const sessionId=url.pathname.split("/")[4];
      return sendJson(response,200,await pilotRuntimeSessionControlService.checkEnvelope(organizationId,sessionId));
    }
    if (url.pathname.startsWith("/api/pilot/runtime-session/") && url.pathname.endsWith("/enforce") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime guardrail enforcement requires admin permission."});
      const sessionId=url.pathname.split("/")[4];
      return sendJson(response,200,await pilotRuntimeSessionControlService.enforce(organizationId,sessionId,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname.startsWith("/api/pilot/runtime-session/") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot runtime session control requires admin permission."});
      const parts=url.pathname.split("/"),sessionId=parts[4],action=String(parts[5]||"").toUpperCase();
      if (["PAUSE","RESUME","STOP"].includes(action)) {
        const body=await readJsonBody(request);
        return sendJson(response,200,await pilotRuntimeSessionControlService.transition(organizationId,sessionId,action,body,auth.user?.email||auth.user?.id||"admin"));
      }
    }

    if (url.pathname === "/api/pilot/launch-control" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot launch control requires read permission."});
      return sendJson(response,200,await pilotReadinessLaunchControlService.current(organizationId));
    }
    if (url.pathname === "/api/pilot/launch-control/assess" && request.method === "GET") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot launch assessment requires admin permission."});
      return sendJson(response,200,await pilotReadinessLaunchControlService.assess(organizationId));
    }
    if (url.pathname === "/api/pilot/launch-control/hold" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot launch holds require admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await pilotReadinessLaunchControlService.addHold(organizationId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname.startsWith("/api/pilot/launch-control/hold/") && url.pathname.endsWith("/release") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot launch hold release requires admin permission."});
      const holdId=url.pathname.split("/")[5];
      const body=await readJsonBody(request);
      return sendJson(response,200,await pilotReadinessLaunchControlService.releaseHold(organizationId,holdId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/pilot/launch-control/approve" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot launch approval requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await pilotReadinessLaunchControlService.approve(organizationId,body,auth.user?.email||auth.user?.id||"admin"));
    }

    if (url.pathname === "/api/pilot/operator-acceptance" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operator acceptance requires read permission."});
      return sendJson(response,200,await pilotOperatorAcceptanceService.current(organizationId));
    }
    if (url.pathname === "/api/pilot/operator-acceptance/observe" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operator observations require admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await pilotOperatorAcceptanceService.observe(organizationId,body,auth.user?.email||auth.user?.id||"operator"));
    }
    if (url.pathname === "/api/pilot/operator-acceptance/assess" && request.method === "GET") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operator acceptance assessment requires admin permission."});
      return sendJson(response,200,await pilotOperatorAcceptanceService.assess(organizationId));
    }
    if (url.pathname === "/api/pilot/operator-acceptance/accept" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operator acceptance requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await pilotOperatorAcceptanceService.accept(organizationId,body,auth.user?.email||auth.user?.id||"operator"));
    }

    if (url.pathname === "/api/pilot/service-simulation" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot service simulation requires read permission."});
      return sendJson(response,200,await pilotScenarioServiceSimulationService.status(organizationId));
    }
    if (url.pathname === "/api/pilot/service-simulation/run" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot service simulation requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await pilotScenarioServiceSimulationService.run(organizationId,body,auth.user?.email||auth.user?.id||"admin"));
    }

    if (url.pathname === "/api/pilot/workflow-binding" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot workflow binding requires read permission."});
      return sendJson(response,200,await pilotDataWorkflowBindingService.current(organizationId));
    }
    if (url.pathname === "/api/pilot/workflow-binding" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot workflow binding changes require admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await pilotDataWorkflowBindingService.build(organizationId,body,auth.user?.email||auth.user?.id||"admin"));
    }

    if (url.pathname === "/api/configuration/pilot-certification" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot configuration certification requires read permission."});
      return sendJson(response,200,await pilotLocationConfigurationCertificationService.current(organizationId));
    }
    if (url.pathname === "/api/configuration/pilot-certification/assess" && request.method === "GET") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot configuration assessment requires admin permission."});
      return sendJson(response,200,await pilotLocationConfigurationCertificationService.assess(organizationId));
    }
    if (url.pathname === "/api/configuration/pilot-certification/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot configuration certification requires admin permission."});
      return sendJson(response,200,await pilotLocationConfigurationCertificationService.certify(organizationId,auth.user?.email||auth.user?.id||"admin"));
    }

    if (url.pathname === "/api/configuration/restaurant" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Restaurant configuration requires read permission."});
      return sendJson(response,200,await restaurantConfigurationService.get(organizationId));
    }
    if (url.pathname === "/api/configuration/restaurant" && request.method === "PUT") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Restaurant configuration changes require admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await restaurantConfigurationService.save(organizationId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/configuration/restaurant/audit" && request.method === "GET") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Configuration audit requires admin permission."});
      return sendJson(response,200,await restaurantConfigurationService.audit(organizationId));
    }

    if (url.pathname === "/api/integrations/certification/phase-b" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Integration certification requires read permission."});
      return sendJson(response,200,await integrationCertificationService.phaseB(organizationId));
    }
    if (url.pathname === "/api/integrations/certification/connector" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Connector certification requires read permission."});
      const connectorId=url.searchParams.get("connectorId");
      return sendJson(response,200,await integrationCertificationService.evaluateConnector(organizationId,connectorId));
    }
    if (url.pathname === "/api/integrations/certification/evidence" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Certification evidence requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await integrationCertificationService.recordEvidence(organizationId,body,auth.user?.email||auth.user?.id||"admin"));
    }

    if (url.pathname === "/api/integrations/health-command" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Integration health command requires read permission."});
      return sendJson(response,200,await integrationHealthCommandService.build(organizationId));
    }

    if (url.pathname === "/api/integrations/reconciliation" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Integration reconciliation access requires read permission."});
      const locationId=url.searchParams.get("locationId")||null;
      if(locationId && !canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      const target=locationId || (auth.allowedLocationIds||[]).find(id=>id!=="*");
      if(!target)return sendJson(response,400,{error:"A location is required for reconciliation."});
      return sendJson(response,200,await providerDataReconciliationService.evaluate(organizationId,auth.allowedLocationIds||[],target));
    }

    if (url.pathname === "/api/integrations/provider-readiness" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"write") && !authService.can(auth,"admin")) {
        return sendJson(response,403,{error:"Provider readiness access requires read permission."});
      }
      const locationId=url.searchParams.get("locationId")||null;
      if(locationId && !canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      const target=locationId || (auth.allowedLocationIds||[]).find(id=>id!=="*");
      if(!target)return sendJson(response,400,{error:"A location is required for provider readiness."});
      return sendJson(response,200,await providerConnectionReadinessService.evaluate(
        organizationId,auth.allowedLocationIds||[],target
      ));
    }

    if (url.pathname === "/api/command/source-truth" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"write") && !authService.can(auth,"admin")) {
        return sendJson(response,403,{error:"Command source-truth access requires read permission."});
      }
      const locationId=url.searchParams.get("locationId")||null;
      if(locationId && !canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      const target=locationId || (auth.allowedLocationIds||[]).find(id=>id!=="*");
      if(!target)return sendJson(response,400,{error:"A location is required for source truth."});
      return sendJson(response,200,await commandDataSourceTruthService.snapshot(
        organizationId,auth.allowedLocationIds||[],target
      ));
    }

    if (url.pathname === "/api/command/operating-picture" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"write") && !authService.can(auth,"admin")) {
        return sendJson(response,403,{error:"Operating command access requires read permission."});
      }
      const locationId=url.searchParams.get("locationId")||null;
      if(locationId && !canAccessLocation(locationId)){
        return sendJson(response,403,{error:"Location access denied."});
      }
      return sendJson(response,200,await commandOperatingPictureService.snapshot(
        organizationId,
        auth.allowedLocationIds||[],
        locationId
      ));
    }

    if (url.pathname === "/api/system/operator-workflow-certification" && request.method === "GET") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) {
        return sendJson(response,403,{error:"Operator workflow certification requires write permission."});
      }
      return sendJson(response,200,await operatorWorkflowCertificationService.certify(
        organizationId,
        auth.allowedLocationIds||[]
      ));
    }

    if (url.pathname === "/api/system/pilot-readiness-command-center" && request.method === "GET") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) {
        return sendJson(response,403,{error:"Pilot readiness command center requires write permission."});
      }
      return sendJson(response,200,await pilotReadinessCommandCenterService.snapshot(
        organizationId,
        auth.allowedLocationIds||[]
      ));
    }

    if (url.pathname === "/api/system/live-shift-failure-certification" && request.method === "GET") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) {
        return sendJson(response,403,{error:"Live-shift failure certification requires write permission."});
      }
      const locationId=url.searchParams.get("locationId")||null;
      if(locationId && !canAccessLocation(locationId)) return sendJson(response,403,{error:"Location access denied."});
      return sendJson(response,200,await liveShiftFailureCertificationService.certify(organizationId,locationId));
    }

    if (url.pathname === "/api/system/workflow-certification" && request.method === "GET") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) {
        return sendJson(response, 403, { error: "Workflow certification requires write permission." });
      }
      const locationId=url.searchParams.get("locationId")||null;
      if(locationId && !canAccessLocation(locationId)){
        return sendJson(response,403,{error:"Location access denied."});
      }
      return sendJson(response,200,await restaurantWorkflowCertificationService.certify(
        organizationId,locationId
      ));
    }

    if (url.pathname === "/api/system/persistence-shadow" && request.method === "GET") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Persistence shadow diagnostics require admin permission." });
      }
      return sendJson(response, 200, {
        status:persistenceShadowExecutionService.status(),
        shadow:migrationShadowStore.diagnostics(),
        replication:persistenceReplicationCoordinatorService.snapshot()
      });
    }

    if (url.pathname === "/api/system/persistence-shadow/seed" && request.method === "POST") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Persistence shadow seed requires admin permission." });
      }
      const body=await readJson(request);
      const batchSize=Math.max(1,Math.min(5000,Number(body.batchSize||100)));
      await migrationShadowStore.reset();
      const backfill=await persistenceBackfillService.execute(migrationShadowStore,{batchSize});
      persistenceShadowExecutionService.configure({mode:"shadow-read"});
      const comparison=await persistenceShadowExecutionService.compareAll();
      await auditService.record({
        organizationId:writeOrganizationId,
        actor:auth.user.name,
        action:`Seeded migration shadow store (${backfill.importedBatches} batches, ${comparison.mismatches} mismatches)`,
        category:"security"
      });
      return sendJson(response,200,{
        ok:comparison.verified,
        backfill,
        comparison:{
          verified:comparison.verified,
          mismatches:comparison.mismatches,
          mismatchStores:comparison.comparisons.filter(item=>item.match===false).map(item=>item.store)
        },
        shadow:migrationShadowStore.diagnostics()
      });
    }

    if (url.pathname === "/api/auth/logout-all" && request.method === "POST") {
      const result = await authService.revokeAllUserSessions(auth.user.id, "user-requested-revocation");
      await auditService.record({
        organizationId: writeOrganizationId,
        actor: auth.user.name,
        action: `Revoked ${result.revoked} active session(s) across organizations`,
        category: "security"
      });
      return sendJson(response, 200, { ok: true, ...result });
    }

    if (url.pathname === "/api/system/auth-security/revoke-user" && request.method === "POST") {
      if (!authService.can(auth,"admin")) {
        return sendJson(response, 403, { error: "Session revocation requires admin permission." });
      }
      const body = await readJson(request);
      const result = await authService.revokeOrganizationUserSessions(
        writeOrganizationId,
        String(body.userId || ""),
        auth.user.name
      );
      return result
        ? sendJson(response, 200, { ok: true, ...result })
        : sendJson(response, 404, { error: "User membership was not found in this organization." });
    }

    const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
    if (writeMethods.has(request.method)) {
      const idempotencyKey = idempotencyService.key(request, writeOrganizationId);

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
          organizationId: writeOrganizationId,
          userId: auth.user.id
        });
      }

      const body = await readJson(request);
      const entityId = body.id || body.entityId || body.reservationId || body.tableId ||
        decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "collection");
      const ifMatch = request.headers["if-match"];
      const expectedVersion = ifMatch
        ? Number(String(ifMatch).replaceAll('"', ""))
        : body.baseVersion ?? null;

      const preparation = await syncReconciliationService.prepare({
        organizationId: writeOrganizationId,
        path: url.pathname,
        entityId,
        expectedVersion
      });

      if (!preparation.ok) {
        const current = await database.get("resourceVersions", preparation.key);
        const conflictPayload = {
          error: "The resource changed after the client snapshot.",
          code: "VERSION_CONFLICT",
          version: preparation.currentVersion,
          expectedVersion: preparation.expectedVersion,
          current: current?.lastPayload || null
        };
        if (idempotencyKey) {
          await idempotencyService.fail(idempotencyKey, 412, conflictPayload);
        }
        return sendJson(response, 412, conflictPayload);
      }

      const mutation = await productionMutationIntegrityService.begin({
        organizationId: writeOrganizationId,
        method: request.method,
        path: url.pathname,
        entityId,
        userId: auth.user.id,
        actor: auth.user.name,
        idempotencyKey,
        expectedVersion
      });

      response._operationId = mutation.id;
      response._writeContext = {
        idempotencyService,
        syncService: syncReconciliationService,
        mutationIntegrityService: productionMutationIntegrityService,
        operationId: mutation.id,
        idempotencyKey,
        syncPreparation: preparation,
        organizationId: writeOrganizationId,
        path: url.pathname,
        entityId,
        actor: auth.user.name,
        completed: false
      };
    }

    const v47AllowedLocations = auth.membership.locationIds || [];
    const v47CanAccessLocation = locationId => v47AllowedLocations.includes("*") || v47AllowedLocations.includes(locationId);
    const v47RejectLocation = (response, locationId) =>
      v47CanAccessLocation(locationId) ? false : (sendJson(response,403,{error:"Location is outside your authorized scope."}), true);

    if (url.pathname === "/api/production-launch-certification" && request.method === "GET") return sendJson(response,200,await productionLaunchCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname === "/api/production-launch-certification/review" && request.method === "POST") {
      if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      try{return sendJson(response,201,await productionLaunchCertificationService.review(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname === "/api/production-launch-certification/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."});
      try{return sendJson(response,201,await productionLaunchCertificationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/final-hardening-real-environment" && request.method === "GET") return sendJson(response,200,await finalHardeningRealEnvironmentService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname === "/api/final-hardening-real-environment/review" && request.method === "POST") {
      if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      try{return sendJson(response,201,await finalHardeningRealEnvironmentService.review(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname === "/api/final-hardening-real-environment/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."});
      try{return sendJson(response,201,await finalHardeningRealEnvironmentService.certify(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/final-product-release-candidate" && request.method === "GET") return sendJson(response,200,await finalProductReleaseCandidateService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname === "/api/final-product-release-candidate/review" && request.method === "POST") {
      if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      try{return sendJson(response,201,await finalProductReleaseCandidateService.review(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname === "/api/final-product-release-candidate/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."});
      try{return sendJson(response,201,await finalProductReleaseCandidateService.certify(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/pilot-live-service-acceptance" && request.method === "GET") return sendJson(response,200,await pilotLiveServiceAcceptanceService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname.startsWith("/api/pilot-live-service-acceptance/locations/") && url.pathname.endsWith("/review") && request.method === "POST") {
      if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      try{return sendJson(response,201,await pilotLiveServiceAcceptanceService.review(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/pilot-live-service-acceptance/locations/") && url.pathname.endsWith("/decision") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      try{return sendJson(response,201,await pilotLiveServiceAcceptanceService.decide(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/pilot-release-candidate-certification" && request.method === "GET") return sendJson(response,200,await pilotReleaseCandidateCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname === "/api/pilot-release-candidate-certification/review" && request.method === "POST") {
      if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      try{return sendJson(response,201,await pilotReleaseCandidateCertificationService.review(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname === "/api/pilot-release-candidate-certification/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."});
      try{return sendJson(response,201,await pilotReleaseCandidateCertificationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/production-pilot-environment-readiness" && request.method === "GET") return sendJson(response,200,await productionPilotEnvironmentReadinessService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname === "/api/production-pilot-environment-readiness/review" && request.method === "POST") {
      if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      try{return sendJson(response,201,await productionPilotEnvironmentReadinessService.review(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname === "/api/production-pilot-environment-readiness/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."});
      try{return sendJson(response,201,await productionPilotEnvironmentReadinessService.certify(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/v55-decision-value-certification" && request.method === "GET") return sendJson(response,200,await v55DecisionValueCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname === "/api/v55-decision-value-certification/review" && request.method === "POST") {
      if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      try{return sendJson(response,201,await v55DecisionValueCertificationService.review(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname === "/api/v55-decision-value-certification/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."});
      try{return sendJson(response,201,await v55DecisionValueCertificationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/profitability-intervention-accountability" && request.method === "GET") return sendJson(response,200,await profitabilityInterventionAccountabilityService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname.startsWith("/api/profitability-intervention-accountability/locations/") && url.pathname.endsWith("/interventions") && request.method === "POST") {
      if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      try{return sendJson(response,201,await profitabilityInterventionAccountabilityService.createIntervention(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/profitability-intervention-accountability/interventions/") && url.pathname.endsWith("/outcome") && request.method === "POST") {
      if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      const interventionId=decodeURIComponent(url.pathname.split("/")[4]||"");
      try{return sendJson(response,201,await profitabilityInterventionAccountabilityService.measureOutcome(auth.membership.organizationId,auth.membership.locationIds||[],interventionId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/profitability-intervention-accountability/locations/") && url.pathname.endsWith("/certify") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      try{return sendJson(response,201,await profitabilityInterventionAccountabilityService.certify(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/restaurant-intelligence-decision-support" && request.method === "GET") return sendJson(response,200,await restaurantIntelligenceDecisionSupportService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname.startsWith("/api/restaurant-intelligence-decision-support/locations/") && url.pathname.endsWith("/review") && request.method === "POST") { if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."}); const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); try{return sendJson(response,201,await restaurantIntelligenceDecisionSupportService.review(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}}
    if (url.pathname.startsWith("/api/restaurant-intelligence-decision-support/locations/") && url.pathname.endsWith("/certify") && request.method === "POST") { if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."}); const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); try{return sendJson(response,201,await restaurantIntelligenceDecisionSupportService.certify(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}}

    if (url.pathname === "/api/v54-operator-experience-certification" && request.method === "GET") return sendJson(response,200,await v54OperatorExperienceCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname === "/api/v54-operator-experience-certification/review" && request.method === "POST") { if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."}); try{return sendJson(response,201,await v54OperatorExperienceCertificationService.review(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}}
    if (url.pathname === "/api/v54-operator-experience-certification/certify" && request.method === "POST") { if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."}); try{return sendJson(response,201,await v54OperatorExperienceCertificationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}}

    if (url.pathname === "/api/role-based-service-ergonomics" && request.method === "GET") return sendJson(response,200,await roleBasedServiceErgonomicsService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname.startsWith("/api/role-based-service-ergonomics/locations/") && url.pathname.endsWith("/observe") && request.method === "POST") { if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."}); const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); try{return sendJson(response,201,await roleBasedServiceErgonomicsService.observe(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}}
    if (url.pathname.startsWith("/api/role-based-service-ergonomics/locations/") && url.pathname.endsWith("/certify") && request.method === "POST") { if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."}); const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); try{return sendJson(response,201,await roleBasedServiceErgonomicsService.certify(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}}

    if (url.pathname === "/api/manager-intervention-decision-speed" && request.method === "GET") return sendJson(response,200,await managerInterventionDecisionSpeedService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname.startsWith("/api/manager-intervention-decision-speed/locations/") && url.pathname.endsWith("/observe") && request.method === "POST") { if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."}); const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); try{return sendJson(response,201,await managerInterventionDecisionSpeedService.observe(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}}
    if (url.pathname.startsWith("/api/manager-intervention-decision-speed/locations/") && url.pathname.endsWith("/certify") && request.method === "POST") { if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."}); const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); try{return sendJson(response,201,await managerInterventionDecisionSpeedService.certify(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}}

    if (url.pathname === "/api/operator-speed-workflow" && request.method === "GET") return sendJson(response,200,await operatorSpeedWorkflowSimplificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    if (url.pathname.startsWith("/api/operator-speed-workflow/locations/") && url.pathname.endsWith("/observe") && request.method === "POST") { if (!authService.can(auth,"write")&&!authService.can(auth,"write_operations")&&!authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."}); const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); try{return sendJson(response,201,await operatorSpeedWorkflowSimplificationService.observe(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}}
    if (url.pathname.startsWith("/api/operator-speed-workflow/locations/") && url.pathname.endsWith("/certify") && request.method === "POST") { if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."}); const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); try{return sendJson(response,201,await operatorSpeedWorkflowSimplificationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],locationId,await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}}

    if (url.pathname === "/api/v53-restaurant-operational-certification" && request.method === "GET") {
      return sendJson(response,200,await v53RestaurantOperationalCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname === "/api/v53-restaurant-operational-certification/review" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"write_operations") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      try{return sendJson(response,201,await v53RestaurantOperationalCertificationService.review(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname === "/api/v53-restaurant-operational-certification/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required."});
      try{return sendJson(response,201,await v53RestaurantOperationalCertificationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],await readJson(request),auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/failure-recovery-shift-continuity" && request.method === "GET") {
      return sendJson(response,200,await failureRecoveryShiftContinuityService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname.startsWith("/api/failure-recovery-shift-continuity/locations/") && url.pathname.endsWith("/rehearse") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"write_operations") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required for failure-recovery rehearsal."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await failureRecoveryShiftContinuityService.rehearse(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/failure-recovery-shift-continuity/locations/") && url.pathname.endsWith("/decision") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for RECOVER/DEGRADED/HOLD decision."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await failureRecoveryShiftContinuityService.decide(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/peak-service-workflow-resilience" && request.method === "GET") {
      return sendJson(response,200,await peakServiceWorkflowResilienceService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname.startsWith("/api/peak-service-workflow-resilience/locations/") && url.pathname.endsWith("/observe") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"write_operations") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required for peak-service observation."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await peakServiceWorkflowResilienceService.observe(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/peak-service-workflow-resilience/locations/") && url.pathname.endsWith("/certify") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for READY/DEGRADED/HOLD decision."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await peakServiceWorkflowResilienceService.certify(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/restaurant-workflow-integration" && request.method === "GET") {
      return sendJson(response,200,await restaurantWorkflowIntegrationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname.startsWith("/api/restaurant-workflow-integration/locations/") && url.pathname.endsWith("/observe") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"write_operations") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required for restaurant workflow observation."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await restaurantWorkflowIntegrationService.observe(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/restaurant-workflow-integration/locations/") && url.pathname.endsWith("/certify") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for restaurant workflow certification."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await restaurantWorkflowIntegrationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/v52-operational-readiness" && request.method === "GET") {
      return sendJson(response,200,await v52OperationalReadinessCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname === "/api/v52-operational-readiness/review" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for V52 closure review."});
      const body=await readJson(request);
      try{return sendJson(response,201,await v52OperationalReadinessCertificationService.review(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname === "/api/v52-operational-readiness/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to certify V52 closure."});
      const body=await readJson(request);
      try{return sendJson(response,201,await v52OperationalReadinessCertificationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/operational-expansion-orchestration" && request.method === "GET") {
      return sendJson(response,200,await operationalIntegrationExpansionOrchestrationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname === "/api/operational-expansion-orchestration/plans" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to create operational expansion orchestration."});
      const body=await readJson(request);
      try{return sendJson(response,201,await operationalIntegrationExpansionOrchestrationService.createPlan(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/operational-expansion-orchestration/plans/") && url.pathname.endsWith("/decision") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for READY/PAUSE/HOLD decisions."});
      const planId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await operationalIntegrationExpansionOrchestrationService.decide(auth.membership.organizationId,auth.membership.locationIds||[],planId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/expansion-repeatability" && request.method === "GET") {
      return sendJson(response,200,await expansionRepeatabilityCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname === "/api/expansion-repeatability/playbook" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to create the expansion playbook."});
      const body=await readJson(request);
      try{return sendJson(response,201,await expansionRepeatabilityCertificationService.createPlaybook(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname === "/api/expansion-repeatability/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for repeatability certification."});
      const body=await readJson(request);
      try{return sendJson(response,201,await expansionRepeatabilityCertificationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/expansion-portfolio-proof" && request.method === "GET") {
      return sendJson(response,200,await expansionPortfolioProofService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname === "/api/expansion-portfolio-proof/assess" && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Management permission required for portfolio-proof assessment."});
      const body=await readJson(request);
      try{return sendJson(response,201,await expansionPortfolioProofService.assess(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname === "/api/expansion-portfolio-proof/decision" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for REPEAT/HOLD/ROLLBACK decisions."});
      const body=await readJson(request);
      try{return sendJson(response,201,await expansionPortfolioProofService.decide(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/expansion-cohort-observation" && request.method === "GET") {
      return sendJson(response,200,await expansionCohortObservationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname.startsWith("/api/expansion-cohort-observation/cohorts/") && url.pathname.endsWith("/activate") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to record cohort activation."});
      const cohortId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await expansionCohortObservationService.activate(auth.membership.organizationId,auth.membership.locationIds||[],cohortId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/expansion-cohort-observation/activations/") && url.pathname.endsWith("/observe") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"write_operations") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required to record cohort observations."});
      const activationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await expansionCohortObservationService.observe(auth.membership.organizationId,auth.membership.locationIds||[],activationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/expansion-cohort-observation/activations/") && url.pathname.endsWith("/decision") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for CONTINUE/PAUSE/HOLD decisions."});
      const activationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await expansionCohortObservationService.decide(auth.membership.organizationId,auth.membership.locationIds||[],activationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/multi-location-expansion" && request.method === "GET") {
      return sendJson(response,200,await multiLocationExpansionControlService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname === "/api/multi-location-expansion/plans" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to create a multi-location expansion plan."});
      const body=await readJson(request);
      try{return sendJson(response,201,await multiLocationExpansionControlService.createPlan(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/multi-location-expansion/plans/") && url.pathname.endsWith("/approve") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for multi-location expansion approval."});
      const planId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await multiLocationExpansionControlService.approve(auth.membership.organizationId,auth.membership.locationIds||[],planId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/expansion-replication" && request.method === "GET") {
      return sendJson(response,200,await expansionReplicationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname.startsWith("/api/expansion-replication/locations/") && url.pathname.endsWith("/generate") && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Management permission required to generate replication package."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await expansionReplicationService.generate(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/expansion-replication/locations/") && url.pathname.endsWith("/approve") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for expansion replication approval."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await expansionReplicationService.approve(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/pilot-closeout-outcome" && request.method === "GET") {
      return sendJson(response,200,await pilotCloseoutOutcomeService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname.startsWith("/api/pilot-closeout-outcome/locations/") && url.pathname.endsWith("/review") && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Management permission required for pilot closeout review."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotCloseoutOutcomeService.review(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/pilot-closeout-outcome/locations/") && url.pathname.endsWith("/decision") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for EXPAND/HOLD/RETIRE decisions."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotCloseoutOutcomeService.decide(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/pilot-stabilization-exit" && request.method === "GET") {
      return sendJson(response,200,await pilotStabilizationExitService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname.startsWith("/api/pilot-stabilization-exit/locations/") && url.pathname.endsWith("/assess") && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write_operations") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Management/operations permission required for stabilization assessment."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotStabilizationExitService.assess(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/pilot-stabilization-exit/locations/") && url.pathname.endsWith("/decision") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for STABLE/EXTEND/ROLLBACK decisions."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotStabilizationExitService.decide(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/pilot-execution-observation" && request.method === "GET") {
      return sendJson(response,200,await pilotExecutionObservationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname.startsWith("/api/pilot-execution-observation/locations/") && url.pathname.endsWith("/start") && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Administrative/manager permission required to record pilot start."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotExecutionObservationService.start(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/pilot-execution-observation/sessions/") && url.pathname.endsWith("/milestone") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"write_operations") && !authService.can(auth,"write_reservations")) return sendJson(response,403,{error:"Operational write permission required to confirm pilot milestones."});
      const sessionId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotExecutionObservationService.confirmMilestone(auth.membership.organizationId,auth.membership.locationIds||[],sessionId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/pilot-execution-observation/sessions/") && url.pathname.endsWith("/observe") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"write_operations")) return sendJson(response,403,{error:"Operations write permission required to record pilot health observations."});
      const sessionId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotExecutionObservationService.observe(auth.membership.organizationId,auth.membership.locationIds||[],sessionId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/pilot-execution-observation/sessions/") && url.pathname.endsWith("/decision") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for CONTINUE/HOLD/ROLLBACK decisions."});
      const sessionId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotExecutionObservationService.decide(auth.membership.organizationId,auth.membership.locationIds||[],sessionId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/pilot-launch-control" && request.method === "GET") {
      return sendJson(response,200,await pilotLaunchControlService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }
    if (url.pathname.startsWith("/api/pilot-launch-control/locations/") && url.pathname.endsWith("/configure") && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Administrative/manager permission required to configure pilot launch control."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotLaunchControlService.configure(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/pilot-launch-control/controls/") && url.pathname.includes("/blockers/") && url.pathname.endsWith("/resolve") && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Administrative/manager permission required to resolve pilot launch blockers."});
      const parts=url.pathname.split("/"); const controlId=decodeURIComponent(parts[4]||""); const blockerId=decodeURIComponent(parts[6]||""); const body=await readJson(request);
      try{return sendJson(response,200,await pilotLaunchControlService.resolveBlocker(auth.membership.organizationId,controlId,blockerId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }
    if (url.pathname.startsWith("/api/pilot-launch-control/locations/") && url.pathname.endsWith("/authorize") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for pilot launch authorization."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotLaunchControlService.authorize(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/pilot-deployment-package" && request.method === "GET") {
      return sendJson(response,200,await pilotDeploymentPackageService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/pilot-deployment-package/locations/") && url.pathname.endsWith("/generate") && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Administrative/manager permission required to generate a pilot deployment package."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotDeploymentPackageService.generate(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/pilot-deployment-package/locations/") && url.pathname.endsWith("/certify") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for pilot deployment certification."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await pilotDeploymentPackageService.certify(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/management-executive-accuracy" && request.method === "GET") {
      return sendJson(response,200,await managementExecutiveAccuracyService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/management-executive-accuracy/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for management/executive accuracy certification."});
      const body=await readJson(request);
      try{return sendJson(response,201,await managementExecutiveAccuracyService.certify(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/live-floor-service-certification" && request.method === "GET") {
      return sendJson(response,200,await liveFloorServiceCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/live-floor-service-certification/locations/") && url.pathname.endsWith("/start") && request.method === "POST") {
      if (!authService.can(auth,"write_operations") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Operations write permission required to start a floor/service rehearsal."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await liveFloorServiceCertificationService.start(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/live-floor-service-certification/sessions/") && url.pathname.endsWith("/checkpoint") && request.method === "POST") {
      if (!authService.can(auth,"write_operations") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Operations write permission required to record a floor/service checkpoint."});
      const sessionId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await liveFloorServiceCertificationService.checkpoint(auth.membership.organizationId,auth.membership.locationIds||[],sessionId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/live-floor-service-certification/locations/") && url.pathname.endsWith("/certify") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for live floor/service certification."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await liveFloorServiceCertificationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/reservation-guest-journey" && request.method === "GET") {
      return sendJson(response,200,await reservationGuestJourneyCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/reservation-guest-journey/locations/") && url.pathname.endsWith("/start") && request.method === "POST") {
      if (!authService.can(auth,"write_reservations") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Reservation write permission required to start a guest-journey rehearsal."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await reservationGuestJourneyCertificationService.start(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/reservation-guest-journey/sessions/") && url.pathname.endsWith("/checkpoint") && request.method === "POST") {
      if (!authService.can(auth,"write_reservations") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Reservation write permission required to record a guest-journey checkpoint."});
      const sessionId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await reservationGuestJourneyCertificationService.checkpoint(auth.membership.organizationId,auth.membership.locationIds||[],sessionId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/reservation-guest-journey/locations/") && url.pathname.endsWith("/certify") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for reservation/guest journey certification."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await reservationGuestJourneyCertificationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/operator-ux-hardening" && request.method === "GET") {
      return sendJson(response,200,await operatorUxHardeningService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/operator-ux-hardening/findings" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"write_operations")) return sendJson(response,403,{error:"Operational write permission required to record operator friction."});
      const body=await readJson(request);
      try{return sendJson(response,201,await operatorUxHardeningService.recordFinding(auth.membership.organizationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/operator-ux-hardening/findings/") && url.pathname.endsWith("/resolve") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"write_operations")) return sendJson(response,403,{error:"Operational write permission required to resolve operator friction."});
      const id=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,200,await operatorUxHardeningService.resolveFinding(auth.membership.organizationId,id,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/operator-ux-hardening/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for operator-UX certification."});
      const body=await readJson(request);
      try{return sendJson(response,201,await operatorUxHardeningService.certify(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/role-permission-certification" && request.method === "GET") {
      return sendJson(response,200,await rolePermissionCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/role-permission-certification/certify" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for role-permission certification."});
      const body=await readJson(request);
      try{return sendJson(response,201,await rolePermissionCertificationService.certify(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/data-integrity-recovery" && request.method === "GET") {
      return sendJson(response,200,await dataIntegrityRecoveryService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/data-integrity-recovery/locations/") && url.pathname.endsWith("/verify") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required for integrity verification."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await dataIntegrityRecoveryService.runVerification(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/data-integrity-recovery/locations/") && url.pathname.endsWith("/certify") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for data-integrity certification."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||""); const body=await readJson(request);
      try{return sendJson(response,201,await dataIntegrityRecoveryService.certify(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/peak-service-stress" && request.method === "GET") {
      return sendJson(response,200,await peakServiceStressTestService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/peak-service-stress/locations/") && url.pathname.endsWith("/start") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required to start a peak-service stress rehearsal."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const body=await readJson(request);
      try{return sendJson(response,201,await peakServiceStressTestService.start(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/peak-service-stress/runs/") && url.pathname.endsWith("/result") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required to record a stress-test result."});
      const runId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const body=await readJson(request);
      try{return sendJson(response,201,await peakServiceStressTestService.recordResult(auth.membership.organizationId,auth.membership.locationIds||[],runId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/restaurant-day-lifecycle" && request.method === "GET") {
      return sendJson(response,200,await restaurantDayLifecycleService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/restaurant-day-lifecycle/locations/") && url.pathname.endsWith("/start") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required to start a restaurant-day rehearsal."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const body=await readJson(request);
      try{return sendJson(response,201,await restaurantDayLifecycleService.start(auth.membership.organizationId,auth.membership.locationIds||[],locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/restaurant-day-lifecycle/sessions/") && url.pathname.endsWith("/checkpoint") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required to record a restaurant-day checkpoint."});
      const sessionId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const body=await readJson(request);
      try{return sendJson(response,201,await restaurantDayLifecycleService.checkpoint(auth.membership.organizationId,auth.membership.locationIds||[],sessionId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/pilot-operational-readiness" && request.method === "GET") {
      return sendJson(response,200,await pilotOperationalReadinessService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/v50-release-certification" && request.method === "GET") {
      return sendJson(response,200,await v50ReleaseCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/production-corrective-action-governance" && request.method === "GET") {
      return sendJson(response,200,await productionCorrectiveActionGovernanceService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/production-corrective-action-governance/reviews/") && url.pathname.endsWith("/verify") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required to verify corrective-action evidence."});
      const parts=url.pathname.split("/");
      const reviewId=decodeURIComponent(parts[4]||"");
      const actionId=decodeURIComponent(parts[6]||"");
      const body=await readJson(request);
      try{return sendJson(response,201,await productionCorrectiveActionGovernanceService.verify(auth.membership.organizationId,auth.membership.locationIds||[],reviewId,actionId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/production-corrective-action-governance/reviews/") && url.pathname.endsWith("/accept-completion") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to accept corrective-action completion."});
      const parts=url.pathname.split("/");
      const reviewId=decodeURIComponent(parts[4]||"");
      const actionId=decodeURIComponent(parts[6]||"");
      const body=await readJson(request);
      try{return sendJson(response,200,await productionCorrectiveActionGovernanceService.acceptCompletion(auth.membership.organizationId,auth.membership.locationIds||[],reviewId,actionId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/production-recovery-review" && request.method === "GET") {
      return sendJson(response,200,await productionRecoveryReviewService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/production-recovery-review/incidents/") && url.pathname.endsWith("/review") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required to create a post-incident review."});
      const incidentId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const body=await readJson(request);
      try{return sendJson(response,201,await productionRecoveryReviewService.createReview(auth.membership.organizationId,auth.membership.locationIds||[],incidentId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/production-recovery-review/reviews/") && url.pathname.endsWith("/accept-lessons") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to accept post-incident lessons."});
      const reviewId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const body=await readJson(request);
      try{return sendJson(response,200,await productionRecoveryReviewService.acceptLessons(auth.membership.organizationId,reviewId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/production-incident-command" && request.method === "GET") {
      return sendJson(response,200,await productionIncidentCommandService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/production-incident-command" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required to create a production incident command."});
      const body=await readJson(request);
      try{return sendJson(response,201,await productionIncidentCommandService.create(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/production-incident-command/") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required to update a production incident command."});
      const incidentId=decodeURIComponent(url.pathname.split("/")[3]||"");
      const body=await readJson(request);
      try{return sendJson(response,200,await productionIncidentCommandService.update(auth.membership.organizationId,incidentId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/production-health-support" && request.method === "GET") {
      return sendJson(response,200,await productionHealthSupportService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/production-health-support/locations/") && url.pathname.endsWith("/events") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required to create a production support event."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      const body=await readJson(request);
      try{return sendJson(response,201,await productionHealthSupportService.createEvent(auth.membership.organizationId,allowed,locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/production-health-support/events/") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required to update a production support event."});
      const eventId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const body=await readJson(request);
      try{return sendJson(response,200,await productionHealthSupportService.updateEvent(auth.membership.organizationId,eventId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/production-operations-handoff" && request.method === "GET") {
      return sendJson(response,200,await productionOperationsHandoffService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/production-operations-handoff/locations/") && url.pathname.endsWith("/accept") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for production-operations acceptance."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      const body=await readJson(request);
      try{return sendJson(response,201,await productionOperationsHandoffService.accept(auth.membership.organizationId,allowed,locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/v49-release-certification" && request.method === "GET") {
      return sendJson(response,200,await v49ReleaseCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/launch-stabilization" && request.method === "GET") {
      return sendJson(response,200,await launchStabilizationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/launch-stabilization/locations/") && url.pathname.endsWith("/observe") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Write permission required to record stabilization observations."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      const body=await readJson(request);
      try{return sendJson(response,201,await launchStabilizationService.observe(auth.membership.organizationId,allowed,locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/launch-stabilization/locations/") && url.pathname.endsWith("/declare") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for stabilization declaration."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      const body=await readJson(request);
      try{return sendJson(response,201,await launchStabilizationService.declare(auth.membership.organizationId,allowed,locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/go-live-command" && request.method === "GET") {
      return sendJson(response,200,await goLiveCommandService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/go-live-command/locations/") && url.pathname.endsWith("/authorize-execution") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to authorize manual production cutover."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      const body=await readJson(request);
      try{return sendJson(response,201,await goLiveCommandService.authorizeExecution(auth.membership.organizationId,allowed,locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/go-live-command/locations/") && url.pathname.endsWith("/record-result") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to record a production cutover result."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      const body=await readJson(request);
      try{return sendJson(response,201,await goLiveCommandService.recordResult(auth.membership.organizationId,allowed,locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/location-deployment-package" && request.method === "GET") {
      return sendJson(response,200,await locationDeploymentPackageService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/location-deployment-package/locations/") && url.pathname.endsWith("/packet") && request.method === "GET") {
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      try{return sendJson(response,200,await locationDeploymentPackageService.packet(auth.membership.organizationId,allowed,locationId));}
      catch(error){return sendJson(response,404,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/location-deployment-package/locations/") && url.pathname.endsWith("/prepare") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to prepare a deployment package."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      const body=await readJson(request);
      try{return sendJson(response,201,await locationDeploymentPackageService.prepare(auth.membership.organizationId,allowed,locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/technical-activation-readiness" && request.method === "GET") {
      return sendJson(response,200,await technicalActivationReadinessService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/technical-activation-readiness/locations/") && url.pathname.endsWith("/packet") && request.method === "GET") {
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      try{
        const snapshot=await technicalActivationReadinessService.snapshot(auth.membership.organizationId,allowed);
        return sendJson(response,200,technicalActivationReadinessService.packet(snapshot,locationId));
      }catch(error){return sendJson(response,404,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/technical-activation-readiness/locations/") && url.pathname.endsWith("/authorize-go-live") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for go-live authorization."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      const body=await readJson(request);
      try{return sendJson(response,201,await technicalActivationReadinessService.authorize(auth.membership.organizationId,allowed,locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/rollout-activation-control" && request.method === "GET") {
      return sendJson(response,200,await rolloutActivationControlService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname.startsWith("/api/rollout-activation-control/locations/") && url.pathname.endsWith("/approve") && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required for activation approval."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      const body=await readJson(request);
      try{return sendJson(response,201,await rolloutActivationControlService.approve(auth.membership.organizationId,allowed,locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/v48-release-certification" && request.method === "GET") {
      return sendJson(response,200,await v48ReleaseCertificationService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/expansion-readiness" && request.method === "GET") { return sendJson(response,200,await expansionReadinessService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[])); }
    if (url.pathname === "/api/expansion-readiness/draft" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to draft expansion rollout."});
      const body=await readJson(request);try{return sendJson(response,201,await expansionReadinessService.draft(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/pilot-decision-ledger" && request.method === "GET") {
      return sendJson(response,200,await pilotDecisionLedgerService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/pilot-decision-ledger/sign" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive/admin permission required to sign a pilot decision."});
      const body=await readJson(request);
      try{return sendJson(response,201,await pilotDecisionLedgerService.sign(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/executive-pilot-review" && request.method === "GET") {
      return sendJson(response,200,await executivePilotReviewService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/executive-pilot-review/text" && request.method === "GET") {
      const snapshot=await executivePilotReviewService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]);
      return sendJson(response,200,{version:"48.15.0",text:executivePilotReviewService.text(snapshot)});
    }

    if (url.pathname === "/api/executive-pilot-review/archive" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive pilot review archive permission required."});
      const body=await readJson(request);
      try{return sendJson(response,201,await executivePilotReviewService.archive(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/pilot-proof-program" && request.method === "GET") {
      return sendJson(response,200,await pilotProofProgramService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/pilot-proof-program/configure" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot success-criteria permission required."});
      const body=await readJson(request);
      try{return sendJson(response,201,await pilotProofProgramService.configure(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/pilot-value-scorecard" && request.method === "GET") {
      return sendJson(response,200,await pilotValueScorecardService.snapshot(auth.membership.organizationId,auth.membership.locationIds||[]));
    }

    if (url.pathname === "/api/pilot-value-scorecard/baseline" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot baseline permission required."});
      const body=await readJson(request);
      return sendJson(response,201,await pilotValueScorecardService.start(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));
    }

    if (url.pathname === "/api/pilot-value-scorecard/checkpoints" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Pilot checkpoint permission required."});
      const body=await readJson(request);
      try{return sendJson(response,201,await pilotValueScorecardService.checkpoint(auth.membership.organizationId,auth.membership.locationIds||[],body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/multi-location-performance" && request.method === "GET") {
      const allowed=auth.membership.locationIds||[];
      return sendJson(response,200,await multiLocationPerformanceService.snapshot(auth.membership.organizationId,allowed));
    }

    if (url.pathname.startsWith("/api/multi-location-performance/locations/") && url.pathname.endsWith("/acknowledge") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Leadership acknowledgement permission required."});
      const locationId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const allowed=auth.membership.locationIds||[];
      if(!allowed.includes("*")&&!allowed.includes(locationId)) return sendJson(response,403,{error:"Location is outside your authorized scope."});
      const body=await readJson(request);
      return sendJson(response,201,await multiLocationPerformanceService.acknowledge(auth.membership.organizationId,locationId,body,auth.user.name));
    }

    if (url.pathname === "/api/manager-operating-rhythm" && request.method === "GET") {
      const locationId=url.searchParams.get("locationId") || (auth.membership.locationIds || []).find(id=>id!=="*") || "loc_marina";
      if(v47RejectLocation(response,locationId)) return;
      return sendJson(response,200,await managerOperatingRhythmService.snapshot(auth.membership.organizationId,locationId));
    }

    if (url.pathname === "/api/manager-operating-rhythm/plan" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Shift plan permission required."});
      const body=await readJson(request); const locationId=body.locationId || (auth.membership.locationIds || []).find(id=>id!=="*") || "loc_marina";
      try{return sendJson(response,201,await managerOperatingRhythmService.createPlan(auth.membership.organizationId,locationId,body,auth.user.name));}
      catch(error){return sendJson(response,400,{error:error.message});}
    }

    if (url.pathname === "/api/manager-operating-rhythm/handoff" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Shift handoff permission required."});
      const body=await readJson(request); const locationId=body.locationId || (auth.membership.locationIds || []).find(id=>id!=="*") || "loc_marina";
      return sendJson(response,201,await managerOperatingRhythmService.createHandoff(auth.membership.organizationId,locationId,body,auth.user.name));
    }

    if (url.pathname === "/api/manager-operating-rhythm/closeout" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Shift closeout permission required."});
      const body=await readJson(request); const locationId=body.locationId || (auth.membership.locationIds || []).find(id=>id!=="*") || "loc_marina";
      return sendJson(response,201,await managerOperatingRhythmService.closeout(auth.membership.organizationId,locationId,body,auth.user.name));
    }

    if (url.pathname === "/api/predictive-shift-control" && request.method === "GET") {
      const locationId=url.searchParams.get("locationId") || (auth.membership.locationIds || []).find(id=>id!=="*") || "loc_marina";
      if(v47RejectLocation(response,locationId)) return;
      return sendJson(response,200,await predictiveShiftControlService.snapshot(auth.membership.organizationId,locationId));
    }

    if (url.pathname.startsWith("/api/predictive-shift-control/interventions/") && url.pathname.endsWith("/decision") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Predictive intervention permission required."});
      const interventionId=decodeURIComponent(url.pathname.split("/")[4]||"");
      const body=await readJson(request);
      const locationId=body.locationId || (auth.membership.locationIds || []).find(id=>id!=="*") || "loc_marina";
      if(v47RejectLocation(response,locationId)) return;
      try{return sendJson(response,201,await predictiveShiftControlService.decide(auth.membership.organizationId,locationId,interventionId,body,auth.user.name));}
      catch(error){return sendJson(response,/no longer active/i.test(error.message)?409:400,{error:error.message});}
    }

    if (url.pathname === "/api/service-profitability" && request.method === "GET") {
      const locationId=url.searchParams.get("locationId") || (auth.membership.locationIds || []).find(id=>id!=="*") || "loc_marina";
      if(v47RejectLocation(response,locationId)) return;
      return sendJson(response,200,await serviceProfitabilityIntelligenceService.snapshot(auth.membership.organizationId,locationId));
    }

    if (url.pathname === "/api/service-profitability/snapshots" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Profitability snapshot permission required."});
      const body=await readJson(request);
      const locationId=body.locationId || (auth.membership.locationIds || []).find(id=>id!=="*") || "loc_marina";
      if(v47RejectLocation(response,locationId)) return;
      return sendJson(response,201,await serviceProfitabilityIntelligenceService.capture(auth.membership.organizationId,locationId,auth.user.name));
    }

    if (url.pathname === "/api/hospitality-actions" && request.method === "GET") {
      const locationId = url.searchParams.get("locationId") || (auth.membership.locationIds || []).find(id => id !== "*") || "loc_marina";
      if(v47RejectLocation(response,locationId)) return;
      return sendJson(response,200,await hospitalityActionWorkspaceService.list(auth.membership.organizationId,locationId));
    }

    if (url.pathname === "/api/hospitality-actions" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Hospitality action permission required."});
      const body=await readJson(request);
      const locationId=body.locationId || (auth.membership.locationIds || []).find(id => id !== "*") || "loc_marina";
      if(v47RejectLocation(response,locationId)) return;
      const performance=await hospitalityPerformanceService.snapshot(auth.membership.organizationId,locationId);
      const opportunity=performance.opportunities.find(x=>x.id===body.opportunityId);
      if(!opportunity)return sendJson(response,404,{error:"Performance opportunity not found or no longer active."});
      return sendJson(response,201,await hospitalityActionWorkspaceService.createFromOpportunity(auth.membership.organizationId,locationId,opportunity,body,auth.user.name));
    }

    if (url.pathname.startsWith("/api/hospitality-actions/") && url.pathname.endsWith("/remeasure") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Hospitality outcome permission required."});
      const workspaceId=decodeURIComponent(url.pathname.split("/")[3]||"");
      const body=await readJson(request);
      const locationId=body.locationId || (auth.membership.locationIds || []).find(id => id !== "*") || "loc_marina";
      if(v47RejectLocation(response,locationId)) return;
      try{return sendJson(response,200,await hospitalityActionWorkspaceService.remeasure(auth.membership.organizationId,locationId,workspaceId,auth.user.name));}
      catch(error){return sendJson(response,/required|not found/i.test(error.message)?400:500,{error:error.message});}
    }

    if (url.pathname.startsWith("/api/hospitality-actions/") && request.method === "PATCH") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Hospitality action permission required."});
      const workspaceId=decodeURIComponent(url.pathname.split("/")[3]||"");
      const body=await readJson(request);
      const locationId=body.locationId || (auth.membership.locationIds || []).find(id => id !== "*") || "loc_marina";
      if(v47RejectLocation(response,locationId)) return;
      try{return sendJson(response,200,await hospitalityActionWorkspaceService.update(auth.membership.organizationId,locationId,workspaceId,body,auth.user.name));}
      catch(error){return sendJson(response,/not found/i.test(error.message)?404:400,{error:error.message});}
    }

    if (url.pathname === "/api/hospitality-performance" && request.method === "GET") {
      const locationId = url.searchParams.get("locationId") || (auth.membership.locationIds || []).find(id => id !== "*") || "loc_marina";
      if(v47RejectLocation(response,locationId)) return;
      return sendJson(response,200,await hospitalityPerformanceService.snapshot(auth.membership.organizationId,locationId));
    }

    if (url.pathname.startsWith("/api/hospitality-performance/opportunities/") && url.pathname.endsWith("/decision") && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Performance decision permission required."});
      const opportunityId = decodeURIComponent(url.pathname.split("/")[4] || "");
      const body = await readJson(request);
      const locationId = body.locationId || (auth.membership.locationIds || []).find(id => id !== "*") || "loc_marina";
      if(v47RejectLocation(response,locationId)) return;
      return sendJson(response,201,await hospitalityPerformanceService.decide(auth.membership.organizationId,locationId,opportunityId,body,auth.user.name));
    }

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
    if (url.pathname === "/api/integrations/reconciliation" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Reconciliation report requires read permission."});
      return sendJson(response,200,await dataReconciliationConflictService.report(organizationId));
    }
    if (url.pathname === "/api/integrations/reconciliation/compare" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Reconciliation comparison requires admin permission."});
      return sendJson(response,200,await dataReconciliationConflictService.compare(organizationId,await readJsonBody(request)));
    }
    if (url.pathname === "/api/integrations/reconciliation/resolve" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Reconciliation resolution requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await dataReconciliationConflictService.resolve(organizationId,body,auth.user?.email||auth.user?.id||"admin"));
    }
    if (url.pathname === "/api/integrations/reconciliation/authority" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Reconciliation authority changes require admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await dataReconciliationConflictService.setAuthority(organizationId,body,auth.user?.email||auth.user?.id||"admin"));
    }

    if (url.pathname === "/api/integrations/sync-reliability" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Connector sync reliability requires read permission."});
      return sendJson(response,200,await connectorSyncReliabilityService.report(organizationId));
    }
    if (url.pathname === "/api/integrations/sync-reliability/checkpoint" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Connector checkpoint requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await connectorSyncReliabilityService.checkpoint(organizationId,body,auth.user?.email||auth.user?.id||"connector"));
    }
    if (url.pathname === "/api/integrations/sync-reliability/event" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Connector event acceptance requires admin permission."});
      return sendJson(response,200,await connectorSyncReliabilityService.acceptEvent(organizationId,await readJsonBody(request)));
    }
    if (url.pathname === "/api/integrations/sync-reliability/failure" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Connector failure recording requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await connectorSyncReliabilityService.recordFailure(organizationId,body,auth.user?.email||auth.user?.id||"connector"));
    }
    if (url.pathname === "/api/integrations/sync-reliability/recover" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Connector recovery requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await connectorSyncReliabilityService.recover(organizationId,body,auth.user?.email||auth.user?.id||"admin"));
    }

    if (url.pathname === "/api/integrations/readiness" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Integration readiness requires read permission."});
      return sendJson(response,200,await integrationReadinessService.report(organizationId));
    }
    if (url.pathname === "/api/integrations/readiness/connectors" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Connector readiness configuration requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await integrationReadinessService.upsert(organizationId,body,auth.user?.email||auth.user?.id||"admin"));
    }

    if (url.pathname === "/api/system/architecture-baseline" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Architecture baseline requires read permission."});
      return sendJson(response,200,architectureFreezeService.build());
    }

    if (url.pathname === "/api/executive/intelligence" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Executive intelligence requires read permission."});
      return sendJson(response,200,await intelligenceConsolidationService.build(organizationId,auth.allowedLocationIds||[]));
    }

    if (url.pathname === "/api/executive/playbook-governance" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Playbook governance requires read permission."});
      return sendJson(response,200,await playbookGovernanceAuthorityService.audit(organizationId));
    }
    if (url.pathname === "/api/executive/playbook-governance/policy" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Playbook governance policy requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await playbookGovernanceAuthorityService.setPolicy(organizationId,body,auth.user?.email||auth.user?.id||"executive"));
    }
    if (url.pathname === "/api/executive/playbook-governance/review" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Playbook governance review requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await playbookGovernanceAuthorityService.submitReview(organizationId,body.playbookId,body,auth.user?.email||auth.user?.id||"reviewer"));
    }
    if (url.pathname === "/api/executive/playbook-governance/approve" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Playbook governance approval requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await playbookGovernanceAuthorityService.approve(organizationId,auth.allowedLocationIds||[],body.playbookId,body,auth.user?.email||auth.user?.id||"approver"));
    }
    if (url.pathname === "/api/executive/playbook-governance/transition" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Playbook governance transition requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await playbookGovernanceAuthorityService.transition(organizationId,body.playbookId,body,auth.user?.email||auth.user?.id||"approver"));
    }

    if (url.pathname === "/api/executive/playbook-evidence-lifecycle" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Playbook evidence lifecycle requires read permission."});
      return sendJson(response,200,await playbookEvidenceLifecycleService.evaluate(organizationId,auth.allowedLocationIds||[]));
    }
    if (url.pathname === "/api/executive/playbook-evidence-lifecycle/acknowledge" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Playbook evidence review acknowledgement requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await playbookEvidenceLifecycleService.acknowledgeReview(organizationId,body.playbookId,body,auth.user?.email||auth.user?.id||"executive"));
    }

    if (url.pathname === "/api/executive/portfolio-learning" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Portfolio learning requires read permission."});
      return sendJson(response,200,await portfolioLearningPlaybookIntelligenceService.build(organizationId,auth.allowedLocationIds||[]));
    }
    if (url.pathname === "/api/executive/portfolio-playbooks/draft" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Playbook drafting requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await portfolioLearningPlaybookIntelligenceService.createDraft(organizationId,auth.allowedLocationIds||[],body,auth.user?.email||auth.user?.id||"executive"));
    }
    if (url.pathname === "/api/executive/portfolio-playbooks/approve" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Playbook approval requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await portfolioLearningPlaybookIntelligenceService.approve(organizationId,body.playbookId,body,auth.user?.email||auth.user?.id||"executive"));
    }
    if (url.pathname === "/api/executive/portfolio-playbooks/retire" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Playbook retirement requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await portfolioLearningPlaybookIntelligenceService.retire(organizationId,body.playbookId,body,auth.user?.email||auth.user?.id||"executive"));
    }

    if (url.pathname === "/api/executive/decision-outcome-intelligence" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Decision outcome intelligence requires read permission."});
      return sendJson(response,200,await executiveDecisionOutcomeIntelligenceService.build(organizationId,auth.allowedLocationIds||[]));
    }

    if (url.pathname === "/api/executive/portfolio-decisions" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Portfolio decisions require read permission."});
      return sendJson(response,200,await portfolioDecisionAccountabilityService.list(organizationId,auth.allowedLocationIds||[]));
    }
    if (url.pathname === "/api/executive/portfolio-decisions" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Portfolio decision creation requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,201,await portfolioDecisionAccountabilityService.create(organizationId,auth.allowedLocationIds||[],body,auth.user?.email||auth.user?.id||"executive"));
    }
    if (url.pathname === "/api/executive/portfolio-decisions/review" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Portfolio decision review requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await portfolioDecisionAccountabilityService.review(organizationId,auth.allowedLocationIds||[],body.decisionId,body,auth.user?.email||auth.user?.id||"executive"));
    }

    if (url.pathname === "/api/executive/portfolio-exceptions" && request.method === "GET") {
      if (!authService.can(auth,"read") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Portfolio exceptions require read permission."});
      return sendJson(response,200,await portfolioExceptionCommandService.list(organizationId,auth.allowedLocationIds||[]));
    }
    if (url.pathname === "/api/executive/portfolio-exceptions/acknowledge" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Portfolio exception acknowledgement requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await portfolioExceptionCommandService.acknowledge(organizationId,auth.allowedLocationIds||[],body.exceptionId,body,auth.user?.email||auth.user?.id||"executive"));
    }
    if (url.pathname === "/api/executive/portfolio-exceptions/resolve" && request.method === "POST") {
      if (!authService.can(auth,"admin")) return sendJson(response,403,{error:"Portfolio exception resolution requires admin permission."});
      const body=await readJsonBody(request);
      return sendJson(response,200,await portfolioExceptionCommandService.resolve(organizationId,auth.allowedLocationIds||[],body.exceptionId,body,auth.user?.email||auth.user?.id||"executive"));
    }
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
    if (url.pathname === "/api/aip/workflow-supervision" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipWorkflowSupervision(organizationId));
    if (url.pathname === "/api/aip/v44-closure-readiness" && request.method === "GET") return sendJson(response, 200, await liveIntegrationService.aipV44ClosureReadiness(organizationId));


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
    if (url.pathname === "/api/autonomous-assistance/cycles" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45DecisionCycles(organizationId));
    if (url.pathname === "/api/autonomous-assistance/cycles" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45DecisionCycle(organizationId,auth.user.name));
    }
    if (url.pathname === "/api/autonomous-assistance/readiness" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45Readiness(organizationId));
    if (url.pathname === "/api/autonomous-assistance/intervention-policies" && request.method === "GET") return sendJson(response,200,{organizationId,policies:autonomousOperationsService.v45InterventionPolicies(),build:"45.10.0-governed-intervention-planning"});
    if (url.pathname === "/api/autonomous-assistance/intervention-proposals" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45InterventionProposals(organizationId));
    if (url.pathname === "/api/autonomous-assistance/intervention-proposals" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45InterventionProposals(organizationId,auth.user.name,await readJson(request)));
    }
    if (url.pathname === "/api/autonomous-assistance/intervention-rehearsals" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45InterventionRehearsals(organizationId));
    if (url.pathname === "/api/autonomous-assistance/intervention-rehearsals" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45InterventionRehearsals(organizationId,auth.user.name,await readJson(request)));
    }
    if (url.pathname === "/api/autonomous-assistance/intervention-readiness" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45InterventionReadiness(organizationId));
    if (url.pathname === "/api/autonomous-assistance/approval-packets" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45ApprovalPackets(organizationId));
    if (url.pathname === "/api/autonomous-assistance/approval-packets" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Operations permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45ApprovalPackets(organizationId,auth.user.name,await readJson(request)));
    }
    if (url.pathname === "/api/autonomous-assistance/approval-revalidate" && request.method === "POST") {
      const body=await readJson(request);return sendJson(response,200,await autonomousOperationsService.v45RevalidateApprovalPacket(organizationId,body.packetId));
    }
    if (url.pathname === "/api/autonomous-assistance/approval-decisions" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Approval permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45ApprovalDecision(organizationId,auth.user.name,await readJson(request)));
    }
    if (url.pathname === "/api/autonomous-assistance/command-drafts" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45CommandDrafts(organizationId));
    if (url.pathname === "/api/autonomous-assistance/command-drafts" && request.method === "POST") {
      if (!authService.can(auth,"write") && !authService.can(auth,"admin")) return sendJson(response,403,{error:"Command draft permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45CommandDrafts(organizationId,auth.user.name,await readJson(request)));
    }
    if (url.pathname === "/api/autonomous-assistance/authorization-readiness" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45AuthorizationReadiness(organizationId));
    if (url.pathname === "/api/autonomous-assistance/execution-boundary" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45ExecutionBoundary(organizationId));
    if (url.pathname === "/api/autonomous-assistance/execution-boundary" && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Execution boundary permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45ExecutionBoundary(organizationId,auth.user.name,await readJson(request)));
    }
    if (url.pathname === "/api/autonomous-assistance/shadow-executions" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45ShadowExecutions(organizationId));
    if (url.pathname === "/api/autonomous-assistance/shadow-executions" && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Shadow execution permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45ShadowExecutions(organizationId,auth.user.name,await readJson(request)));
    }
    if (url.pathname === "/api/autonomous-assistance/execution-readiness" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45ExecutionReadiness(organizationId));
    if (url.pathname === "/api/autonomous-assistance/execution-certifications" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45ExecutionCertifications(organizationId));
    if (url.pathname === "/api/autonomous-assistance/execution-certifications" && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Execution certification permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45ExecutionCertifications(organizationId,auth.user.name,await readJson(request)));
    }
    if (url.pathname === "/api/autonomous-assistance/execution-certification-control" && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Execution certification permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45ExecutionCertificationControl(organizationId,auth.user.name,await readJson(request)));
    }
    if (url.pathname === "/api/autonomous-assistance/controlled-execution-readiness" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45ControlledExecutionReadiness(organizationId));
    if (url.pathname === "/api/autonomous-assistance/failure-recovery-rehearsals" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45FailureRecoveryRehearsals(organizationId));
    if (url.pathname === "/api/autonomous-assistance/failure-recovery-rehearsals" && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Failure/recovery certification permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45FailureRecoveryRehearsals(organizationId,auth.user.name,await readJson(request)));
    }
    if (url.pathname === "/api/autonomous-assistance/failure-recovery-control" && request.method === "POST") {
      if (!authService.can(auth,"admin") && !authService.can(auth,"write")) return sendJson(response,403,{error:"Failure/recovery certification permission required."});
      return sendJson(response,200,await autonomousOperationsService.v45FailureRecoveryControl(organizationId,auth.user.name,await readJson(request)));
    }
    if (url.pathname === "/api/autonomous-assistance/failure-recovery-readiness" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45FailureRecoveryReadiness(organizationId));
    if (url.pathname === "/api/autonomous-assistance/v45-closure-readiness" && request.method === "GET") return sendJson(response,200,await autonomousOperationsService.v45ClosureReadiness(organizationId));
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

    if (url.pathname === "/api/reservation-operations/complete" && request.method === "POST") {
      if (!authService.can(auth, "write") && !authService.can(auth, "write_reservations")) {
        return sendJson(response, 403, { error: "Reservation completion permission required." });
      }
      const body = await readJson(request);
      const reservation = await database.get("reservations", body.reservationId);
      if (!reservation || !canAccessLocation(reservation.locationId)) {
        return sendJson(response, 404, { error: "Reservation not found." });
      }
      const result = await reservationOperationsService.complete(
        body.reservationId,
        auth.user.name,
        organizationId
      );
      return result
        ? sendJson(response, 200, result)
        : sendJson(response, 409, { error: "Unable to complete this service." });
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
