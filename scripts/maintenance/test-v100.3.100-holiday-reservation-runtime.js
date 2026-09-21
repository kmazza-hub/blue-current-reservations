"use strict";

const assert=require("assert/strict");
const fs=require("fs");
const os=require("os");
const path=require("path");
const {spawn}=require("child_process");

const root=path.resolve(__dirname,"../..");
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),"blue-current-v3100-holiday-"));
const databasePath=path.join(tempRoot,"blue-current.json");
const logPath=path.join(tempRoot,"server.log");
const port=21400+Math.floor(Math.random()*500);
const origin=`http://127.0.0.1:${port}`;
let server=null;
let sequence=0;

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
    if(server.exitCode!==null)throw new Error(`Holiday test server exited early. See ${logPath}`);
    try{if((await fetch(`${origin}/api/health`)).ok)return;}catch{}
    await pause(100);
  }
  throw new Error(`Holiday test server did not become healthy. See ${logPath}`);
}

async function stopServer(){
  if(!server||server.exitCode!==null)return;
  server.kill();
  await Promise.race([new Promise(resolve=>server.once("exit",resolve)),pause(3000)]);
  server=null;
}

async function request(pathname,{method="GET",token=null,body}={}){
  const headers={};
  if(token)headers.Authorization=`Bearer ${token}`;
  if(body!==undefined)headers["Content-Type"]="application/json";
  if(method!=="GET")headers["X-Blue-Current-Idempotency-Key"]=`v3100-holiday-${++sequence}`;
  const response=await fetch(`${origin}${pathname}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,payload:await response.json()};
}

(async()=>{
  try{
    await startServer();
    const login=await request("/api/auth/login",{method:"POST",body:{email:"keith@bluecurrent.demo",password:"BlueCurrent23!"}});
    assert.equal(login.status,200);
    const token=login.payload.token;
    assert(token,"authenticated token missing");

    const input={
      locationId:"loc_marina",
      guestName:"V100.3.100 Holiday Guest",
      phone:"732-555-0199",
      partySize:5,
      reservationTime:"2026-11-26T17:30:00",
      holidayEvent:"Thanksgiving",
      seatingPreference:"Waterfront",
      notes:"High chair",
      source:"Phone reservation"
    };
    const created=await request("/api/reservation-operations",{method:"POST",token,body:input});
    assert.equal(created.status,201);
    assert.equal(created.payload.holidayEvent,"Thanksgiving");
    assert.equal(created.payload.seatingPreference,"Waterfront");
    assert.equal(created.payload.source,"Phone reservation");

    const duplicate=await request("/api/reservation-operations",{method:"POST",token,body:input});
    assert.equal(duplicate.status,409);
    assert.equal(duplicate.payload.code,"DUPLICATE_RESERVATION");

    const listed=await request("/api/reservation-operations?locationId=loc_marina",{token});
    assert.equal(listed.status,200);
    assert(listed.payload.some(item=>item.id===created.payload.id&&item.phone==="732-555-0199"));

    const arrived=await request(`/api/reservation-operations/${encodeURIComponent(created.payload.id)}`,{method:"PATCH",token,body:{status:"arrived"}});
    assert.equal(arrived.status,200);
    assert.equal(arrived.payload.status,"arrived");

    const floor=await request("/api/floor?locationId=loc_marina",{token});
    assert.equal(floor.status,200);
    assert(floor.payload.waitlist.some(item=>item.reservationId===created.payload.id&&item.status==="waiting"));

    console.log("V100.3.100 holiday runtime passed: phone save, fields, duplicate protection, list, arrival, and waitlist handoff.");
  } finally {
    await stopServer().catch(()=>{});
    fs.rmSync(tempRoot,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
