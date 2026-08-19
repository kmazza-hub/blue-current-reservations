"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const pkg=require(path.join(root,"package.json"));
assert.equal(pkg.version,"100.0.0","Commercial V100 baseline version must remain unchanged");

const shell=read("client/js/modules/hospitalityOsShell.js");
const fetchBlock=shell.match(/async function commandFetch\(url,options=\{\}\)\{[\s\S]*?\n\}\n\n\nfunction severityLabel/);
assert(fetchBlock,"Command authenticated transport function must exist");
const block=fetchBlock[0];
assert(block.includes("window.BlueCurrentCloudApi"),"Command must use the canonical authenticated Cloud API transport");
assert(block.includes('localStorage.getItem("blueCurrentV3230Token")'),"Command transport must source the active bearer token");
assert(block.includes("api.setToken?.(token)"),"Command transport must attach the current bearer token to the Cloud API instance");
assert(block.includes("return await api.request(url"),"Command refresh must execute through CloudApi.request");
assert(!/\bfetch\s*\(/.test(block),"Command protected refresh must not bypass authenticated transport with raw fetch");
assert(block.includes('scope:"command"'),"Command refreshes must be identifiable as command transport requests");

assert(shell.includes('const payload=await commandFetch(`/api/command/operating-picture${query}`'),"Operating picture must consume the authenticated Command transport payload");
const refreshBlock=shell.match(/async function refreshCommand\(\{force=false\}=\{\}\)\{[\s\S]*?\n\}\n\nfunction authSessionSnapshot/);
assert(refreshBlock,"Command refresh function must exist");
assert(!refreshBlock[0].includes("const payload=await response.json().catch(()=>({}));"),"Command refresh must not retain the old raw Response parsing path");
assert(shell.includes('version:"100.1.3"'),"Shell lifecycle hotfix version marker must be V100.1.2");
assert(/setInterval\(\(\)=>\{[\s\S]*?refreshCommand\(\);[\s\S]*?\},30000\);/.test(shell),"30-second Command refresh cycle must remain active for regression coverage");

const api=read("client/js/cloud/cloudApi.js");
assert(api.includes('if (this.token) headers.Authorization = `Bearer ${this.token}`;'),"Canonical Cloud API must attach Bearer authentication");
assert(api.includes('coordinator?.expire?.({ reason: error.message, path });'),"Canonical Cloud API retains authoritative session expiry handling");

console.log(JSON.stringify({
  ok:true,
  repair:"V100.1.1 Command Auth Transport Hotfix",
  baselineVersion:pkg.version,
  checks:[
    "Command refresh uses canonical authenticated CloudApi transport",
    "active bearer token synchronized into Command request transport",
    "raw unauthenticated Command fetch removed",
    "30-second refresh preserved",
    "authoritative 401/session expiry handling preserved",
    "V100 commercial baseline version unchanged"
  ]
},null,2));
