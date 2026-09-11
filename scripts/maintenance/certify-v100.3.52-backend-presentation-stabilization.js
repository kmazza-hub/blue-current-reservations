"use strict";
const fs=require("fs"),path=require("path"),{spawnSync}=require("child_process");
const root=path.resolve(__dirname,"../.."),maintenance=__dirname,release="100.3.52";
const parts=name=>{const match=name.match(/^test-v100\.3\.(\d+(?:\.\d+)*)-/);return match?match[1].split(".").map(Number):null;};
const compare=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i+=1){const difference=(a[i]||0)-(b[i]||0);if(difference)return difference;}return 0;};
const tests=fs.readdirSync(maintenance).filter(name=>parts(name)).sort((a,b)=>compare(parts(a),parts(b))||a.localeCompare(b)).filter(name=>compare(parts(name),[10,3])>=0&&compare(parts(name),[52])<=0);
const gates=[{name:"Project validation",command:process.platform==="win32"?"npm.cmd":"npm",args:["run","check"]},...tests.map(name=>({name,command:process.execPath,args:[path.join(maintenance,name)]}))];
if(process.argv.includes("--list")){console.log(JSON.stringify({release,gates:gates.map(gate=>gate.name)},null,2));process.exit(0);}
const startedAt=new Date(),results=[];
for(const gate of gates){
  const start=Date.now();console.log(`\n=== ${gate.name} ===`);
  const result=spawnSync(gate.command,gate.args,{cwd:root,stdio:"inherit",env:process.env,shell:process.platform==="win32"&&/\.cmd$/i.test(gate.command)});
  const gatePassed=result.status===0&&!result.error;
  results.push({name:gate.name,passed:gatePassed,exitCode:result.status,durationMs:Date.now()-start});
  if(!gatePassed){console.error(`PILOT CERTIFICATION BLOCKED: ${gate.name}`);process.exit(1);}
}
console.log("\n=== BLUE CURRENT BACKEND PRESENTATION STABILIZATION ===");
console.log(JSON.stringify({release,status:"CONTROLLED_DEMONSTRATION_READY",authenticationGuarded:true,wildcardLocationHidden:true,workspaceRoutingStabilized:true,internalDiagnosticsRedacted:true,physicalIpadCertificationPerformed:false,gatesPassed:results.length,gatesTotal:results.length,durationMs:Date.now()-startedAt},null,2));

