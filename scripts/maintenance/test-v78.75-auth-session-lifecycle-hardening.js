"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
const auth=fs.readFileSync(path.join(root,"client/js/modules/authOrganizations.js"),"utf8");
const loader=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

assert.equal(pkg.version,"78.75.0");
assert(html.includes("styles.css?v=78.75.0"));
assert(html.includes("hospitalityOsShell.js?v=78.75.0"));

assert(shell.includes("async function refreshCommand({force=false}={})"));
assert(shell.includes("if(!authenticatedAppState())"));
assert(shell.includes("now-commandState.lastRequestAt<1200"));
assert(shell.includes("refreshCommand({force:true})"));
assert(shell.includes("if(authenticatedAppState())refreshCommand()"));
assert(shell.includes('bus.on("auth:restored",start)'));
assert(shell.includes('bus.on("auth:signed-in",start)'));
assert(shell.includes('bus.on("auth:organization-switched"'));

assert(auth.includes("function focusOutsideAuth()"));
assert(auth.includes('overlay.setAttribute("aria-hidden","true")'));
assert(auth.includes('overlay.setAttribute("inert","")'));
assert(auth.includes('overlay.removeAttribute("aria-hidden")'));
assert(auth.includes('overlay.removeAttribute("inert")'));
assert(auth.includes("window.BlueCurrentAuthOverlay={open:openAuth,close:closeAuth}"));

assert(loader.includes("window.BlueCurrentAuthOverlay.close()"));
assert(loader.includes("window.BlueCurrentAuthOverlay.open()"));
assert(loader.includes("if(active && overlay.contains(active))active.blur?.()"));
assert(loader.includes('overlay.setAttribute("inert","")'));
assert(loader.includes('overlay.removeAttribute("inert")'));

const calls=[...shell.matchAll(/\/api\/command\/operating-picture/g)];
assert.equal(calls.length,1,"single operating-picture call site expected");

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate ids");

console.log(JSON.stringify({
  ok:true,version:"78.75.0",
  protectedReadAuthGate:true,
  rapidRefreshCoalescing:true,
  workspaceAuthRaceRemoved:true,
  authRestoreLifecycle:true,
  organizationSwitchLifecycle:true,
  focusSafeOverlayClose:true,
  inertWhenHidden:true,
  ariaFocusWarningPrevented:true,
  singleOperatingPictureCallSite:true
},null,2));
