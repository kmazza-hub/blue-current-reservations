"use strict";

const WorkforceIntelligenceService = require("../../server/services/workforceIntelligenceService");
const InventoryIntelligenceService = require("../../server/services/inventoryIntelligenceService");

let passed = 0;
let total = 0;
function check(name, condition) {
  total += 1;
  if (condition) {
    passed += 1;
    console.log(`PASS ${total}: ${name}`);
  } else {
    console.error(`FAIL ${total}: ${name}`);
    process.exitCode = 1;
  }
}

function databaseFor(data) {
  return {
    read: async () => data,
    get: async (collection, id) => (data[collection] || []).find(item => item.id === id) || null,
    mutate: async callback => callback(data),
    insert: async (collection, item) => {
      data[collection] ||= [];
      data[collection].push(item);
      return item;
    }
  };
}

const auditService = { record: async () => true };
const realtimeHub = { publish: () => true };

async function rejectsLocation(work) {
  try {
    await work();
    return false;
  } catch (error) {
    return error.statusCode === 404 && error.message === "Location is not available to this organization.";
  }
}

(async () => {
  const workforceData = {
    locations: [{ id: "loc_one", organizationId: "org_one" }],
    staff: [
      { id: "staff_real", organizationId: "org_one", locationId: "loc_one", name: "Real Operator", role: "Server", status: "active", sectionId: "section_one" },
      { id: "staff_cross_tenant", organizationId: "org_two", locationId: "loc_one", name: "Other Tenant", role: "Server", status: "active" }
    ],
    sections: [
      { id: "section_one", organizationId: "org_one", locationId: "loc_one", name: "Main Dining" },
      { id: "section_cross_tenant", organizationId: "org_two", locationId: "loc_one", name: "Private Data" }
    ],
    reservations: [{ id: "reservation_cross_tenant", organizationId: "org_two", locationId: "loc_one", status: "confirmed" }],
    waitlist: [{ id: "wait_cross_tenant", organizationId: "org_two", locationId: "loc_one", status: "waiting" }],
    kitchenTickets: [{ id: "ticket_cross_tenant", organizationId: "org_two", locationId: "loc_one", status: "open" }],
    laborPlans: [],
    laborActions: [
      { id: "action_real", organizationId: "org_one", locationId: "loc_one" },
      { id: "action_cross_tenant", organizationId: "org_two", locationId: "loc_one" }
    ],
    shiftOffers: [
      { id: "offer_real", organizationId: "org_one", locationId: "loc_one", status: "open" },
      { id: "offer_cross_tenant", organizationId: "org_two", locationId: "loc_one", status: "open" }
    ]
  };
  const workforce = new WorkforceIntelligenceService(databaseFor(workforceData), auditService, realtimeHub, null);
  const snapshot = await workforce.snapshot("org_one", "loc_one");

  check("Workforce uses only real staff records", snapshot.scheduled.length === 1 && snapshot.scheduled[0].id === "staff_real");
  check("Synthetic twelve-person staffing is removed", !snapshot.scheduled.some(item => String(item.id).startsWith("wf_")));
  check("Unrecorded skill and reliability stay visibly unknown", snapshot.scheduled[0].skillScore === "—" && snapshot.scheduled[0].reliability === "—");
  check("Cross-tenant demand cannot affect workforce demand", snapshot.summary.demandIndex === 0);
  check("Cross-tenant labor actions are excluded", snapshot.actions.length === 1 && snapshot.actions[0].id === "action_real");
  check("Cross-tenant shift offers are excluded", snapshot.shiftOffers.length === 1 && snapshot.shiftOffers[0].id === "offer_real");
  check("Workforce snapshot rejects a foreign organization", await rejectsLocation(() => workforce.snapshot("org_two", "loc_one")));
  check("Workforce decisions reject a foreign organization", await rejectsLocation(() => workforce.act("wf_hold_plan", { locationId: "loc_one" }, "Operator", "org_two")));
  check("Labor-plan updates reject a foreign organization", await rejectsLocation(() => workforce.updatePlan("loc_one", {}, "Operator", "org_two")));

  const inventoryData = {
    locations: [{ id: "loc_one", organizationId: "org_one" }],
    inventoryItems: [{ id: "item_one", organizationId: "org_one", locationId: "loc_one", name: "Salmon", onHand: 10, dailyUsage: 2, par: 12, unitCost: 5 }],
    vendors: [],
    recipes: [],
    kitchenTickets: [{ id: "ticket_cross_tenant", organizationId: "org_two", locationId: "loc_one", status: "open", items: [{ name: "Salmon", qty: 99 }] }],
    wasteEvents: [],
    inventoryPolicies: [],
    inventoryActions: []
  };
  const inventory = new InventoryIntelligenceService(databaseFor(inventoryData), auditService, realtimeHub);
  const inventorySnapshot = await inventory.snapshot("org_one", "loc_one");
  check("Cross-tenant kitchen tickets cannot alter inventory demand", inventorySnapshot.items[0].demandSignal === 0);
  check("Inventory snapshot rejects a foreign organization", await rejectsLocation(() => inventory.snapshot("org_two", "loc_one")));
  check("Purchase orders no longer default to Marina", await rejectsLocation(() => inventory.createPurchaseOrder({}, "Operator", "org_one")));

  const fs = require("fs");
  const path = require("path");
  check("No database payload is included", !fs.existsSync(path.resolve(__dirname, "../../database/data/V100.3.35.json")));

  console.log(`V100.3.35 validation ${passed}/${total}`);
  if (passed !== total) process.exitCode = 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
