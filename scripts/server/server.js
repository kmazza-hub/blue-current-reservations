
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const DatabaseService = require("./services/databaseService");
const AuditService = require("./services/auditService");
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
const createRouter = require("./api/router");

const ROOT = path.resolve(__dirname, "..");
const CLIENT_ROOT = path.join(ROOT, "client");
const DB_PATH = process.env.BLUE_CURRENT_DB || path.join(ROOT, "database", "data", "blue-current.json");
const PORT = Number(process.env.PORT || 8787);

const database = new DatabaseService(DB_PATH);
const realtimeHub = new RealtimeHub();
const auditService = new AuditService(database);
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
const routeApi = createRouter({ database, auditService, reservationService, realtimeHub, authService, floorService, reservationOperationsService, staffOperationsService, kitchenOperationsService, serviceCoordinationService, aiRestaurantBrainService, executiveCommandCenterService, autonomousOperationsService, guestIntelligenceService, workforceIntelligenceService, inventoryIntelligenceService, timeClockService });

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
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: error.message }));
  }
});

authService.initializePasswords().then(() => server.listen(PORT, () => {
  console.log(`Blue Current Cloud V32.2.2 running at http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
})).catch(error => {
  console.error(error);
  process.exit(1);
});
