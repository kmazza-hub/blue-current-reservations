"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const pkg=require(path.join(root,"package.json"));
assert.equal(pkg.version,"100.0.0","Commercial V100 baseline version must remain unchanged");

const shell=read("client/js/modules/hospitalityOsShell.js");
assert(shell.includes('version:"100.1.3"'),"Shell lifecycle marker must be V100.1.3");
assert(shell.includes("if(window.BlueCurrentAuthSession)return false;"),"Authoritative coordinator must prevent stale appState authentication fallback");
assert(shell.includes("Register lifecycle listeners before inspecting initial state."),"Command lifecycle must register listeners before checking initial auth state");
assert(shell.includes('window.addEventListener("bluecurrent:auth-session-state",handleCoordinatorState);'),"Coordinator state listener must remain active after startup");
assert(shell.includes('bus.on("auth:signed-in",()=>start(authSessionSnapshot()));'),"Fresh sign-in must immediately start Command");
assert(shell.includes("refreshCommand({force});"),"Authenticated lifecycle start must trigger an operating-picture refresh");
assert(shell.includes('setCommandAccessState("ready");'),"Successful auth lifecycle must clear the Sign in/reconnecting access banner");
assert(/setInterval\(\(\)=>\{[\s\S]*?authenticatedAppState\(\)\)refreshCommand\(\);[\s\S]*?\},30000\);/.test(shell),"30-second authenticated Command refresh must remain active");

const commandFetchUses=[...shell.matchAll(/await commandFetch\(/g)].length;
assert(commandFetchUses>=8,"Expected protected Command/Pilot calls to use commandFetch");
assert(!/await response\.json\(\)/.test(shell),"Command shell must not parse CloudApi payloads as raw Response objects");
assert(!/response\.ok/.test(shell),"Command shell must rely on CloudApi exceptions instead of raw Response.ok");
assert(!/response\.status/.test(shell),"Command shell must not rely on raw Response.status after CloudApi normalization");


const router=read("server/api/router.js");
assert(router.includes("const organizationId = auth.membership.organizationId;"),"Protected routes must establish organization scope immediately after auth");
assert(router.includes("const allowedLocations = auth.membership.locationIds || [];"),"Protected routes must use membership location scope");
assert(!router.includes("auth.allowedLocationIds||[]"),"Router must not consume the nonexistent auth.allowedLocationIds property");
const picture=read("server/services/commandOperatingPictureService.js");
assert(picture.includes("heavyweight pilot/certification"),"Operating picture must keep heavyweight pilot certification work off the 30-second hot path");

const lifecycle=shell.slice(shell.indexOf("function startCommandAfterAuth(){"),shell.indexOf("\nfunction init(){"));
const listenerPos=lifecycle.indexOf('window.addEventListener("bluecurrent:auth-session-state",handleCoordinatorState);');
const initialPos=lifecycle.indexOf("const initialSnapshot=authSessionSnapshot();");
assert(listenerPos>=0&&initialPos>=0&&listenerPos<initialPos,"Lifecycle listener registration must precede initial auth snapshot evaluation");
assert(!/if\(initialSnapshot\?\.authenticated\|\|authenticatedAppState\(\)\)[\s\S]{0,120}return;/.test(lifecycle),"Initial auth path must not return before listeners remain registered");

console.log(JSON.stringify({
  ok:true,
  repair:"V100.1.3 Command Lifecycle & API Contract Hotfix",
  baselineVersion:pkg.version,
  checks:[
    "authoritative coordinator blocks stale appState auth",
    "fresh sign-in lifecycle listener remains registered",
    "successful auth triggers immediate Command refresh",
    "authenticated access banner clears",
    "30-second Command refresh remains active",
    "CloudApi parsed-payload contract normalized across Command/Pilot calls",
    "protected router tenant/location scope normalized",
    "heavyweight pilot certification removed from 30-second Command hot path",
    "V100 commercial baseline version unchanged"
  ]
},null,2));
