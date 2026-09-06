"use strict";

const assert=require("assert");
const fs=require("fs");
const path=require("path");
const {spawnSync}=require("child_process");

const root=path.resolve(__dirname,"../..");
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
const lock=JSON.parse(fs.readFileSync(path.join(root,"package-lock.json"),"utf8"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
const certifier=path.join(root,"scripts/maintenance/certify-v100.3.43-pilot-release-candidate.js");
let passed=0,total=0;

function check(name,condition){total+=1;if(condition){passed+=1;console.log(`PASS ${total}: ${name}`);}else{console.error(`FAIL ${total}: ${name}`);process.exitCode=1;}}

check("Package retains or advances beyond the locked pilot candidate",Number(pkg.version.split(".").at(-1))>=43);
check("Package lock matches the runtime release",lock.version===pkg.version&&lock.packages?.[""]?.version===pkg.version);
check("Browser build marker matches the runtime release",html.includes(`<meta name="blue-current-build" content="${pkg.version}">`));
check("Primary stylesheet is cache-busted to the release",html.includes(`styles.css?v=${pkg.version}`));
check("Server startup resolves version from package metadata",server.includes('require("../package.json").version'));
check("Health endpoint resolves version from package metadata",router.includes('require("../../package.json").version')&&router.includes("version: APP_VERSION"));
check("One-command pilot certification remains registered",Boolean(pkg.scripts?.["certify:pilot"]));
check("Pilot certifier exists",fs.existsSync(certifier));

const listing=spawnSync(process.execPath,[certifier,"--list"],{cwd:root,encoding:"utf8"});
const manifest=listing.status===0?JSON.parse(listing.stdout):null;
check("Historical V100.3.43 certification manifest remains readable",manifest?.release==="100.3.43");
check("Certification starts with full project validation",manifest?.gates?.[0]==="Project validation");
check("Certification includes the original full-screen Floor gate",manifest?.gates?.includes("test-v100.3.10.3-fullscreen-floor-zone-controls.js"));
check("Certification includes frontline lifecycle and rush gates",manifest?.gates?.includes("test-v100.3.38-operational-lifecycle-stress-certification.js")&&manifest?.gates?.includes("test-v100.3.39-frontline-failure-rush-stress-certification.js"));
check("Certification includes iPad and configuration gates",manifest?.gates?.includes("test-v100.3.40-ipad-pilot-readiness.js")&&manifest?.gates?.includes("test-v100.3.41-pilot-configuration-truth-gate.js"));
check("Certification ends with hosted environment readiness",manifest?.gates?.at(-1)==="test-v100.3.42-hosted-pilot-environment-gate.js");
check("Release-candidate test cannot recursively invoke itself",!manifest?.gates?.includes("test-v100.3.43-pilot-release-candidate-lock.js"));
check("No release database payload exists",!fs.existsSync(path.join(root,"database/data/V100.3.43.json")));

console.log(`V100.3.43 pilot release candidate lock ${passed}/${total}`);
if(passed!==total)process.exitCode=1;
