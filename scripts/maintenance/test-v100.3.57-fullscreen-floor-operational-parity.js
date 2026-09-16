"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const clarity = read("client/js/fullscreen-floor-clarity-v100.3.10.js");
const focus = read("client/js/focused-operator-workspaces-v100.3.9.js");
const floor = read("client/js/app-v15.1.3.js");
const service = read("client/js/service-table-lifecycle-v100.2.57.js");
const css = read("client/styles.css");
const html = read("client/index.html");
const checks = [];

function check(label, condition) {
  assert.ok(condition, label);
  checks.push(label);
  console.log(`PASS: ${label}`);
}

check("Full-screen Floor portals the authoritative panel instead of cloning it", focus.includes("stage.append(fh,panel)") && focus.includes("floorPlaceholder"));
check("Full-screen table taps are no longer replaced by a read-only status dialog", !clarity.includes("openStatusDialog") && !clarity.includes("stopImmediatePropagation"));
check("The seated and cleaning lifecycle card remains visible in full screen", clarity.includes('"bcTableLifecycleCardV100_2_22"') && css.includes("#bcFloorFocusStage #hostFloorMap>#bcTableLifecycleCardV100_2_22"));
check("Neutral and seating confirmation controls remain visible in full screen", clarity.includes('"hostTableDetail"') && clarity.includes('"bcUnifiedSeatConfirmV100_2_18"'));
check("Full-screen lifecycle actions retain large iPad touch targets", css.includes("#bcTableLifecycleCardV100_2_22 button") && css.includes("min-height:58px!important"));
check("Existing seating still enforces table capacity and availability", floor.includes("eligibleFor(table,partySize)") && floor.includes("capacityOf(table) >= partySize"));
check("Existing table lifecycle still requires staff-confirmed cleaning and reset", floor.includes("primary.textContent = 'Party left'") && floor.includes("primary.textContent = 'Mark table open'"));
check("Service completion still sends the linked table to cleaning", service.includes('table.classList.add("cleaning")') && service.includes('bc:host-table-cleaning'));
check("Completing a seating flow keeps the operator on the functional full-screen floor", focus.includes('panel.dataset.bcFocusReason="operating"') && focus.includes('reason:"seating-complete"') && !focus.includes('"bc:host-guest-seated",()=>setTimeout(()=>exitFloor'));
check("V100.3.57 floor assets are cache-advanced", /styles\.css\?v=100\.3\.(?:57|74|75|76|77|78|79)/.test(html) && html.includes('fullscreen-floor-clarity-v100.3.10.js?v=100.3.57') && /focused-operator-workspaces-v100\.3\.9\.js\?v=100\.3\.(?:57|77|78|79)/.test(html));

console.log(`V100.3.57 full-screen floor operational parity ${checks.length}/${checks.length}`);
