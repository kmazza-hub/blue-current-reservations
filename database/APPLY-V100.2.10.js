"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const clientJs = path.join(root, "client", "js");
const fragmentPath = path.join(root, "patches", "host-stand-table-lifecycle-handler.jsfrag");
if (!fs.existsSync(clientJs)) {
  console.error("V100.2.10 apply failed: client/js not found. Run this from the Blue Current repository root.");
  process.exit(1);
}
if (!fs.existsSync(fragmentPath)) {
  console.error("V100.2.10 apply failed: patches/host-stand-table-lifecycle-handler.jsfrag not found.");
  process.exit(1);
}
const replacement = fs.readFileSync(fragmentPath, "utf8").trim();
const legacyPattern = /\$\("#assignTableButton"\)\?\.addEventListener\("click", \(\) => \{[\s\S]*?\n\}\);/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target, out);
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(target);
  }
  return out;
}

const candidates = walk(clientJs).filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return text.includes('$("#assignTableButton")?.addEventListener("click"') &&
    (text.includes('Assigned to Anthony') || text.includes('bcAssignmentState'));
});

if (!candidates.length) {
  console.error("V100.2.10 apply failed: table assignment handler was not found. No files changed.");
  process.exit(1);
}

let changed = 0;
for (const file of candidates) {
  const original = fs.readFileSync(file, "utf8");
  if (original.includes('button.dataset.bcAssignmentState = "assigned"') && original.includes('Seated · Table')) {
    console.log(`Already patched: ${path.relative(root, file)}`);
    continue;
  }
  let replacements = 0;
  const updated = original.replace(legacyPattern, (match) => {
    if (!match.includes("assignTableButton")) return match;
    replacements += 1;
    return replacement;
  });
  if (replacements !== 1) {
    console.error(`V100.2.10 apply refused ${path.relative(root, file)}: expected 1 handler, found ${replacements}.`);
    process.exit(1);
  }
  fs.writeFileSync(`${file}.v100.2.10.bak`, original);
  fs.writeFileSync(file, updated);
  changed += 1;
  console.log(`Patched: ${path.relative(root, file)}`);
}

console.log(JSON.stringify({
  ok: true,
  version: "100.2.10",
  repair: "Table Assignment & Seating Lifecycle",
  changedFiles: changed,
  matchedFiles: candidates.length,
  backupsCreated: changed
}, null, 2));
