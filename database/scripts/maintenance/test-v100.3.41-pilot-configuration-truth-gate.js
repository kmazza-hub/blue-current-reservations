"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "../..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "blue-current-v341-"));
const databasePath = path.join(tempRoot, "blue-current.json");
const serverLogPath = path.join(tempRoot, "server.log");
const port = 20300 + Math.floor(Math.random() * 600);
const origin = `http://127.0.0.1:${port}`;
let server = null;
let passed = 0;
let total = 0;

fs.copyFileSync(path.join(root, "database/seed/seed.json"), databasePath);

function check(name, condition) {
  total += 1;
  if (condition) { passed += 1; console.log(`PASS ${total}: ${name}`); }
  else { console.error(`FAIL ${total}: ${name}`); process.exitCode = 1; }
}

const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function startServer() {
  const log = fs.openSync(serverLogPath, "a");
  server = spawn(process.execPath, [path.join(root, "server/server.js")], {
    cwd:root,
    env:{ ...process.env, PORT:String(port), BLUE_CURRENT_DB:databasePath },
    stdio:["ignore",log,log]
  });
  for (let attempt=0; attempt<100; attempt+=1) {
    if (server.exitCode !== null) throw new Error(`Test server exited early. See ${serverLogPath}`);
    try { if ((await fetch(`${origin}/api/health`)).ok) return; } catch (_) {}
    await pause(100);
  }
  throw new Error(`Test server did not become healthy. See ${serverLogPath}`);
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await Promise.race([new Promise(resolve=>server.once("exit",resolve)),pause(3000)]);
  server=null;
}

async function request(pathname,{method="GET",token=null,body,idempotencyKey=null}={}) {
  const headers={};
  if(token) headers.Authorization=`Bearer ${token}`;
  if(body!==undefined) headers["Content-Type"]="application/json";
  if(idempotencyKey) headers["X-Blue-Current-Idempotency-Key"]=idempotencyKey;
  const response=await fetch(`${origin}${pathname}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,headers:response.headers,payload:await response.json()};
}

async function login(){
  const response=await request("/api/auth/login",{method:"POST",body:{email:"keith@bluecurrent.demo",password:"BlueCurrent23!"}});
  if(response.status!==200||!response.payload.token) throw new Error("Demo owner login failed.");
  return response.payload.token;
}

(async()=>{
  await startServer();
  const token=await login();
  const initial=await request("/api/configuration/restaurant",{token});
  check("Default configuration is identified as unpersisted",initial.status===200&&initial.payload.configured===false&&initial.payload.readiness.checks.configurationPersisted===false);
  check("Default configuration does not claim real restaurant confirmation",initial.payload.configuration.pilot.actualRestaurantDataConfirmed===false);

  const blocked=await request("/api/configuration/pilot-certification/assess",{token});
  check("Placeholder configuration is blocked from pilot certification",blocked.status===200&&blocked.payload.status==="BLOCKED"&&!blocked.payload.checks.placeholderIdentityRemoved);
  check("Missing restaurant confirmation is an explicit blocker",blocked.payload.blocking.includes("restaurantConfirmationRecorded"));
  check("Missing operational table truth is an explicit blocker",blocked.payload.blocking.includes("tableMapMatchesOperationalTruth"));

  const seed=JSON.parse(fs.readFileSync(path.join(root,"database/seed/seed.json"),"utf8"));
  const location=seed.locations.find(item=>item.id==="loc_marina");
  const operationalTables=seed.tables.filter(item=>item.organizationId==="org_chefs"&&item.locationId===location.id);
  const areaIds=[...new Set(operationalTables.map(item=>item.sectionId))];
  const areaNames=new Map(operationalTables.map(item=>[item.sectionId,item.section]));
  const configuration={
    location:{id:location.id,name:location.name,timezone:location.timezone,currency:"USD",locale:"en-US"},
    servicePeriods:[{id:"pilot-service",name:"Pilot service",start:"16:00",end:"23:00",enabled:true}],
    diningAreas:areaIds.map(id=>({id,name:areaNames.get(id),enabled:true})),
    tables:operationalTables.map(table=>({id:table.id,name:table.name,areaId:table.sectionId,minCovers:1,maxCovers:table.seats})),
    roles:[{id:"manager",name:"Manager",enabled:true},{id:"host",name:"Host",enabled:true},{id:"server",name:"Server",enabled:true},{id:"kitchen",name:"Kitchen",enabled:true}],
    targets:{targetTurnMinutes:90},
    integrationAssignments:[{id:"manual-pilot",mode:"manual",writeBackEnabled:false}],
    pilot:{enabled:true,mode:"PILOT",actualRestaurantDataConfirmed:true,confirmedBy:"V100.3.41 test verifier",confirmedAt:new Date().toISOString(),confirmationSource:"Isolated seed fixture certification",writeBackEnabled:false,autonomousProductionChanges:false}
  };
  const saved=await request("/api/configuration/restaurant",{method:"PUT",token,idempotencyKey:"v341-save-verified",body:configuration});
  check("Admin can persist a fully attested configuration",saved.status===200&&saved.payload.configured===true&&saved.payload.validation.valid===true);
  check("Pilot safety locks remain forced off",saved.payload.configuration?.pilot?.writeBackEnabled===false&&saved.payload.configuration?.pilot?.autonomousProductionChanges===false);

  const assessed=await request("/api/configuration/pilot-certification/assess",{token});
  check("Attested location matches operational truth",assessed.payload.checks.locationMatchesOperationalTruth===true);
  check("Attested table map matches operational truth",assessed.payload.checks.tableMapMatchesOperationalTruth===true&&assessed.payload.counts.tables===operationalTables.length);
  check("Complete verified configuration becomes certifiable",assessed.status===200&&assessed.payload.certifiable===true&&assessed.payload.blocking.length===0);

  const certified=await request("/api/configuration/pilot-certification/certify",{method:"POST",token,idempotencyKey:"v341-certify",body:{}});
  check("Admin can certify current verified restaurant truth",certified.status===200&&certified.payload.status==="CERTIFIED");
  const current=await request("/api/configuration/pilot-certification",{token});
  check("Current certification is reported as current",current.status===200&&current.payload.status==="CERTIFIED_CURRENT"&&current.payload.current===true);

  configuration.targets.targetTurnMinutes=95;
  const changed=await request("/api/configuration/restaurant",{method:"PUT",token,idempotencyKey:"v341-save-change",body:configuration});
  check("A later configuration change is saved with a new timestamp",changed.status===200&&changed.payload.configuration.updatedAt!==certified.payload.configurationUpdatedAt);
  const staleCertification=await request("/api/configuration/pilot-certification",{token});
  check("Configuration change requires recertification",staleCertification.status===200&&staleCertification.payload.status==="RECERTIFICATION_REQUIRED"&&staleCertification.payload.current===false);

  check("No live database path was used",databasePath.startsWith(os.tmpdir())&&databasePath!==path.join(root,"database/data/blue-current.json"));
  check("No release database payload exists",!fs.existsSync(path.join(root,"database/data/V100.3.41.json")));
  console.log(`V100.3.41 pilot configuration truth gate ${passed}/${total}`);
  if(passed!==total) process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  await stopServer().catch(()=>{});
  fs.rmSync(tempRoot,{recursive:true,force:true});
});
