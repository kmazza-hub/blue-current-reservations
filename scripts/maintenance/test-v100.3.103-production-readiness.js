"use strict";

const assert=require("assert/strict");
const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const html=read("client/index.html");
const isolation=read("client/js/auth-modal-isolation-v100.3.103.js");
const boundary=read("server/services/productionBoundaryService.js");
const packageJson=JSON.parse(read("package.json"));

const version=String(packageJson.version).split(".").map(Number);
assert(version[0]===100&&version[1]===3&&version[2]>=103,"build must retain V100.3.103 or later");
assert.match(html,new RegExp(`meta name="blue-current-build" content="${packageJson.version.replaceAll(".","\\.")}"`));
assert.match(html,/id="authOverlay"[^>]+aria-labelledby="authSignInTitle"/);
assert.match(html,/id="authSignInTitle">Sign in to Blue Current/);
assert(html.includes(`auth-modal-isolation-v100.3.103.js?v=${packageJson.version}`));

assert.match(isolation,/document\.body\.children/);
assert.match(isolation,/surface\.setAttribute\("inert",""\)/);
assert.match(isolation,/surface\.setAttribute\("aria-hidden","true"\)/);
assert.match(isolation,/MutationObserver\(reconcile\)/);
assert.match(isolation,/surface\.dataset\[inertMarker\]/);
assert.match(isolation,/surface\.dataset\[hiddenMarker\]/);

assert.match(boundary,/"Strict-Transport-Security": "max-age=31536000; includeSubDomains"/);

console.log("V100.3.103 production readiness passed: auth modal isolation, accessible naming, and HTTPS transport policy.");
