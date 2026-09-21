"use strict";

const assert=require("assert/strict");
const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const pkg=JSON.parse(read("package.json"));
const html=read("client/index.html");
const auth=read("client/js/modules/authOrganizations.js");
const cloud=read("client/js/cloud/cloudApi.js");
const workspaces=read("client/js/focused-operator-workspaces-v100.3.9.js");

assert.equal(pkg.version,"100.3.101");
assert.equal(pkg.scripts["certify:pilot"],"node scripts/maintenance/certify-v100.3.101-ipad-host-return.js");
assert.equal(pkg.scripts["certify:universal"],pkg.scripts["certify:pilot"]);
assert(html.includes('name="blue-current-build" content="100.3.101"'));
assert(html.includes("Blue Current V100.3.101"));
assert(html.includes("focused-operator-workspaces-v100.3.9.js?v=100.3.101"));
assert(html.includes("authOrganizations.js?v=100.3.101"));

const signOutStart=auth.indexOf("async function signOut()");
const signOutEnd=auth.indexOf('$("authLogout")?.addEventListener',signOutStart);
const signOut=auth.slice(signOutStart,signOutEnd);
assert(signOut.includes("const remoteSignOut = api.logout().catch(() => null);"),"server session revocation must still start");
assert(signOut.includes("sessionCoordinator?.signOut?.(api);"),"local session must be cleared");
assert(signOut.indexOf("api.logout()")<signOut.indexOf("sessionCoordinator?.signOut?.(api)"),"server revocation must capture the token before local clearing");
assert(!signOut.includes("await api.logout()"),"the login screen must not wait for hosted logout latency");
assert(signOut.indexOf("openAuth();")<signOut.indexOf("void remoteSignOut;"),"the signed-out screen must open before background revocation settles");

assert(cloud.includes("const token = this.token;"),"logout must capture the authenticated token");
assert(cloud.includes("skipAuthReadiness: true"),"logout must remain authorized after the local session is cleared");
assert(cloud.includes("!options.skipAuthReadiness && coordinator?.whenReady"),"only logout may bypass readiness");
assert(cloud.includes("timeoutMs: 2500"),"background logout must have a bounded network wait");
assert(cloud.includes("retries: 0"),"background logout must not retry on the host's critical path");

const seatedHandler=workspaces.indexOf('window.addEventListener("bc:host-guest-seated"');
assert(seatedHandler>=0,"seating completion listener must remain installed");
const seatedBlock=workspaces.slice(seatedHandler,workspaces.indexOf("document.addEventListener(\"keydown\"",seatedHandler));
assert(seatedBlock.includes("exitFloor({returnHome:true})"),"completed seating must leave full-screen floor and return home");
assert(seatedBlock.includes("bc:seating-returned-home"),"completed seating must publish its return-home state");
assert(!seatedBlock.includes("bc:fullscreen-floor-ready"),"completed seating must not keep the iPad in full-screen floor mode");

console.log("V100.3.101 iPad host return passed: immediate sign-out and post-seating main-screen return.");
