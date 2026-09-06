"use strict";

const fs=require("fs");
const os=require("os");
const path=require("path");
const {spawn}=require("child_process");

const root=path.resolve(__dirname,"../..");
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),"blue-current-v342-"));
const databasePath=path.join(tempRoot,"persistent","blue-current.json");
const serverLogPath=path.join(tempRoot,"server.log");
const port=21000+Math.floor(Math.random()*600);
const origin=`http://127.0.0.1:${port}`;
const publicUrl="https://pilot.bluecurrentco.com";
let server=null,passed=0,total=0;

fs.mkdirSync(path.dirname(databasePath),{recursive:true});
fs.copyFileSync(path.join(root,"database/seed/seed.json"),databasePath);

function check(name,condition){total+=1;if(condition){passed+=1;console.log(`PASS ${total}: ${name}`);}else{console.error(`FAIL ${total}: ${name}`);process.exitCode=1;}}
const pause=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));

function environment(overrides={}){
  return {
    ...process.env,
    BLUE_CURRENT_ENV:"production",
    BLUE_CURRENT_PUBLIC_URL:publicUrl,
    BLUE_CURRENT_ALLOWED_ORIGINS:publicUrl,
    BLUE_CURRENT_DB:databasePath,
    BLUE_CURRENT_PERSISTENCE_DRIVER:"json",
    PORT:String(port),
    ...overrides
  };
}

async function startServer(env=environment()){
  const log=fs.openSync(serverLogPath,"a");
  server=spawn(process.execPath,[path.join(root,"server/server.js")],{cwd:root,env,stdio:["ignore",log,log]});
  for(let attempt=0;attempt<100;attempt+=1){
    if(server.exitCode!==null) return false;
    try{if((await fetch(`${origin}/api/health`)).ok)return true;}catch(_){}
    await pause(100);
  }
  return false;
}

async function stopServer(){
  if(!server||server.exitCode!==null)return;
  server.kill();
  await Promise.race([new Promise(resolve=>server.once("exit",resolve)),pause(3000)]);
  server=null;
}

async function request(pathname,{method="GET",token=null,body,requestOrigin=publicUrl}={}){
  const headers={Origin:requestOrigin};
  if(token)headers.Authorization=`Bearer ${token}`;
  if(body!==undefined)headers["Content-Type"]="application/json";
  const response=await fetch(`${origin}${pathname}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  let payload=null;try{payload=await response.json();}catch(_){}
  return {status:response.status,headers:response.headers,payload};
}

async function login(){return request("/api/auth/login",{method:"POST",body:{email:"keith@bluecurrent.demo",password:"BlueCurrent23!"}});}

(async()=>{
  const ProductionConfigurationService=require(path.join(root,"server/services/productionConfigurationService"));
  const mockDatabase={read:async()=>({users:[],liveConnectors:[],liveConnectorAuthBindings:{}})};
  const evaluate=overrides=>new ProductionConfigurationService({root,databasePath:overrides.databasePath??databasePath,port,environment:environment(overrides.env||{})}).validate(mockDatabase);

  const missingPublic=await evaluate({env:{BLUE_CURRENT_PUBLIC_URL:""}});
  check("Production fails closed without a public application URL",missingPublic.ready===false&&missingPublic.checks.some(item=>item.id==="production-public-url"&&!item.ok));
  const insecurePublic=await evaluate({env:{BLUE_CURRENT_PUBLIC_URL:"http://pilot.bluecurrentco.com",BLUE_CURRENT_ALLOWED_ORIGINS:"http://pilot.bluecurrentco.com"}});
  check("Production rejects a non-HTTPS public URL",insecurePublic.ready===false&&insecurePublic.checks.some(item=>item.id==="production-public-url"&&!item.ok));
  const mismatchedOrigin=await evaluate({env:{BLUE_CURRENT_ALLOWED_ORIGINS:"https://bluecurrentco.com"}});
  check("Production rejects a public URL missing from CORS allowlist",mismatchedOrigin.ready===false&&mismatchedOrigin.checks.some(item=>item.id==="production-public-url-allowed"&&!item.ok));
  const relativeDatabase=await evaluate({databasePath:"database/data/blue-current.json"});
  check("Production rejects a relative database path",relativeDatabase.ready===false&&relativeDatabase.checks.some(item=>item.id==="production-database-absolute"&&!item.ok));
  const repositoryDatabase=await evaluate({databasePath:path.join(root,"database/data/hosted-test.json")});
  check("Production rejects repository-local persistent data",repositoryDatabase.ready===false&&repositoryDatabase.checks.some(item=>item.id==="production-database-outside-repository"&&!item.ok));
  const valid=await evaluate({});
  check("Stable hosted-pilot identity and storage pass hard configuration gates",valid.ready===true&&valid.publicUrl===publicUrl&&valid.errors===0);

  check("Production server starts with stable identity and persistent storage",await startServer());
  const authenticated=await login();
  check("Hosted pilot accepts login from the exact public origin",authenticated.status===200&&Boolean(authenticated.payload.token)&&authenticated.headers.get("access-control-allow-origin")===publicUrl);
  const token=authenticated.payload.token;
  const readiness=await request("/api/system/deployment-readiness",{token});
  check("Admin readiness reports the stable public URL",readiness.status===200&&readiness.payload.ready===true&&readiness.payload.publicUrl===publicUrl);
  check("Admin readiness confirms absolute external persistence",readiness.payload.checks.some(item=>item.id==="production-database-absolute"&&item.ok)&&readiness.payload.checks.some(item=>item.id==="production-database-outside-repository"&&item.ok));
  const rejectedOrigin=await request("/api/health",{requestOrigin:"https://temporary.trycloudflare.com"});
  check("Production rejects temporary tunnel browser origins",rejectedOrigin.status===403&&rejectedOrigin.payload.code==="ORIGIN_NOT_ALLOWED");
  const health=await request("/api/health");
  check("Hosted health response carries hardened browser headers",health.status===200&&health.headers.get("x-content-type-options")==="nosniff"&&health.headers.get("x-frame-options")==="DENY");

  await stopServer();
  check("Graceful shutdown creates a persistent verified backup",fs.existsSync(`${databasePath}.bak`)&&fs.existsSync(`${databasePath}.bak.meta.json`));
  check("Production restarts from the same persistent database",await startServer());
  const resumed=await request("/api/auth/me",{token});
  check("Durable authenticated session survives restart",resumed.status===200&&Boolean(resumed.payload.user));

  check("Test storage is isolated from the live database",databasePath.startsWith(os.tmpdir())&&databasePath!==path.join(root,"database/data/blue-current.json"));
  check("No release database payload exists",!fs.existsSync(path.join(root,"database/data/V100.3.42.json")));
  console.log(`V100.3.42 hosted pilot environment gate ${passed}/${total}`);
  if(passed!==total)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  await stopServer().catch(()=>{});
  fs.rmSync(tempRoot,{recursive:true,force:true});
});
