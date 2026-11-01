"use strict";

// Presentation labels only. Stable tenant/user/location IDs remain unchanged.
const labels = [
  [/Chefs International/gi, "Demo Hospitality Group"],
  [/(?:The )?Wharfside|Harbor Point|Lobster Shanty|Marina Grille/gi, "Demo Restaurant"],
  [/Rod['’]s Tavern|Anchor Tavern/gi, "Demo Tavern"],
  [/Captain['’]s Inn/gi, "Demo Inn"],
  [/The Cabin/gi, "Demo Lodge"],
  [/Frank Koch/gi, "Demo Manager"],
  [/\bFrank\b/g, "Demo Manager"]
];
function neutralLabel(value) {
  return typeof value === "string" ? labels.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value) : value;
}
function updateDemoLabels(db) {
  const orgs = new Set(["org_chefs", ...(db.organizations || []).filter(o => o.dedicatedForHarborPoint === true).map(o => o.id)]);
  const fields = new Set(["name", "organizationName", "locationName", "guestName", "source", "managerName", "venueName"]);
  let changed = 0;
  const visit = row => {
    if (!row || typeof row !== "object") return;
    for (const key of fields) {
      if (typeof row[key] !== "string") continue;
      const next = neutralLabel(row[key]);
      if (next !== row[key]) { row[key] = next; changed++; }
    }
  };
  for (const [collection, rows] of Object.entries(db)) {
    // Audit evidence, auth security state and sessions retain their original authority.
    if (!Array.isArray(rows) || /audit|session|security|ledger|evidence/i.test(collection)) continue;
    for (const row of rows) {
      if ((collection === "organizations" && orgs.has(row.id)) || orgs.has(row.organizationId)) visit(row);
    }
  }
  for (const [org, config] of Object.entries(db.harborPointLiveConfigs || {})) if (orgs.has(org)) visit(config);
  const manager = (db.users || []).find(u => u.id === "usr_sarah" && u.organizationId === "org_chefs" && u.email === "sarah@bluecurrent.demo");
  if (manager && ["Sarah Mitchell", "Sarah", "Frank Koch"].includes(manager.name)) { manager.name = "Demo Manager"; changed++; }
  return changed;
}
async function migrateDemoLabels(database) {
  const snapshot = await database.read();
  if (!updateDemoLabels(snapshot)) return 0;
  return database.mutate(updateDemoLabels);
}
const displayFields = new Set(["name", "label", "guestName", "title", "text", "detail", "message", "actor", "action", "organization", "locationName", "organizationName", "manager", "venueName"]);
function demoJsonReplacer(key, value) {
  return displayFields.has(key) ? neutralLabel(value) : value;
}
module.exports = { neutralLabel, updateDemoLabels, migrateDemoLabels, demoJsonReplacer };
