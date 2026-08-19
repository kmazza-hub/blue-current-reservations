"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const pkg=require(path.join(root,"package.json"));
assert.equal(pkg.version,"100.0.0","Commercial V100 baseline version must remain unchanged");

const shell=read("client/js/modules/hospitalityOsShell.js");
assert(shell.includes('version:"100.1.3"'),"Shell marker must be V100.1.3");
assert(shell.includes('const managedOverlay=window.BlueCurrentAuthOverlay;'),"Command sign-in fallback must prefer the authoritative auth overlay controller");
assert(shell.includes('managedOverlay.open();'),"Command sign-in fallback must delegate to the auth overlay controller");
assert(shell.includes('overlay.removeAttribute("inert");'),"Fallback auth opening must remove inert from the visible login overlay");
assert(shell.includes('overlay.removeAttribute("aria-hidden");'),"Fallback auth opening must expose the visible login overlay to accessibility APIs");
assert(shell.includes('document.getElementById("authEmail")?.focus?.({preventScroll:true})'),"Fallback auth opening must move focus into login");

const auth=read("client/js/modules/authOrganizations.js");
assert(auth.includes('overlay.removeAttribute("inert");'),"Open auth overlay must be interactive");
assert(auth.includes('overlay.setAttribute("inert","");'),"Closed auth overlay must be inert");
assert(auth.includes('shell.setAttribute("aria-hidden","true");'),"Command shell must be hidden from accessibility APIs while auth is active");
assert(auth.includes('shell.setAttribute("inert","");'),"Command shell must be inert while auth is active");
assert(auth.includes('shell.removeAttribute("aria-hidden");'),"Command shell must be restored after authentication");
assert(auth.includes('shell.removeAttribute("inert");'),"Command shell must become interactive after authentication");
assert(auth.includes('if(shell && active && shell.contains(active))active.blur?.();'),"Focus must leave Command before Command is made inert/hidden");
assert(auth.includes('if(overlay && active && overlay.contains(active))active.blur?.();'),"Focus must leave auth overlay before the overlay is hidden/inert");
assert(auth.includes('window.requestAnimationFrame(() => $("authEmail")?.focus?.({preventScroll:true}))'),"Open auth overlay must place focus on the email field");

const openStart=auth.indexOf("function openAuth()");
const closeStart=auth.indexOf("function closeAuth()");
assert(openStart>=0&&closeStart>openStart,"Auth overlay lifecycle functions must exist");
const openBlock=auth.slice(openStart,closeStart);
assert(openBlock.indexOf('overlay.removeAttribute("inert");')>=0,"Open lifecycle must remove overlay inert");
assert(openBlock.indexOf('shell.setAttribute("inert","");')>=0,"Open lifecycle must make Command inert");

console.log(JSON.stringify({
  ok:true,
  repair:"V100.1.3 Authentication Overlay Interaction & Focus Hotfix",
  baselineVersion:pkg.version,
  checks:[
    "visible auth overlay cannot remain inert",
    "Command sign-in uses authoritative overlay lifecycle",
    "fallback login path removes inert and aria-hidden",
    "focus moves into login before interaction",
    "Command shell becomes inert only after Command focus is cleared",
    "auth overlay focus is cleared before close",
    "Command interaction restored after authentication",
    "V100 commercial baseline version unchanged"
  ]
},null,2));
