
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

JSON.parse(fs.readFileSync(path.join(root, "database", "data", "blue-current.json"), "utf8"));

const scriptSources = [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(match => match[1]);
const duplicateScripts = scriptSources.filter((source, index) => scriptSources.indexOf(source) !== index);
if (duplicateScripts.length) throw new Error(`Duplicate scripts: ${[...new Set(duplicateScripts)].join(", ")}`);
if (scriptSources.some(source => source.includes("legacy/"))) throw new Error("A legacy client module is loaded by index.html");

if (!scriptSources.includes("js/core/platform.js")) throw new Error("Platform runtime is not loaded");
const appSource = fs.readFileSync(path.join(root, "client", "js", "app-v15.1.3.js"), "utf8");
if (!appSource.includes("BlueCurrentPlatform.create")) throw new Error("Application does not use the platform runtime");
if (!appSource.includes("startupRegistry.complete()")) throw new Error("Startup completion is not deterministic");

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`Duplicate HTML ids: ${[...new Set(duplicateIds)].join(", ")}`);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (!html.includes(`content="${packageJson.version}"`)) throw new Error("HTML build marker does not match package version");
console.log(`Validated V${packageJson.version}: ${files.length} JavaScript files, ${scriptSources.length} client scripts, ${ids.length} unique HTML ids.`);
