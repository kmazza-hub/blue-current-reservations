"use strict";
const fs=require("fs"),path=require("path"),{spawnSync}=require("child_process");
const root=path.resolve(__dirname,"../.."),maintenance=__dirname,release="100.3.45";
const parts=name=>{const m=name.match(/^test-v100\.3\.(\d+(?:\.\d+)*)-/);return m?m[1].split(".").map(Number):null;};
const compare=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i+=1){const d=(a[i]||0)-(b[i]||0);if(d)return d;}return 0;};
const tests=fs.readdirSync(maintenance).filter(name=>parts(name)).sort((a,b)=>compare(parts(a),parts(b))||a.localeCompare(b)).filter(name=>compare(parts(name),[10,3])>=0&&compare(parts(name),[45])<=0);
const gates=[{name:"Project validation",command:process.platform==="win32"?"npm.cmd":"npm",args:["run","check"]},...tests.map(name=>({name,command:process.execPath,args:[path.join(maintenance,name)]}))];
if(process.argv.includes("--list")){console.log(JSON.stringify({release,gates:gates.map(x=>x.name)},null,2));process.exit(0);}
const startedAt=new Date(),results=[];
for(const gate of gates){const start=Date.now();console.log(`\n=== ${gate.name} ===`);const result=spawnSync(gate.command,gate.args,{cwd:root,stdio:"inherit",env:process.env});const passed=result.status===0&&!result.error;results.push({name:gate.name,passed,exitCode:result.status,durationMs:Date.now()-start});if(!passed){console.error(`PILOT RELEASE CANDIDATE BLOCKED: ${gate.name}`);process.exit(1);}}
const completedAt=new Date();console.log("\n=== BLUE CURRENT IPAD LAN ACCEPTANCE LAUNCH ===");console.log(JSON.stringify({release,status:"IPAD_LAN_ACCEPTANCE_LAUNCH_READY",automaticAcceptance:false,automaticDeployment:false,startedAt:startedAt.toISOString(),completedAt:completedAt.toISOString(),durationMs:completedAt-startedAt,gatesPassed:results.length,gatesTotal:results.length,results},null,2));
