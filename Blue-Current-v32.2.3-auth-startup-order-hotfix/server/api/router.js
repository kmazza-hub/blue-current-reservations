
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

function createRouter({ database, auditService, reservationService, realtimeHub, authService, floorService, reservationOperationsService, staffOperationsService, kitchenOperationsService, serviceCoordinationService, aiRestaurantBrainService, executiveCommandCenterService, autonomousOperationsService, guestIntelligenceService, workforceIntelligenceService, inventoryIntelligenceService, timeClockService }) {
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
        version: "32.3.0",
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
