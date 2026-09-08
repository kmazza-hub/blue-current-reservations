"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const clientJs = path.join(root, "client", "js");
const stylesPath = path.join(root, "client", "styles.css");
const fragmentPath = path.join(root, "patches", "host-stand-seated-detail-lifecycle.jsfrag");

if (!fs.existsSync(clientJs)) {
  console.error("V100.2.11 apply failed: client/js not found. Run from the Blue Current repository root.");
  process.exit(1);
}
if (!fs.existsSync(fragmentPath)) {
  console.error("V100.2.11 apply failed: patch fragment not found.");
  process.exit(1);
}

const replacement = fs.readFileSync(fragmentPath, "utf8").trim();
const handlerPattern = /\$\("#assignTableButton"\)\?\.addEventListener\("click", \(\) => \{[\s\S]*?\n\}\);(?:\n\n\/\/ V100\.2\.11:[\s\S]*?\n\})?/g;

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
    text.includes('button.dataset.bcAssignmentState = "assigned"') &&
    text.includes('button.dataset.bcAssignmentState = "seated"');
});

if (!candidates.length) {
  console.error("V100.2.11 apply failed: V100.2.10 table lifecycle handler was not found. Apply V100.2.10 first. No files changed.");
  process.exit(1);
}

let changed = 0;
for (const file of candidates) {
  const original = fs.readFileSync(file, "utf8");
  if (original.includes("__bcSeatedTableDetailReopenV100_2_11") && original.includes("setDetailVisibility(false)")) {
    console.log(`Already patched: ${path.relative(root, file)}`);
    continue;
  }

  let replacements = 0;
  const updated = original.replace(handlerPattern, (match) => {
    if (!match.includes("bcAssignmentState")) return match;
    replacements += 1;
    return replacement;
  });

  if (replacements !== 1) {
    console.error(`V100.2.11 apply refused ${path.relative(root, file)}: expected exactly 1 V100.2.10 handler, found ${replacements}.`);
    process.exit(1);
  }

  fs.writeFileSync(`${file}.v100.2.11.bak`, original);
  fs.writeFileSync(file, updated);
  changed += 1;
  console.log(`Patched: ${path.relative(root, file)}`);
}

let cssChanged = false;
if (fs.existsSync(stylesPath)) {
  const cssOriginal = fs.readFileSync(stylesPath, "utf8");
  const marker = "/* V100.2.11 — seated table detail auto-collapse */";
  if (!cssOriginal.includes(marker)) {
    const cssPatch = `\n\n${marker}\n#hostTableDetail[hidden] {\n  display: none !important;\n}\n`;
    fs.writeFileSync(`${stylesPath}.v100.2.11.bak`, cssOriginal);
    fs.writeFileSync(stylesPath, cssOriginal + cssPatch);
    cssChanged = true;
    console.log(`Patched: ${path.relative(root, stylesPath)}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  version: "100.2.11",
  repair: "Seated Table Detail Auto-Collapse",
  changedJsFiles: changed,
  matchedJsFiles: candidates.length,
  cssChanged,
  behavior: [
    "seat completion collapses selected-table detail",
    "seated table remains visible on floor",
    "clicking any table intentionally reopens detail",
    "seated table retains guest/table context"
  ]
}, null, 2));
