"use strict";
const fs=require("fs"),http=require("http"),path=require("path"),{spawn}=require("child_process");
const root=path.resolve(__dirname,".."),pkg=require(path.join(root,"package.json"));
const configuredPath=String(process.env.BLUE_CURRENT_DB||"");
const production=String(process.env.BLUE_CURRENT_ENV||process.env.NODE_ENV||"").toLowerCase()==="production";
const provisioning=String(process.env.BLUE_CURRENT_PROVISIONING_MODE||"").toLowerCase()==="true";
const instanceCount=Number(process.env.BLUE_CURRENT_INSTANCE_COUNT||1);
const port=Number(process.env.PORT||8787);
function fail(message){console.error(`[hosted-start] ${message}`);process.exit(1)}
if(!production)fail("Hosted start requires production mode.");
if(!configuredPath||!path.isAbsolute(configuredPath))fail("BLUE_CURRENT_DB must be an absolute path.");
if(instanceCount!==1)fail("Single-node JSON persistence requires BLUE_CURRENT_INSTANCE_COUNT=1.");
const databasePath=path.normalize(configuredPath);
if(fs.existsSync(databasePath)){
  let parsed;try{parsed=JSON.parse(fs.readFileSync(databasePath,"utf8"));}catch{fail("Configured database is not valid JSON.")}
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))fail("Configured database must contain one object.");
  const child=spawn(process.execPath,[path.join(root,"server/server.js")],{cwd:root,env:process.env,stdio:"inherit"});
  for(const signal of ["SIGINT","SIGTERM"]){process.once(signal,()=>child.kill(signal))}
  child.once("exit",code=>process.exit(code??1));
}else{
  if(!provisioning)fail(`Configured database does not exist: ${databasePath}`);
  const body=JSON.stringify({version:pkg.version,status:"PROVISIONING_REQUIRED",databaseReady:false,applicationExposed:false});
  const server=http.createServer((request,response)=>{
    if(request.url==="/api/health"){
      response.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});response.end(body);return;
    }
    response.writeHead(503,{"Content-Type":"application/json","Cache-Control":"no-store","Retry-After":"60"});
    response.end(JSON.stringify({status:"PROVISIONING_REQUIRED",message:"Blue Current is locked until the certified pilot database is provisioned."}));
  });
  server.listen(port,"0.0.0.0",()=>console.log(`[hosted-start] Provisioning gate active on port ${port}; application routes are locked.`));
  const shutdown=signal=>server.close(()=>{console.log(`[hosted-start] ${signal} provisioning gate shutdown complete.`);process.exit(0)});
  process.once("SIGINT",()=>shutdown("SIGINT"));process.once("SIGTERM",()=>shutdown("SIGTERM"));
}
