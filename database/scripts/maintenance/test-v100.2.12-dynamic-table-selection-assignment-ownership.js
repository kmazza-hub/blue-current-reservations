"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const jsRoot = path.join(root, "client", "js");
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (target.endsWith(".js")) files.push(target);
  }
})(jsRoot);
const source = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");

const checks = [
  ["dynamic selection guard installed", source.includes("__bcDynamicTableSelectionV100_2_12")],
  ["dynamic assignment click guard installed", source.includes("__bcDynamicAssignmentClickV100_2_12")],
  ["selected table is authoritative", source.includes("__bcHostSelectedTableV100_2_12")],
  ["assignment state object installed", source.includes("__bcHostAssignmentV100_2_12")],
  ["no featured-table hardwire", !source.includes('const table = $("#hostFeaturedTable")')],
  ["CTA uses selected table dynamically", source.includes("`Assign ${shortName} to Table ${number}`")],
  ["seat CTA uses assignment table dynamically", source.includes("`Seat ${shortName} at Table ${number}`")],
  ["reassignment before seating supported", source.includes("`Move ${shortName} to Table ${number}`")],
  ["conflicting tables blocked", source.includes('state === "available" || state === "cleaning"') && source.includes("unavailable")],
  ["initial detail hidden", source.includes("setDetailVisibility(false)") && source.includes("__bcHostSelectedTableV100_2_12 = null")],
  ["arrival receives final table", source.includes("arrival.dataset.bcTable = number")],
  ["arrival chip shows final table", source.includes("`Seated · Table ${number}`")],
  ["floor table receives guest identity", source.includes("table.dataset.bcGuestName = guestName")],
  ["floor table receives seated state", source.includes('table.dataset.bcGuestStatus = "seated"')],
  ["detail still auto-collapses after seating", source.includes("seatAssignedGuest") && source.includes("setDetailVisibility(false)")]
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({
  ok: failed.length === 0,
  repair: "V100.2.12 Dynamic Table Selection & Assignment Ownership",
  baselineVersion: "100.0.0",
  checks: checks.map(([name, ok]) => ({ name, ok })),
  failed
}, null, 2));
if (failed.length) process.exit(1);
