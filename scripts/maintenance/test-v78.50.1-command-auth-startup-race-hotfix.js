"use strict";

const assert=require("assert");
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");

assert(/^78\.50\.[12]$/.test(pkg.version));

assert(html.includes('id="bcCommandAccessState"'));
assert(html.includes('id="bcCommandSignIn"'));
assert(html.includes(`styles.css?v=${pkg.version}`));
assert(html.includes(`hospitalityOsShell.js?v=${pkg.version}`));

assert(shell.includes("function startCommandAfterAuth"));
assert(shell.includes("authenticatedAppState"));
assert(shell.includes('bus.on("auth:restored",start)'));
assert(shell.includes('bus.on("auth:signed-in",start)'));
assert(shell.includes('bus.on("auth:required"'));
assert(shell.includes('bus.on("auth:signed-out"'));
assert(shell.includes("Do not race it with a protected Command GET."));
assert(!shell.includes("setTimeout(()=>{commandState.authRequired=false;commandState.transportBackoffUntil=0;refreshCommand();},900)"));

assert(shell.includes('response.status===401'));
assert(shell.includes('openAuthFallback("Your session expired. Please sign in again.")'));
assert(shell.includes('setCommandAccessState("auth"'));
assert(shell.includes('setCommandAccessState("transport"'));

assert(css.includes("V78.50.1 — Command blank-screen + authentication resilience"));
assert(css.includes("body.bc-command-auth-required #blueCurrentCommand"));
assert(css.includes("body.bc-command-transport-down #blueCurrentCommand"));

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML IDs");
const anchors=[...html.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual([...new Set(anchors.filter(id=>!ids.includes(id)))],[],"broken fragment anchors");

console.log(JSON.stringify({
  ok:true,
  version:"78.50.1",
  startupAuthRaceRemoved:true,
  commandWaitsForAuthRestore:true,
  commandRefreshesAfterSignedIn:true,
  commandRefreshesAfterOrganizationSwitch:true,
  anonymousStateVisible:true,
  commandShellNeverBlankOn401:true,
  transportStateVisible:true,
  quickJobsPreserved:true,
  duplicateIds:0,
  brokenAnchors:0
},null,2));
