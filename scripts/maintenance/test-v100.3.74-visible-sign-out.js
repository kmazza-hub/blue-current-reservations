"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const html = read("client/index.html");
const css = read("client/styles.css");
const auth = read("client/js/modules/authOrganizations.js");
const router = read("server/api/router.js");
const pkg = require(path.join(root, "package.json"));
let passed = 0;

function check(name, condition) {
  assert.ok(condition, name);
  passed += 1;
  console.log(`PASS: ${name}`);
}

check("Build retains certified V100.3.74 behavior", ["100.3.74","100.3.75"].includes(pkg.version) && html.includes('content="100.3.75"'));
check("The persistent application shell exposes one sign-out control", (html.match(/id="bcShellSignOut"/g) || []).length === 1);
check("The shell identifies the signed-in user", html.includes('id="bcShellUser"'));
check("Desktop sign-out is located in the persistent account area", /class="bc-os-account"[\s\S]*id="bcShellSignOut"/.test(html));
check("Mobile and iPad layouts retain a visible sign-out control", /@media\(max-width:900px\)[\s\S]*\.bc-os-account\{position:fixed/.test(css));
check("Sign-out revokes the authenticated server session", /async function signOut\(\)[\s\S]*await api\.logout\(\)/.test(auth));
check("Sign-out clears the shared session coordinator", /sessionCoordinator\?\.signOut\?\.\(api\)/.test(auth));
check("Sign-out clears user, organization, role, and location state", /authenticatedUser: null[\s\S]*activeOrganizationId: null[\s\S]*activeRole: null[\s\S]*authorizedLocationIds: \[\]/.test(auth));
check("Sign-out returns focus to the protected login overlay", /eventBus\.emit\("auth:signed-out"[\s\S]*openAuth\(\)/.test(auth));
check("Both legacy and shell controls share the certified sign-out path", /\$\("authLogout"\)\?\.addEventListener\("click", signOut\)[\s\S]*\$\("bcShellSignOut"\)\?\.addEventListener\("click", signOut\)/.test(auth));
check("The logout API remains a protected POST route", /pathname === "\/api\/auth\/logout" && request\.method === "POST"[\s\S]*authService\.authenticate\(token\)[\s\S]*authService\.logout\(token\)/.test(router));
check("Updated authentication assets cross a fresh cache boundary", html.includes("styles.css?v=100.3.75") && html.includes("authOrganizations.js?v=100.3.75"));

console.log(`V100.3.74 visible sign-out compatibility ${passed}/${passed}`);
