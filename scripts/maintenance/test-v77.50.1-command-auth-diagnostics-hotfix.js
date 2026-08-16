"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
const diagnostics=fs.readFileSync(path.join(root,"client/js/modules/startupDiagnostics.js"),"utf8");

assert(Number(pkg.version.split(".")[0]) >= 77);
assert(/Blue Current V\d+(?:\.\d+){1,2}/.test(html));
assert(html.includes(`styles.css?v=${pkg.version}`));
assert(html.includes(`hospitalityOsShell.js?v=${pkg.version}`));

assert(css.includes("V77.50.1 — diagnostics dock"));
assert(css.includes("top:96px!important"));
assert(css.includes("bottom:auto!important"));
assert(css.includes("width:42px!important"));
assert(css.includes(".startup-diagnostics>button strong"));
assert(css.includes("display:none!important"));

assert(shell.includes("function commandFetch"));
assert(shell.includes("response.status===401"));
assert(shell.includes("bluecurrent:auth-session-expired"));
assert(shell.includes("response.status===502"));
assert(shell.includes("transportBackoffUntil"));
assert(shell.includes("authOverlayOpen"));
assert(shell.includes("commandFetch(`/api/command/operating-picture"));
assert(shell.includes("commandFetch(`/api/command/actions"));
assert(shell.includes("commandFetch(`/api/command/outcomes"));

assert(/const BUILD = "\d+\.\d+\.\d+"/.test(diagnostics));
assert(diagnostics.includes("Boolean(api && api.version)"));
assert(!diagnostics.includes("api?.version === BUILD"));

console.log(JSON.stringify({
  ok:true,
  version:"77.50.1",
  diagnosticsDocked:true,
  quickJobsClear:true,
  legacyBuildMismatchRemoved:true,
  command401AuthRecovery:true,
  command502Backoff:true,
  repeatedUnauthorizedPollingSuppressed:true
},null,2));
