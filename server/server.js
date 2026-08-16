
"use strict";

const http = require("http");
const APP_VERSION = require("../package.json").version;
const fs = require("fs");
const path = require("path");
const { createPersistence } = require("./persistence/persistenceFactory");
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
const LiveFloorServiceCertificationService = require("./services/liveFloorServiceCertificationService");
const ManagementExecutiveAccuracyService = require("./services/managementExecutiveAccuracyService");
const PilotDeploymentPackageService = require("./services/pilotDeploymentPackageService");
const PilotLaunchControlService = require("./services/pilotLaunchControlService");
const PilotExecutionObservationService = require("./services/pilotExecutionObservationService");
const PilotStabilizationExitService = require("./services/pilotStabilizationExitService");
const PilotCloseoutOutcomeService = require("./services/pilotCloseoutOutcomeService");
const ExpansionReplicationService = require("./services/expansionReplicationService");
const MultiLocationExpansionControlService = require("./services/multiLocationExpansionControlService");
const ExpansionCohortObservationService = require("./services/expansionCohortObservationService");
const ExpansionPortfolioProofService = require("./services/expansionPortfolioProofService");
const ExpansionRepeatabilityCertificationService = require("./services/expansionRepeatabilityCertificationService");
const OperationalIntegrationExpansionOrchestrationService = require("./services/operationalIntegrationExpansionOrchestrationService");
const V52OperationalReadinessCertificationService = require("./services/v52OperationalReadinessCertificationService");
const RestaurantWorkflowIntegrationService = require("./services/restaurantWorkflowIntegrationService");
const PeakServiceWorkflowResilienceService = require("./services/peakServiceWorkflowResilienceService");
const FailureRecoveryShiftContinuityService = require("./services/failureRecoveryShiftContinuityService");
const V53RestaurantOperationalCertificationService = require("./services/v53RestaurantOperationalCertificationService");
const OperatorSpeedWorkflowSimplificationService = require("./services/operatorSpeedWorkflowSimplificationService");
const ManagerInterventionDecisionSpeedService = require("./services/managerInterventionDecisionSpeedService");
const RoleBasedServiceErgonomicsService = require("./services/roleBasedServiceErgonomicsService");
const V54OperatorExperienceCertificationService = require("./services/v54OperatorExperienceCertificationService");
const RestaurantIntelligenceDecisionSupportService = require("./services/restaurantIntelligenceDecisionSupportService");
const ProfitabilityInterventionAccountabilityService = require("./services/profitabilityInterventionAccountabilityService");
const V55DecisionValueCertificationService = require("./services/v55DecisionValueCertificationService");
const ProductionPilotEnvironmentReadinessService = require("./services/productionPilotEnvironmentReadinessService");
const PilotReleaseCandidateCertificationService = require("./services/pilotReleaseCandidateCertificationService");
const PilotLiveServiceAcceptanceService = require("./services/pilotLiveServiceAcceptanceService");
const FinalProductReleaseCandidateService = require("./services/finalProductReleaseCandidateService");
const FinalHardeningRealEnvironmentService = require("./services/finalHardeningRealEnvironmentService");
const ProductionLaunchCertificationService = require("./services/productionLaunchCertificationService");
const ProductionMutationIntegrityService = require("./services/productionMutationIntegrityService");
const ProductionBoundaryService = require("./services/productionBoundaryService");
const ProductionConfigurationService = require("./services/productionConfigurationService");
const PersistenceMigrationReadinessService = require("./services/persistenceMigrationReadinessService");
const createRouter = require("./api/router");

const ROOT = path.resolve(__dirname, "..");
const CLIENT_ROOT = path.join(ROOT, "client");
const DB_PATH = process.env.BLUE_CURRENT_DB || path.join(ROOT, "database", "data", "blue-current.json");
const PORT = Number(process.env.PORT || 8787);

const database = createPersistence({
  driver: process.env.BLUE_CURRENT_PERSISTENCE_DRIVER || "json",
  databasePath: DB_PATH
});
const realtimeHub = new RealtimeHub();
const auditService = new AuditService(database);
const idempotencyService = new IdempotencyService(database);
const syncReconciliationService = new SyncReconciliationService(database, auditService, realtimeHub);
const productionMutationIntegrityService = new ProductionMutationIntegrityService(database);
const productionBoundaryService = new ProductionBoundaryService();
const productionConfigurationService = new ProductionConfigurationService({
  root: ROOT,
  databasePath: DB_PATH,
  port: PORT,
  persistenceDriver: database.driver,
  persistenceTopology: database.topology
});
const persistenceMigrationReadinessService = new PersistenceMigrationReadinessService(database);
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
const liveFloorServiceCertificationService = new LiveFloorServiceCertificationService(database, auditService, realtimeHub, reservationGuestJourneyCertificationService);
const managementExecutiveAccuracyService = new ManagementExecutiveAccuracyService(database, auditService, realtimeHub, executiveCommandCenterService, liveFloorServiceCertificationService);
const pilotDeploymentPackageService = new PilotDeploymentPackageService(database, auditService, realtimeHub, managementExecutiveAccuracyService);
const pilotLaunchControlService = new PilotLaunchControlService(database, auditService, realtimeHub, pilotDeploymentPackageService);
const pilotExecutionObservationService = new PilotExecutionObservationService(database, auditService, realtimeHub, pilotLaunchControlService);
const pilotStabilizationExitService = new PilotStabilizationExitService(database, auditService, realtimeHub, pilotExecutionObservationService, dataIntegrityRecoveryService, managementExecutiveAccuracyService);
const pilotCloseoutOutcomeService = new PilotCloseoutOutcomeService(database, auditService, realtimeHub, pilotStabilizationExitService);
const expansionReplicationService = new ExpansionReplicationService(database, auditService, realtimeHub, pilotCloseoutOutcomeService, pilotDeploymentPackageService);
const multiLocationExpansionControlService = new MultiLocationExpansionControlService(database, auditService, realtimeHub, expansionReplicationService);
const expansionCohortObservationService = new ExpansionCohortObservationService(database, auditService, realtimeHub, multiLocationExpansionControlService);
const expansionPortfolioProofService = new ExpansionPortfolioProofService(database, auditService, realtimeHub, expansionCohortObservationService, managementExecutiveAccuracyService, dataIntegrityRecoveryService);
const expansionRepeatabilityCertificationService = new ExpansionRepeatabilityCertificationService(database, auditService, realtimeHub, expansionPortfolioProofService);
const operationalIntegrationExpansionOrchestrationService = new OperationalIntegrationExpansionOrchestrationService(database, auditService, realtimeHub, expansionRepeatabilityCertificationService, multiLocationExpansionControlService, expansionCohortObservationService);
const v52OperationalReadinessCertificationService = new V52OperationalReadinessCertificationService(database, auditService, realtimeHub, operationalIntegrationExpansionOrchestrationService, expansionRepeatabilityCertificationService, expansionPortfolioProofService);
const restaurantWorkflowIntegrationService = new RestaurantWorkflowIntegrationService(database, auditService, realtimeHub, restaurantDayLifecycleService, reservationGuestJourneyCertificationService, liveFloorServiceCertificationService, operatorUxHardeningService);
const peakServiceWorkflowResilienceService = new PeakServiceWorkflowResilienceService(database, auditService, realtimeHub, restaurantWorkflowIntegrationService, peakServiceStressTestService);
const failureRecoveryShiftContinuityService = new FailureRecoveryShiftContinuityService(database, auditService, realtimeHub, peakServiceWorkflowResilienceService, dataIntegrityRecoveryService, reliabilityAutomationService);
const v53RestaurantOperationalCertificationService = new V53RestaurantOperationalCertificationService(database, auditService, realtimeHub, restaurantWorkflowIntegrationService, peakServiceWorkflowResilienceService, failureRecoveryShiftContinuityService);
const operatorSpeedWorkflowSimplificationService = new OperatorSpeedWorkflowSimplificationService(database, auditService, realtimeHub, operatorUxHardeningService, restaurantWorkflowIntegrationService, peakServiceWorkflowResilienceService);
const managerInterventionDecisionSpeedService = new ManagerInterventionDecisionSpeedService(database, auditService, realtimeHub, operatorSpeedWorkflowSimplificationService);
const roleBasedServiceErgonomicsService = new RoleBasedServiceErgonomicsService(database, auditService, realtimeHub, managerInterventionDecisionSpeedService);
const v54OperatorExperienceCertificationService = new V54OperatorExperienceCertificationService(database, auditService, realtimeHub, operatorSpeedWorkflowSimplificationService, managerInterventionDecisionSpeedService, roleBasedServiceErgonomicsService);
const restaurantIntelligenceDecisionSupportService = new RestaurantIntelligenceDecisionSupportService(database, auditService, realtimeHub, v54OperatorExperienceCertificationService, serviceProfitabilityIntelligenceService, hospitalityPerformanceService, workforceIntelligenceService);
const profitabilityInterventionAccountabilityService = new ProfitabilityInterventionAccountabilityService(database, auditService, realtimeHub, restaurantIntelligenceDecisionSupportService);
const v55DecisionValueCertificationService = new V55DecisionValueCertificationService(database, auditService, realtimeHub, restaurantIntelligenceDecisionSupportService, profitabilityInterventionAccountabilityService);
const productionPilotEnvironmentReadinessService = new ProductionPilotEnvironmentReadinessService(database, auditService, realtimeHub, v55DecisionValueCertificationService, technicalActivationReadinessService, pilotDeploymentPackageService, productionHealthSupportService, productionRecoveryReviewService);
const pilotReleaseCandidateCertificationService = new PilotReleaseCandidateCertificationService(database, auditService, realtimeHub, productionPilotEnvironmentReadinessService, pilotLaunchControlService, technicalActivationReadinessService, pilotDeploymentPackageService);
const pilotLiveServiceAcceptanceService = new PilotLiveServiceAcceptanceService(database, auditService, realtimeHub, pilotReleaseCandidateCertificationService, pilotExecutionObservationService, pilotValueScorecardService);
const finalProductReleaseCandidateService = new FinalProductReleaseCandidateService(database, auditService, realtimeHub, pilotLiveServiceAcceptanceService, pilotCloseoutOutcomeService, pilotReleaseCandidateCertificationService);
const finalHardeningRealEnvironmentService = new FinalHardeningRealEnvironmentService(database, auditService, realtimeHub, finalProductReleaseCandidateService);
const productionLaunchCertificationService = new ProductionLaunchCertificationService(database, auditService, realtimeHub, finalHardeningRealEnvironmentService, productionOperationsHandoffService, pilotLaunchControlService);
const routeApi = createRouter({ database, auditService, idempotencyService, syncReconciliationService, telemetryService, reliabilityAutomationService, reservationService, realtimeHub, authService, floorService, reservationOperationsService, staffOperationsService, kitchenOperationsService, serviceCoordinationService, aiRestaurantBrainService, executiveCommandCenterService, autonomousOperationsService, guestIntelligenceService, workforceIntelligenceService, inventoryIntelligenceService, timeClockService, workforceFoundationService, schedulingService, employeePortalService, commandCenterService, operationsFeedService, liveIntegrationService, repositoryImpactService, repositoryRetirementRehearsalService, retirementAssuranceService, retirementCandidateImpactService, v46ReleaseCertificationService, hospitalityPerformanceService, hospitalityActionWorkspaceService, serviceProfitabilityIntelligenceService, predictiveShiftControlService, managerOperatingRhythmService, multiLocationPerformanceService, pilotValueScorecardService, pilotProofProgramService, executivePilotReviewService, pilotDecisionLedgerService, expansionReadinessService, v48ReleaseCertificationService, rolloutActivationControlService, technicalActivationReadinessService, locationDeploymentPackageService, goLiveCommandService, launchStabilizationService, v49ReleaseCertificationService, productionOperationsHandoffService, productionHealthSupportService, productionIncidentCommandService, productionRecoveryReviewService, productionCorrectiveActionGovernanceService, v50ReleaseCertificationService, pilotOperationalReadinessService, restaurantDayLifecycleService, peakServiceStressTestService, dataIntegrityRecoveryService, rolePermissionCertificationService, operatorUxHardeningService, reservationGuestJourneyCertificationService, liveFloorServiceCertificationService, managementExecutiveAccuracyService, pilotDeploymentPackageService, pilotLaunchControlService, pilotExecutionObservationService, pilotStabilizationExitService, pilotCloseoutOutcomeService, expansionReplicationService, multiLocationExpansionControlService, expansionCohortObservationService, expansionPortfolioProofService, expansionRepeatabilityCertificationService, operationalIntegrationExpansionOrchestrationService, v52OperationalReadinessCertificationService, restaurantWorkflowIntegrationService, peakServiceWorkflowResilienceService, failureRecoveryShiftContinuityService, v53RestaurantOperationalCertificationService, operatorSpeedWorkflowSimplificationService, managerInterventionDecisionSpeedService, roleBasedServiceErgonomicsService, v54OperatorExperienceCertificationService, restaurantIntelligenceDecisionSupportService, profitabilityInterventionAccountabilityService, v55DecisionValueCertificationService, productionPilotEnvironmentReadinessService, pilotReleaseCandidateCertificationService, pilotLiveServiceAcceptanceService, finalProductReleaseCandidateService, finalHardeningRealEnvironmentService, productionLaunchCertificationService, productionMutationIntegrityService, productionBoundaryService, productionConfigurationService, persistenceMigrationReadinessService });

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

  const requestPath = String(request.url || "").split("?")[0];
  const isApi = requestPath.startsWith("/api/");
  response._securityHeaders = productionBoundaryService.securityHeaders({ api: isApi });

  if (isApi) {
    request._maxBodyBytes = productionBoundaryService.maxBodyBytes;

    const origin = productionBoundaryService.corsOrigin(request);
    if (origin === false) {
      response._securityHeaders["Content-Type"] = "application/json; charset=utf-8";
      response.writeHead(403, response._securityHeaders);
      return response.end(JSON.stringify({ error: "Origin is not allowed.", code: "ORIGIN_NOT_ALLOWED" }));
    }
    response._corsOrigin = origin || null;

    const validation = productionBoundaryService.validateRequest(request, requestPath);
    if (!validation.ok) {
      response._securityHeaders["Content-Type"] = "application/json; charset=utf-8";
      response.writeHead(validation.status, response._securityHeaders);
      return response.end(JSON.stringify({ error: validation.error, code: validation.code }));
    }

    const rateLimit = productionBoundaryService.consume(request, requestPath);
    response._rateLimit = rateLimit;
    if (!rateLimit.allowed) {
      response.writeHead(429, {
        ...response._securityHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(rateLimit.retryAfterSeconds),
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000))
      });
      return response.end(JSON.stringify({
        error: "Too many requests. Retry after the rate-limit window.",
        code: "RATE_LIMITED"
      }));
    }
  }
  const originalWriteHead = response.writeHead.bind(response);
  response.writeHead = function instrumentedWriteHead(statusCode, ...args) {
    if (response._securityHeaders) {
      for (const [name, value] of Object.entries(response._securityHeaders)) {
        if (!response.hasHeader(name)) response.setHeader(name, value);
      }
    }
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
      const status = Number(error.statusCode || (error instanceof SyntaxError ? 400 : 500));
      response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      return response.end(JSON.stringify({
        error: status === 500 ? "Internal server error." : error.message,
        code: error.code || (error instanceof SyntaxError ? "INVALID_JSON" : "INTERNAL_ERROR")
      }));
    }
    response.end();
  }
});

async function bootstrap() {
  // Force the first database read before the HTTP listener starts. A corrupt or
  // missing primary will recover from the newest verified backup here or fail closed.
  await database.read();

  const backupCheckpoint = await database.checkpointBackup("startup-verified-primary")
    .catch(error => ({ ok: false, error: error.message }));
  const mutationRecovery = await productionMutationIntegrityService.recoverStalePrepared({ force: true });

  await authService.initializePasswords();
  const sessionCleanup = await authService.cleanupSessions();

  const backupVerification = await database.verifyBackups();
  const deploymentReadiness = await productionConfigurationService.assertReady(database);

  if (!backupVerification.ok) {
    if (productionConfigurationService.mode === "production") {
      const error = new Error("Production startup requires at least one verified recovery backup.");
      error.code = "VERIFIED_BACKUP_REQUIRED";
      throw error;
    }
    console.warn("[startup] No verified recovery backup is currently available.");
  }

  if (
    productionConfigurationService.mode === "production" &&
    mutationRecovery.reconcileRequired > 0
  ) {
    const error = new Error(
      `Production startup blocked: ${mutationRecovery.reconcileRequired} mutation(s) require reconciliation.`
    );
    error.code = "MUTATION_RECONCILIATION_REQUIRED";
    throw error;
  }

  if (mutationRecovery.recovered > 0) {
    console.warn(
      `[startup] Reconciled ${mutationRecovery.recovered} unfinished mutation(s): ` +
      `${mutationRecovery.committedRecovered} committed, ` +
      `${mutationRecovery.failedRecovered} failed, ` +
      `${mutationRecovery.reconcileRequired} require reconciliation.`
    );
  }
  if (!backupCheckpoint.ok) {
    console.warn(`[startup] Backup checkpoint warning: ${backupCheckpoint.error || backupCheckpoint.reason || "unknown"}`);
  }

  server.listen(PORT, () => {
    console.log(`Blue Current Cloud V${APP_VERSION} running at http://localhost:${PORT}`);
    console.log(`Database: ${DB_PATH}`);
    console.log(`Persistence: ${database.driver} (${database.topology})`);
    console.log(`Verified recovery backup: ${backupVerification.ok ? "available" : "unavailable"}`);
    console.log(`Session cleanup: ${sessionCleanup.removed} removed, ${sessionCleanup.after} retained`);
    console.log(
      `Deployment readiness: ${deploymentReadiness.ready ? "ready" : "not-ready"} ` +
      `(${deploymentReadiness.mode}, ${deploymentReadiness.errors} errors, ${deploymentReadiness.warnings} warnings)`
    );
  });
}

let shutdownStarted = false;

async function gracefulShutdown(signal) {
  if (shutdownStarted) return;
  shutdownStarted = true;

  console.log(`[shutdown] ${signal} received; draining Blue Current.`);

  const closeServer = new Promise(resolve => {
    if (!server.listening) return resolve();
    const timer = setTimeout(() => resolve(), 10_000);
    timer.unref?.();
    server.close(() => {
      clearTimeout(timer);
      resolve();
    });
  });

  await closeServer;

  const idle = await database.awaitIdle();
  if (!idle.ok) {
    console.error(`[shutdown] Database queue did not drain cleanly: ${idle.message || idle.error}`);
    process.exitCode = 1;
  }

  const backup = await database.checkpointBackup("graceful-shutdown").catch(error => ({
    ok: false,
    error: error.message
  }));
  if (!backup.ok) {
    console.error(`[shutdown] Final recovery checkpoint failed: ${backup.error || backup.reason || "unknown"}`);
    process.exitCode = 1;
  }

  console.log("[shutdown] Blue Current shutdown complete.");
}

process.once("SIGINT", () => {
  gracefulShutdown("SIGINT").finally(() => process.exit(process.exitCode || 0));
});
process.once("SIGTERM", () => {
  gracefulShutdown("SIGTERM").finally(() => process.exit(process.exitCode || 0));
});

bootstrap().catch(error => {
  console.error("[startup] Blue Current failed recovery/readiness bootstrap:", error);
  process.exit(1);
});
