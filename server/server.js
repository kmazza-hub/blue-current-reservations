
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const DatabaseService = require("./services/databaseService");
const AuditService = require("./services/auditService");
const IdempotencyService = require("./services/idempotencyService");
const SyncReconciliationService = require("./services/syncReconciliationService");
const TelemetryService = require("./services/telemetryService");
const ReliabilityAutomationService = require("./services/reliabilityAutomationService");
const ReservationService = require("./services/reservationService");
const RealtimeHub = require("./realtime/realtimeHub");
const AuthService = require("./services/authService");
const FloorService = require("./services/floorService");
const ReservationOperationsService = require("./services/reservationOperationsService");
const StaffOperationsService = require("./services/staffOperationsService");
const KitchenOperationsService = require("./services/kitchenOperationsService");
const ServiceCoordinationService = require("./services/serviceCoordinationService");
const AiRestaurantBrainService = require("./services/aiRestaurantBrainService");
const ExecutiveCommandCenterService = require("./services/executiveCommandCenterService");
const AutonomousOperationsService = require("./services/autonomousOperationsService");
const GuestIntelligenceService = require("./services/guestIntelligenceService");
const WorkforceIntelligenceService = require("./services/workforceIntelligenceService");
const InventoryIntelligenceService = require("./services/inventoryIntelligenceService");
const TimeClockService = require("./services/timeClockService");
const WorkforceFoundationService = require("./services/workforceFoundationService");
const SchedulingService = require("./services/schedulingService");
const EmployeePortalService = require("./services/employeePortalService");
const CommandCenterService = require("./services/commandCenterService");
const OperationsFeedService = require("./services/operationsFeedService");
const LiveIntegrationService = require("./services/liveIntegrationService");
const RepositoryImpactService = require("./services/repositoryImpactService");
const RepositoryRetirementRehearsalService = require("./services/repositoryRetirementRehearsalService");
const RetirementAssuranceService = require("./services/retirementAssuranceService");
const RetirementCandidateImpactService = require("./services/retirementCandidateImpactService");
const V46ReleaseCertificationService = require("./services/v46ReleaseCertificationService");
const HospitalityPerformanceService = require("./services/hospitalityPerformanceService");
const HospitalityActionWorkspaceService = require("./services/hospitalityActionWorkspaceService");
const ServiceProfitabilityIntelligenceService = require("./services/serviceProfitabilityIntelligenceService");
const PredictiveShiftControlService = require("./services/predictiveShiftControlService");
const ManagerOperatingRhythmService = require("./services/managerOperatingRhythmService");
const MultiLocationPerformanceService = require("./services/multiLocationPerformanceService");
const PilotValueScorecardService = require("./services/pilotValueScorecardService");
const PilotProofProgramService = require("./services/pilotProofProgramService");
const ExecutivePilotReviewService = require("./services/executivePilotReviewService");
const PilotDecisionLedgerService = require("./services/pilotDecisionLedgerService");
const ExpansionReadinessService = require("./services/expansionReadinessService");
const V48ReleaseCertificationService = require("./services/v48ReleaseCertificationService");
const RolloutActivationControlService = require("./services/rolloutActivationControlService");
const TechnicalActivationReadinessService = require("./services/technicalActivationReadinessService");
const LocationDeploymentPackageService = require("./services/locationDeploymentPackageService");
const GoLiveCommandService = require("./services/goLiveCommandService");
const LaunchStabilizationService = require("./services/launchStabilizationService");
const V49ReleaseCertificationService = require("./services/v49ReleaseCertificationService");
const ProductionOperationsHandoffService = require("./services/productionOperationsHandoffService");
const ProductionHealthSupportService = require("./services/productionHealthSupportService");
const ProductionIncidentCommandService = require("./services/productionIncidentCommandService");
const ProductionRecoveryReviewService = require("./services/productionRecoveryReviewService");
const ProductionCorrectiveActionGovernanceService = require("./services/productionCorrectiveActionGovernanceService");
const V50ReleaseCertificationService = require("./services/v50ReleaseCertificationService");
const PilotOperationalReadinessService = require("./services/pilotOperationalReadinessService");
const RestaurantDayLifecycleService = require("./services/restaurantDayLifecycleService");
const PeakServiceStressTestService = require("./services/peakServiceStressTestService");
const DataIntegrityRecoveryService = require("./services/dataIntegrityRecoveryService");
const RolePermissionCertificationService = require("./services/rolePermissionCertificationService");
const OperatorUxHardeningService = require("./services/operatorUxHardeningService");
const ReservationGuestJourneyCertificationService = require("./services/reservationGuestJourneyCertificationService");
const createRouter = require("./api/router");

const ROOT = path.resolve(__dirname, "..");
const CLIENT_ROOT = path.join(ROOT, "client");
const DB_PATH = process.env.BLUE_CURRENT_DB || path.join(ROOT, "database", "data", "blue-current.json");
const PORT = Number(process.env.PORT || 8787);

const database = new DatabaseService(DB_PATH);
const realtimeHub = new RealtimeHub();
const auditService = new AuditService(database);
const idempotencyService = new IdempotencyService(database);
const syncReconciliationService = new SyncReconciliationService(database, auditService, realtimeHub);
const telemetryService = new TelemetryService(database, realtimeHub);
const reliabilityAutomationService = new ReliabilityAutomationService(database, telemetryService, auditService, realtimeHub);
const reservationService = new ReservationService(database, auditService, realtimeHub);
const authService = new AuthService(database, auditService);
const floorService = new FloorService(database, auditService, realtimeHub);
const reservationOperationsService = new ReservationOperationsService(database, auditService, realtimeHub);
const staffOperationsService = new StaffOperationsService(database, auditService, realtimeHub);
const kitchenOperationsService = new KitchenOperationsService(database, auditService, realtimeHub);
const serviceCoordinationService = new ServiceCoordinationService(database, auditService, realtimeHub);
const aiRestaurantBrainService = new AiRestaurantBrainService(database, auditService, realtimeHub);
const executiveCommandCenterService = new ExecutiveCommandCenterService(database, auditService, realtimeHub, aiRestaurantBrainService);
const autonomousOperationsService = new AutonomousOperationsService(database, auditService, realtimeHub, executiveCommandCenterService);
const guestIntelligenceService = new GuestIntelligenceService(database, auditService, realtimeHub);
const workforceIntelligenceService = new WorkforceIntelligenceService(database, auditService, realtimeHub, autonomousOperationsService);
const inventoryIntelligenceService = new InventoryIntelligenceService(database, auditService, realtimeHub);
const timeClockService = new TimeClockService(database, auditService, realtimeHub);
const workforceFoundationService = new WorkforceFoundationService(database, auditService, realtimeHub);
const schedulingService = new SchedulingService(database, auditService, realtimeHub);
const employeePortalService = new EmployeePortalService(database, auditService, realtimeHub);
const operationsFeedService = new OperationsFeedService(database);
const liveIntegrationService = new LiveIntegrationService(database, auditService, realtimeHub);
const commandCenterService = new CommandCenterService(database, operationsFeedService);
const repositoryImpactService = new RepositoryImpactService(ROOT);
const repositoryRetirementRehearsalService = new RepositoryRetirementRehearsalService(ROOT, repositoryImpactService);
const retirementAssuranceService = new RetirementAssuranceService(ROOT, repositoryImpactService);
const retirementCandidateImpactService = new RetirementCandidateImpactService(repositoryImpactService, retirementAssuranceService);
const v46ReleaseCertificationService = new V46ReleaseCertificationService(ROOT, retirementAssuranceService);
const hospitalityPerformanceService = new HospitalityPerformanceService(database, auditService, realtimeHub, commandCenterService, workforceIntelligenceService, inventoryIntelligenceService, guestIntelligenceService, executiveCommandCenterService);
const hospitalityActionWorkspaceService = new HospitalityActionWorkspaceService(database, auditService, realtimeHub, hospitalityPerformanceService);
const serviceProfitabilityIntelligenceService = new ServiceProfitabilityIntelligenceService(database, auditService, realtimeHub, commandCenterService, workforceIntelligenceService, inventoryIntelligenceService, guestIntelligenceService, executiveCommandCenterService);
const predictiveShiftControlService = new PredictiveShiftControlService(database, auditService, realtimeHub, commandCenterService, workforceIntelligenceService, serviceProfitabilityIntelligenceService);
const managerOperatingRhythmService = new ManagerOperatingRhythmService(database, auditService, realtimeHub, commandCenterService, hospitalityPerformanceService, hospitalityActionWorkspaceService, serviceProfitabilityIntelligenceService, predictiveShiftControlService);
const multiLocationPerformanceService = new MultiLocationPerformanceService(database, auditService, realtimeHub, managerOperatingRhythmService);
const pilotValueScorecardService = new PilotValueScorecardService(database, auditService, realtimeHub, multiLocationPerformanceService);
const pilotProofProgramService = new PilotProofProgramService(database, auditService, realtimeHub, pilotValueScorecardService);
const executivePilotReviewService = new ExecutivePilotReviewService(database, auditService, realtimeHub, pilotProofProgramService);
const pilotDecisionLedgerService = new PilotDecisionLedgerService(database, auditService, realtimeHub, executivePilotReviewService);
const expansionReadinessService = new ExpansionReadinessService(database, auditService, realtimeHub, pilotDecisionLedgerService, executivePilotReviewService);
const v48ReleaseCertificationService = new V48ReleaseCertificationService(database, pilotValueScorecardService, pilotProofProgramService, executivePilotReviewService, pilotDecisionLedgerService, expansionReadinessService);
const rolloutActivationControlService = new RolloutActivationControlService(database, auditService, realtimeHub, expansionReadinessService, multiLocationPerformanceService);
const technicalActivationReadinessService = new TechnicalActivationReadinessService(database, auditService, realtimeHub, rolloutActivationControlService);
const locationDeploymentPackageService = new LocationDeploymentPackageService(database, auditService, realtimeHub, technicalActivationReadinessService);
const goLiveCommandService = new GoLiveCommandService(database, auditService, realtimeHub, locationDeploymentPackageService, technicalActivationReadinessService);
const launchStabilizationService = new LaunchStabilizationService(database, auditService, realtimeHub, goLiveCommandService, multiLocationPerformanceService);
const v49ReleaseCertificationService = new V49ReleaseCertificationService(database, rolloutActivationControlService, technicalActivationReadinessService, locationDeploymentPackageService, goLiveCommandService, launchStabilizationService);
const productionOperationsHandoffService = new ProductionOperationsHandoffService(database, auditService, realtimeHub, launchStabilizationService, reliabilityAutomationService, multiLocationPerformanceService);
const productionHealthSupportService = new ProductionHealthSupportService(database, auditService, realtimeHub, productionOperationsHandoffService, reliabilityAutomationService, telemetryService, multiLocationPerformanceService);
const productionIncidentCommandService = new ProductionIncidentCommandService(database, auditService, realtimeHub, productionHealthSupportService, reliabilityAutomationService, telemetryService);
const productionRecoveryReviewService = new ProductionRecoveryReviewService(database, auditService, realtimeHub, productionIncidentCommandService, productionHealthSupportService, reliabilityAutomationService);
const productionCorrectiveActionGovernanceService = new ProductionCorrectiveActionGovernanceService(database, auditService, realtimeHub, productionRecoveryReviewService, productionIncidentCommandService);
const v50ReleaseCertificationService = new V50ReleaseCertificationService(database, productionOperationsHandoffService, productionHealthSupportService, productionIncidentCommandService, productionRecoveryReviewService, productionCorrectiveActionGovernanceService);
const pilotOperationalReadinessService = new PilotOperationalReadinessService(database, v49ReleaseCertificationService, v50ReleaseCertificationService, technicalActivationReadinessService, pilotProofProgramService);
const restaurantDayLifecycleService = new RestaurantDayLifecycleService(database, auditService, realtimeHub, pilotOperationalReadinessService);
const peakServiceStressTestService = new PeakServiceStressTestService(database, auditService, realtimeHub, restaurantDayLifecycleService, pilotOperationalReadinessService);
const dataIntegrityRecoveryService = new DataIntegrityRecoveryService(database, auditService, realtimeHub, idempotencyService, syncReconciliationService, peakServiceStressTestService);
const rolePermissionCertificationService = new RolePermissionCertificationService(database, auditService, realtimeHub, authService, dataIntegrityRecoveryService);
const operatorUxHardeningService = new OperatorUxHardeningService(database, auditService, realtimeHub, rolePermissionCertificationService);
const reservationGuestJourneyCertificationService = new ReservationGuestJourneyCertificationService(database, auditService, realtimeHub, guestIntelligenceService, operatorUxHardeningService);
const routeApi = createRouter({ database, auditService, idempotencyService, syncReconciliationService, telemetryService, reliabilityAutomationService, reservationService, realtimeHub, authService, floorService, reservationOperationsService, staffOperationsService, kitchenOperationsService, serviceCoordinationService, aiRestaurantBrainService, executiveCommandCenterService, autonomousOperationsService, guestIntelligenceService, workforceIntelligenceService, inventoryIntelligenceService, timeClockService, workforceFoundationService, schedulingService, employeePortalService, commandCenterService, operationsFeedService, liveIntegrationService, repositoryImpactService, repositoryRetirementRehearsalService, retirementAssuranceService, retirementCandidateImpactService, v46ReleaseCertificationService, hospitalityPerformanceService, hospitalityActionWorkspaceService, serviceProfitabilityIntelligenceService, predictiveShiftControlService, managerOperatingRhythmService, multiLocationPerformanceService, pilotValueScorecardService, pilotProofProgramService, executivePilotReviewService, pilotDecisionLedgerService, expansionReadinessService, v48ReleaseCertificationService, rolloutActivationControlService, technicalActivationReadinessService, locationDeploymentPackageService, goLiveCommandService, launchStabilizationService, v49ReleaseCertificationService, productionOperationsHandoffService, productionHealthSupportService, productionIncidentCommandService, productionRecoveryReviewService, productionCorrectiveActionGovernanceService, v50ReleaseCertificationService, pilotOperationalReadinessService, restaurantDayLifecycleService, peakServiceStressTestService, dataIntegrityRecoveryService, rolePermissionCertificationService, operatorUxHardeningService, reservationGuestJourneyCertificationService });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function safeFilePath(requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const resolved = path.resolve(CLIENT_ROOT, relative);
  return resolved.startsWith(CLIENT_ROOT) ? resolved : null;
}

const server = http.createServer(async (request, response) => {
  const telemetryContext = telemetryService.begin(request);
  const originalWriteHead = response.writeHead.bind(response);
  response.writeHead = function instrumentedWriteHead(statusCode, ...args) {
    if (!response._telemetryCompleted) {
      response._telemetryCompleted = true;
      telemetryService.complete(telemetryContext, statusCode, {
        replayed: response._idempotencyReplayed,
        error: statusCode >= 500 ? "Server response error" : null
      });
    }
    return originalWriteHead(statusCode, ...args);
  };
  try {
    if (request.url === "/api/events" && request.method === "GET") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
      });
      const remove = realtimeHub.add(response);
      request.on("close", remove);
      return;
    }

    if (request.url.startsWith("/api/")) {
      const handled = await routeApi(request, response);
      if (handled !== false) return;
      response.writeHead(404, { "Content-Type": "application/json" });
      return response.end(JSON.stringify({ error: "API route not found" }));
    }

    const filePath = safeFilePath(request.url);
    if (!filePath) {
      response.writeHead(403);
      return response.end("Forbidden");
    }

    fs.stat(filePath, (error, stat) => {
      const target = !error && stat.isFile() ? filePath : path.join(CLIENT_ROOT, "index.html");
      fs.readFile(target, (readError, content) => {
        if (readError) {
          response.writeHead(500);
          return response.end("Unable to load application");
        }
        response.writeHead(200, {
          "Content-Type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream",
          "Cache-Control": (
            target.endsWith(".html") ||
            target.endsWith(".js") ||
            target.endsWith(".css")
          ) ? "no-store, max-age=0" : "public, max-age=3600"
        });
        response.end(content);
      });
    });
  } catch (error) {
    console.error(`[server] ${request.method} ${request.url} failed:`, error && (error.stack || error));
    if (!response.headersSent) {
      response.writeHead(500, { "Content-Type": "application/json" });
    }
    response.end(JSON.stringify({ error: error.message }));
  }
});

authService.initializePasswords().then(() => server.listen(PORT, () => {
  console.log(`Blue Current Cloud V51.35.0 running at http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
})).catch(error => {
  console.error(error);
  process.exit(1);
});
