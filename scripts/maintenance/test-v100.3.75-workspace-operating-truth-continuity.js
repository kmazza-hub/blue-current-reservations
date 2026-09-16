"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const html = read("client/index.html");
const css = read("client/styles.css");
const shell = read("client/js/modules/hospitalityOsShell.js");
const readiness = read("client/js/modules/productionReadiness.js");
const pkg = require(path.join(root, "package.json"));
let passed = 0;

function check(name, condition) {
  assert.ok(condition, name);
  passed += 1;
  console.log(`PASS: ${name}`);
}

check("Build retains V100.3.75 audit closure", ["100.3.75","100.3.76","100.3.77","100.3.78"].includes(pkg.version) && html.includes('content="100.3.78"'));
check("Primary sidebar navigation has one delegated click owner", /function installPrimaryNavigation\(\)[\s\S]*\.bc-os-nav[\s\S]*addEventListener\("click"[\s\S]*stopImmediatePropagation\(\)[\s\S]*activate\(button\.dataset\.bcWorkspace/.test(shell));
check("Competing sidebar pointerdown activation is removed", !/closest\("\.bc-os-nav"\)\)button\.addEventListener\("pointerdown"/.test(shell));
check("Repeated selection always reactivates the requested workspace", /if\(button\.closest\("\.bc-os-nav"\)\)return;[\s\S]*button\.addEventListener\("click",\(\)=>activate/.test(shell));
check("Historical data settles to an explicit demo snapshot label", /data\.dataMode==="historical-demo"[\s\S]*label\.textContent="Demo snapshot"/.test(shell));
check("Command publishes the certified pilot readiness result", /blockers:data\.readiness\?\.blocking\?\.length[\s\S]*publishCertifiedReadiness\(certifiedReadiness\)/.test(shell) && /function publishCertifiedReadiness\(readiness\)[\s\S]*CustomEvent\("bluecurrent:pilot-readiness"/.test(shell));
check("System readiness consumes the Command readiness result", /addEventListener\("bluecurrent:pilot-readiness"[\s\S]*certifiedPilotReadiness=event\.detail/.test(readiness));
check("System no longer claims pilot-ready before certified evidence", html.includes('id="prodDeploymentStatus">Readiness pending</span>') && html.includes('id="prodHealthScore">—</strong>'));
check("Readiness hold and blockers are rendered from the certified result", /held \? "Readiness hold"/.test(readiness) && /certifiedPilotReadiness\.blockers/.test(readiness));
check("Core operator controls meet a 44px target", /\.bc-os-nav button,\.bc-manager-action button,#bcPilotControls button[\s\S]*min-height:44px/.test(css));
check("Rush dock reserves content clearance on desktop and mobile", /\.bc-rush-mode \.bc-os-command\{padding-bottom:126px\}/.test(css) && /\.bc-rush-mode \.bc-os-command\{padding-bottom:168px\}/.test(css));
check("Updated shell, readiness, and style assets cross a fresh cache boundary", html.includes("styles.css?v=100.3.78") && html.includes("hospitalityOsShell.js?v=100.3.78") && html.includes("productionReadiness.js?v=100.3.78"));

console.log(`V100.3.75 workspace and operating-truth continuity ${passed}/${passed}`);
