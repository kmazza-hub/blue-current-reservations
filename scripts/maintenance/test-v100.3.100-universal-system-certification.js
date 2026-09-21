"use strict";

const assert=require("assert/strict");
const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const pkg=JSON.parse(read("package.json"));
const html=read("client/index.html");
const manifest=JSON.parse(read("config/certification/v100.3.100-universal-system.json"));
const router=read("server/api/router.js");
const certifier=read("scripts/maintenance/certify-v100.3.100-universal-system.js");

assert.equal(pkg.version,"100.3.100");
assert.equal(pkg.scripts["certify:pilot"],"node scripts/maintenance/certify-v100.3.100-universal-system.js");
assert.equal(pkg.scripts["certify:universal"],pkg.scripts["certify:pilot"]);
assert.equal(pkg.scripts["test:mock-day"],"node scripts/maintenance/certify-v100.3.100-mock-restaurant-day.js");
assert(html.includes('name="blue-current-build" content="100.3.100"'));
assert(html.includes("Blue Current V100.3.100"));
assert(html.includes("styles.css?v=100.3.100"));
assert(html.includes("holiday-reservation-book-v100.3.98.js?v=100.3.100"));

for(const file of manifest.blockingTests)assert(fs.existsSync(path.join(root,file)),`missing blocking test ${file}`);
for(const endpoint of manifest.frontlineEndpoints)assert(router.includes(`"${endpoint}"`),`missing frontline endpoint ${endpoint}`);
for(const required of [
  "scripts/validate.js",
  "test-v100.3.97-responsive-interaction-integrity.js",
  "test-v100.3.98-holiday-reservation-book.js",
  "test-v100.3.99-reservation-contrast.js",
  "certify-v100.3.100-mock-restaurant-day.js",
  "test-v100.3.100-frontline-api-performance.js",
  "test-v100.3.100-historical-test-classification.js"
])assert(certifier.includes(required),`universal certifier must run ${required}`);

const refs=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match=>match[1]);
const local=[...new Set(refs.filter(value=>value&&!value.startsWith("#")&&!/^(?:https?:|data:|mailto:|tel:)/.test(value)).map(value=>value.split("?")[0].replace(/^\.\//,"").replace(/^\//,"")))];
const missing=local.filter(file=>file&&!fs.existsSync(path.join(root,"client",file)));
assert.deepEqual(missing,[],`missing client assets: ${missing.join(", ")}`);
assert(local.length>=900,"universal asset inventory must cover the complete client surface");
assert(!fs.existsSync(path.join(root,"database/data/V100.3.100.json")),"release must not contain a live database payload");
assert.equal(manifest.safety.liveDatabaseProhibited,true);
assert.equal(manifest.safety.physicalDeviceSignoffRequired,true);
assert.equal(manifest.safety.certificationDoesNotDeploy,true);

console.log(`V100.3.100 universal system contract passed with ${local.length} local client assets and ${manifest.frontlineEndpoints.length} frontline APIs.`);
