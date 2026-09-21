"use strict";

const assert=require("assert/strict");
const fs=require("fs");
const os=require("os");
const path=require("path");
const {spawn}=require("child_process");

const root=path.resolve(__dirname,"../..");
const manifest=require(path.join(root,"config/certification/v100.3.100-universal-system.json"));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),"blue-current-v3100-performance-"));
const databasePath=path.join(tempRoot,"blue-current.json");
const logPath=path.join(tempRoot,"server.log");
const port=21900+Math.floor(Math.random()*500);
const origin=`http://127.0.0.1:${port}`;
const threshold=manifest.performance.frontlineResponseTargetMs;
let server=null;

fs.copyFileSync(path.join(root,"database/seed/seed.json"),databasePath);
const pause=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));

async function startServer(){
  const log=fs.openSync(logPath,"a");
  server=spawn(process.execPath,[path.join(root,"server/server.js")],{
    cwd:root,
    env:{...process.env,PORT:String(port),BLUE_CURRENT_DB:databasePath},
    stdio:["ignore",log,log]
  });
  for(let attempt=0;attempt<100;attempt+=1){
    if(server.exitCode!==null)throw new Error(`Performance test server exited early. See ${logPath}`);
    try{if((await fetch(`${origin}/api/health`)).ok)return;}catch{}
    await pause(100);
  }
  throw new Error(`Performance test server did not become healthy. See ${logPath}`);
}

async function stopServer(){
  if(!server||server.exitCode!==null)return;
  server.kill();
  await Promise.race([new Promise(resolve=>server.once("exit",resolve)),pause(3000)]);
  server=null;
}

(async()=>{
  try{
    await startServer();
    const login=await fetch(`${origin}/api/auth/login`,{
      method:"POST",
      headers:{"Content-Type":"application/json","X-Blue-Current-Idempotency-Key":"v3100-performance-login"},
      body:JSON.stringify({email:"keith@bluecurrent.demo",password:"BlueCurrent23!"})
    });
    assert.equal(login.status,200);
    const token=(await login.json()).token;
    assert(token,"authenticated token missing");

    const query=new URLSearchParams({locationId:"loc_marina",weekStart:new Date().toISOString().slice(0,10)});
    const results=[];
    for(const endpoint of manifest.frontlineEndpoints){
      const started=Date.now();
      const response=await fetch(`${origin}${endpoint}${endpoint==="/api/health"?"":`?${query}`}`,{
        headers:{Authorization:`Bearer ${token}`},
        signal:AbortSignal.timeout(threshold)
      });
      const body=await response.text();
      results.push({endpoint,status:response.status,durationMs:Date.now()-started,bytes:body.length});
    }

    const failures=results.filter(item=>item.status!==200||item.durationMs>threshold||item.bytes===0);
    assert.deepEqual(failures,[],`frontline API failures: ${JSON.stringify(failures)}`);
    assert.equal(results.length,manifest.frontlineEndpoints.length);
    console.log(`V100.3.100 frontline performance passed: ${results.length} APIs, slowest ${Math.max(...results.map(item=>item.durationMs))}ms, target ${threshold}ms.`);
  } finally {
    await stopServer().catch(()=>{});
    fs.rmSync(tempRoot,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
