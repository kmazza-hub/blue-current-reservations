"use strict";
const fs=require("fs"),os=require("os"),path=require("path"),{spawn}=require("child_process"),Boundary=require("../../server/services/productionBoundaryService");
const root=path.resolve(__dirname,"../.."),temp=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v345-")),db=path.join(temp,"db.json"),port=21700+Math.floor(Math.random()*500),origin=`http://127.0.0.1:${port}`;
fs.copyFileSync(path.join(root,"database/seed/seed.json"),db);let server=null,passed=0,total=0;
function check(name,value){total+=1;if(value){passed+=1;console.log(`PASS ${total}: ${name}`);}else{console.error(`FAIL ${total}: ${name}`);process.exitCode=1;}}
const fake=origin=>({headers:{origin},socket:{remoteAddress:"127.0.0.1"}}),pause=ms=>new Promise(r=>setTimeout(r,ms));
async function start(){const log=fs.openSync(path.join(temp,"server.log"),"a");server=spawn(process.execPath,[path.join(root,"server/server.js")],{cwd:root,env:{...process.env,BLUE_CURRENT_ENV:"development",BLUE_CURRENT_DB:db,PORT:String(port)},stdio:["ignore",log,log]});for(let i=0;i<100;i+=1){try{if((await fetch(`${origin}/api/health`)).ok)return true;}catch(_){}await pause(100);}return false;}
async function stop(){if(server&&server.exitCode===null){server.kill();await Promise.race([new Promise(r=>server.once("exit",r)),pause(3000)]);}}
(async()=>{
  const oldMode=process.env.BLUE_CURRENT_ENV,oldOrigins=process.env.BLUE_CURRENT_ALLOWED_ORIGINS;
  process.env.BLUE_CURRENT_ENV="development";process.env.BLUE_CURRENT_ALLOWED_ORIGINS="";let boundary=new Boundary();
  check("Development accepts 192.168 LAN origin",boundary.corsOrigin(fake("http://192.168.1.25:8787"))==="http://192.168.1.25:8787");
  check("Development accepts 10.x LAN origin",boundary.corsOrigin(fake("http://10.0.0.9:8787"))==="http://10.0.0.9:8787");
  check("Development accepts 172.16-31 LAN origin",boundary.corsOrigin(fake("http://172.20.0.5:8787"))==="http://172.20.0.5:8787");
  check("Development rejects public unlisted origins",boundary.corsOrigin(fake("http://203.0.113.5:8787"))===false);
  process.env.BLUE_CURRENT_ENV="production";process.env.BLUE_CURRENT_ALLOWED_ORIGINS="https://pilot.bluecurrentco.com";boundary=new Boundary();
  check("Production still rejects private LAN origin",boundary.corsOrigin(fake("http://192.168.1.25:8787"))===false);
  if(oldMode===undefined)delete process.env.BLUE_CURRENT_ENV;else process.env.BLUE_CURRENT_ENV=oldMode;if(oldOrigins===undefined)delete process.env.BLUE_CURRENT_ALLOWED_ORIGINS;else process.env.BLUE_CURRENT_ALLOWED_ORIGINS=oldOrigins;
  check("Isolated development server starts",await start());
  const response=await fetch(`${origin}/api/auth/login`,{method:"POST",headers:{Origin:"http://192.168.1.25:8787","Content-Type":"application/json"},body:JSON.stringify({email:"keith@bluecurrent.demo",password:"BlueCurrent23!"})});
  check("LAN-origin mutation reaches authentication",response.status===200);
  check("LAN-origin response exposes matching CORS origin",response.headers.get("access-control-allow-origin")==="http://192.168.1.25:8787");
  const pkg=require(path.join(root,"package.json"));check("Runtime identifies V100.3.45",pkg.version==="100.3.45");
  check("One-command LAN launcher is registered",pkg.scripts?.["pilot:lan"]==="node scripts/pilot-lan.js"&&fs.existsSync(path.join(root,"scripts/pilot-lan.js")));
  check("No release database payload exists",!fs.existsSync(path.join(root,"database/data/V100.3.45.json")));
  console.log(`V100.3.45 iPad LAN acceptance launch ${passed}/${total}`);if(passed!==total)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await stop();fs.rmSync(temp,{recursive:true,force:true});});
