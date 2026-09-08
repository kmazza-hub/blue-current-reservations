"use strict";
const fs=require("fs"),os=require("os"),path=require("path"),{spawn}=require("child_process");
const root=path.resolve(__dirname,".."),arg=name=>{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:null;},source=arg("--source"),publicUrl=arg("--public-url")||"https://app.bluecurrentco.com";
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));let child=null,temp=null;
function fail(message){throw new Error(message);}
async function stop(){if(!child||child.exitCode!==null)return;child.kill("SIGTERM");await Promise.race([new Promise(resolve=>child.once("exit",resolve)),pause(12000)]);if(child.exitCode===null)fail("Rehearsal server did not complete graceful shutdown.");child=null;}
async function start(databasePath,port,logPath){const log=fs.openSync(logPath,"a"),env={...process.env,BLUE_CURRENT_ENV:"production",NODE_ENV:"production",BLUE_CURRENT_PUBLIC_URL:publicUrl,BLUE_CURRENT_ALLOWED_ORIGINS:publicUrl,BLUE_CURRENT_PERSISTENCE_DRIVER:"json",BLUE_CURRENT_DB:databasePath,PORT:String(port)};child=spawn(process.execPath,[path.join(root,"server/server.js")],{cwd:root,env,stdio:["ignore",log,log]});for(let attempt=0;attempt<120;attempt+=1){if(child.exitCode!==null)fail(`Production-mode server exited during startup. Review ${logPath}.`);try{const response=await fetch(`http://127.0.0.1:${port}/api/health`);if(response.ok)return response.json();}catch{}await pause(100);}fail("Production-mode health check timed out.");}
function coreCounts(data){return Object.fromEntries(["organizations","locations","users","tables"].map(name=>[name,Array.isArray(data[name])?data[name].length:null]));}
(async()=>{
  if(!source)fail("--source is required; rehearsal never chooses a database implicitly.");
  const sourcePath=path.resolve(source);if(!fs.existsSync(sourcePath))fail("Selected rehearsal source does not exist.");
  const raw=await fs.promises.readFile(sourcePath,"utf8");let parsed;try{parsed=JSON.parse(raw);}catch{fail("Selected rehearsal source is not valid JSON.");}
  const before=coreCounts(parsed);if(Object.values(before).some(value=>value===null))fail("Selected rehearsal source is missing required core collections.");
  temp=await fs.promises.mkdtemp(path.join(os.tmpdir(),"blue-current-hosted-rehearsal-"));const databasePath=path.join(temp,"persistent","blue-current.json"),logPath=path.join(temp,"server.log"),port=22000+Math.floor(Math.random()*1000);await fs.promises.mkdir(path.dirname(databasePath),{recursive:true});await fs.promises.copyFile(sourcePath,databasePath);
  const firstHealth=await start(databasePath,port,logPath);await stop();
  const backupExists=fs.existsSync(`${databasePath}.bak`)&&fs.existsSync(`${databasePath}.bak.meta.json`);if(!backupExists)fail("Graceful shutdown did not produce a verified backup pair.");
  const secondHealth=await start(databasePath,port,logPath);await stop();
  const after=coreCounts(JSON.parse(await fs.promises.readFile(databasePath,"utf8"))),continuous=Object.keys(before).every(name=>before[name]===after[name]);if(!continuous)fail("Core restaurant record counts changed during rehearsal.");
  console.log(JSON.stringify({release:require("../package.json").version,status:"HOSTED_RESTART_REHEARSAL_PASSED",source:path.basename(sourcePath),publicUrl,productionMode:true,firstHealthVersion:firstHealth.version,secondHealthVersion:secondHealth.version,gracefulBackupVerified:backupExists,coreCountsBefore:before,coreCountsAfter:after,sourceMutated:false,externalDeploymentPerformed:false,dnsChanged:false},null,2));
})().catch(error=>{console.error(`Hosted rehearsal blocked: ${error.message}`);process.exitCode=1;}).finally(async()=>{await stop().catch(()=>{});if(temp)await fs.promises.rm(temp,{recursive:true,force:true}).catch(()=>{});});
