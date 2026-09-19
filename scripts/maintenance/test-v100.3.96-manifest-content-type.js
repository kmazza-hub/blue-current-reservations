"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path"),{spawn}=require("child_process"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8"),manifestSource=JSON.parse(fs.readFileSync(path.join(root,"client/manifest.webmanifest"),"utf8"));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v100-3-96-")),database=path.join(temp,"blue-current.json"),port=23000+Math.floor(Math.random()*1000),origin=`http://127.0.0.1:${port}`;
fs.copyFileSync(path.join(root,"database/seed/seed.json"),database);
let child;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForServer(){for(let attempt=0;attempt<150;attempt+=1){if(child.exitCode!==null)throw new Error("Server exited during V100.3.96 certification.");try{const response=await fetch(`${origin}/api/health`);if(response.ok)return response;}catch{}await pause(100);}throw new Error("Timed out waiting for the isolated V100.3.96 runtime.");}
(async()=>{
  assert.equal(pkg.version,"100.3.96");
  assert.equal(pkg.scripts["certify:pilot"],"node scripts/maintenance/certify-v100.3.96-manifest-content-type.js");
  assert.ok(html.includes('<title>Blue Current</title>')&&html.includes('manifest.webmanifest?v=100.3.96'));
  assert.equal(manifestSource.short_name,"Blue Current");
  assert.ok(manifestSource.icons.some(icon=>icon.purpose==="maskable"&&icon.sizes==="512x512"));
  child=spawn(process.execPath,[path.join(root,"server/server.js")],{cwd:root,env:{...process.env,PORT:String(port),BLUE_CURRENT_DB:database},stdio:"ignore"});
  const health=await waitForServer(),healthBody=await health.json();
  assert.equal(healthBody.version,"100.3.96");
  assert.equal(healthBody.auth,"enabled");
  const manifest=await fetch(`${origin}/manifest.webmanifest?v=100.3.96`);
  assert.equal(manifest.status,200);
  assert.match(manifest.headers.get("content-type")||"",/^application\/manifest\+json(?:;|$)/i);
  assert.equal((await manifest.json()).short_name,"Blue Current");
  const icon=await fetch(`${origin}/assets/blue-current-maskable-512.png`);
  assert.equal(icon.status,200);assert.match(icon.headers.get("content-type")||"",/^image\/png(?:;|$)/i);
  const protectedResponse=await fetch(`${origin}/api/pilot/operator-command`);
  assert.equal(protectedResponse.status,401);
  assert.ok(database.startsWith(os.tmpdir()));
  console.log("PASS V100.3.96 — manifest MIME, app identity, auth boundary, and isolated runtime are correct.");
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{if(child&&!child.killed)child.kill("SIGTERM");});
