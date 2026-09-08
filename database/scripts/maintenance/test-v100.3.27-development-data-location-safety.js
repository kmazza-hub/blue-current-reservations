"use strict";
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
let passed=0,total=0;
function check(name,condition){total++;if(condition){passed++;console.log(`PASS ${total}: ${name}`)}else{console.error(`FAIL ${total}: ${name}`);process.exitCode=1}}
const intake=read("client/js/modules/dataIntakeSandboxEngine.js"),gateway=read("client/js/modules/canonicalEventGatewayCenter.js"),index=read("client/index.html");
check("Intake samples read the active restaurant",intake.includes("BlueCurrentFrontlineLocation?.get?.()"));
check("Intake samples copy their template",intake.includes("{...template,locationId}"));
check("Intake samples retain a safe startup fallback",intake.includes('||"loc_marina"'));
check("Canonical sample reads the active restaurant",gateway.includes("BlueCurrentFrontlineLocation?.get?.()"));
check("Canonical sample writes the resolved location",gateway.includes("{locationId,checkTotal"));
check("Manual event ingest requires a location",gateway.includes("Location is required before an event can be ingested."));
check("Manual event ingest reads operator authorization",gateway.includes("BlueCurrentFrontlineLocation?.authorized?.()"));
check("Manual event ingest blocks unauthorized locations",gateway.includes("!authorized.includes(locationId)")&&gateway.includes("not authorized for the current operator"));
check("Validation occurs before canonical ingestion",gateway.indexOf("!authorized.includes(locationId)")<gateway.indexOf("await e.ingest"));
check("Intake engine cache key advances",index.includes("js/modules/dataIntakeSandboxEngine.js?v=100.3.27"));
check("Canonical center cache key advances",index.includes("js/modules/canonicalEventGatewayCenter.js?v=100.3.27"));
check("Release does not add database payloads",!fs.existsSync(path.join(root,"database/data/V100.3.27.json")));
console.log(`V100.3.27 validation ${passed}/${total}`);if(passed!==total)process.exitCode=1;
