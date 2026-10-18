"use strict";
const { spawnSync } = require("child_process");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const result = spawnSync(process.execPath, [path.join(__dirname, "certify-v100.3.112-harbor-demo-input.js")], { cwd: root, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);
console.log("V100.3.113 certification passed — Wharfside presentation; restaurant activation remains separately gated.");
