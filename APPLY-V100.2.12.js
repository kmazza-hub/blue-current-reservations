"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const clientJs = path.join(root, "client", "js");
const fragmentPath = path.join(root, "patches", "host-stand-dynamic-table-assignment.jsfrag");

if (!fs.existsSync(clientJs)) {
  console.error("V100.2.12 apply failed: client/js not found. Run from the Blue Current repository root.");
  process.exit(1);
}
if (!fs.existsSync(fragmentPath)) {
  console.error("V100.2.12 apply failed: patch fragment not found.");
  process.exit(1);
}

const replacement = fs.readFileSync(fragmentPath, "utf8").trim();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target, out);
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(target);
  }
  return out;
}

const files = walk(clientJs);
const candidates = files.filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return text.includes("__bcSeatedTableDetailReopenV100_2_11") &&
    text.includes('button.dataset.bcAssignmentState = "assigned"') &&
    text.includes("setDetailVisibility(false)");
});

if (!candidates.length) {
  console.error("V100.2.12 apply failed: V100.2.11 lifecycle block not found. Apply V100.2.11 first. No files changed.");
  process.exit(1);
}

const blockPattern = /\$\("#assignTableButton"\)\?\.addEventListener\("click", \(\) => \{[\s\S]*?\n\}\);\n\n\/\/ V100\.2\.11:[\s\S]*?\n\}\n?/g;
let changed = 0;

for (const file of candidates) {
  const original = fs.readFileSync(file, "utf8");
  if (original.includes("__bcDynamicTableSelectionV100_2_12")) {
    console.log(`Already patched: ${path.relative(root, file)}`);
    continue;
  }

  let replacements = 0;
  const updated = original.replace(blockPattern, () => {
    replacements += 1;
    return `${replacement}\n`;
  });

  if (replacements !== 1) {
    console.error(`V100.2.12 apply refused ${path.relative(root, file)}: expected exactly 1 V100.2.11 lifecycle block, found ${replacements}.`);
    process.exit(1);
  }

  fs.writeFileSync(`${file}.v100.2.12.bak`, original);
  fs.writeFileSync(file, updated);
  changed += 1;
  console.log(`Patched: ${path.relative(root, file)}`);
}

console.log(JSON.stringify({
  ok: true,
  version: "100.2.12",
  repair: "Dynamic Table Selection & Assignment Ownership",
  changedJsFiles: changed,
  matchedJsFiles: candidates.length,
  behavior: [
    "table detail hidden until explicit table selection",
    "selected table becomes authoritative assignment target",
    "assignment CTA uses selected table number dynamically",
    "assigned guest can be moved before seating",
    "reserved/seated tables are blocked as conflicting targets",
    "arrival/floor/count state shares the final seated table number",
    "seated table detail still auto-collapses"
  ]
}, null, 2));
