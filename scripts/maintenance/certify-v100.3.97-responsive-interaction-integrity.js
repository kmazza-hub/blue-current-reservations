"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");
const {spawn,spawnSync}=require("child_process");
const root=path.resolve(__dirname,"../..");

for(const script of ["scripts/validate.js","scripts/maintenance/test-v100.3.97-responsive-interaction-integrity.js"]){
  const result=spawnSync(process.execPath,[path.join(root,script)],{cwd:root,stdio:"inherit"});
  if(result.status!==0)process.exit(result.status||1);
}

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v100-3-97-"));
const database=path.join(temp,"blue-current.json");
const port=24000+Math.floor(Math.random()*1000);
const origin=`http://127.0.0.1:${port}`;
fs.copyFileSync(path.join(root,"database/seed/seed.json"),database);
let child;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitForServer(){
  for(let attempt=0;attempt<150;attempt+=1){
    if(child.exitCode!==null)throw new Error("Server exited during V100.3.97 certification.");
    try{const response=await fetch(`${origin}/api/health`);if(response.ok)return response;}catch{}
    await pause(100);
  }
  throw new Error("Timed out waiting for the isolated V100.3.97 runtime.");
}

(async()=>{
  child=spawn(process.execPath,[path.join(root,"server/server.js")],{cwd:root,env:{...process.env,PORT:String(port),BLUE_CURRENT_DB:database},stdio:"ignore"});
  const health=await waitForServer();
  const healthBody=await health.json();
  assert.equal(healthBody.version,"100.3.97");
  assert.equal(healthBody.auth,"enabled");
  const manifest=await fetch(`${origin}/manifest.webmanifest?v=100.3.97`);
  assert.equal(manifest.status,200);
  assert.match(manifest.headers.get("content-type")||"",/^application\/manifest\+json(?:;|$)/i);
  const icon=await fetch(`${origin}/assets/blue-current-maskable-512.png`);
  assert.equal(icon.status,200);
  assert.match(icon.headers.get("content-type")||"",/^image\/png(?:;|$)/i);
  const protectedResponse=await fetch(`${origin}/api/pilot/operator-command`);
  assert.equal(protectedResponse.status,401);
  assert.ok(database.startsWith(os.tmpdir()));
  console.log("V100.3.97 responsive interaction certification passed in an isolated runtime.");
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
  if(child&&!child.killed)child.kill("SIGTERM");
  fs.rmSync(temp,{recursive:true,force:true});
});

