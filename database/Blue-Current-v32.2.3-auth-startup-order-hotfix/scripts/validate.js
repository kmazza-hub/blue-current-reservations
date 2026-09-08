
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (target.endsWith(".js")) files.push(target);
  }
}

walk(path.join(root, "client", "js"));
walk(path.join(root, "server"));
walk(path.join(root, "shared"));
walk(path.join(root, "database", "migrations"));

for (const file of files) execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });

const html = fs.readFileSync(path.join(root, "client", "index.html"), "utf8");
for (const match of html.matchAll(/<script[^>]+src="([^"?]+)/g)) {
  const target = path.join(root, "client", match[1]);
  if (!fs.existsSync(target)) throw new Error(`Missing script: ${match[1]}`);
}


const scriptSources = [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(match => match[1]);
const duplicates = scriptSources.filter((src, index) => scriptSources.indexOf(src) !== index);
if (duplicates.length) throw new Error(`Duplicate scripts: ${[...new Set(duplicates)].join(", ")}`);
if (scriptSources.some(src => src.includes("modules/autonomousOperations.js"))) {
  throw new Error("Retired autonomousOperations renderer is still active");
}
for (const required of ["js/core/safeDom.js", "js/core/moduleRegistry.js"]) {
  if (!scriptSources.includes(required)) throw new Error(`Missing V32.3 core script: ${required}`);
}

JSON.parse(fs.readFileSync(path.join(root, "database", "data", "blue-current.json"), "utf8"));
console.log(`Validated ${files.length} JavaScript files, core registry, retired legacy runtime, and all client script references.`);
