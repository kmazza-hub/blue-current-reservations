"use strict";

const fs=require("fs");
const path=require("path");
const {spawnSync}=require("child_process");

const root=path.resolve(__dirname,"../..");
const maintenance=__dirname;
const release="100.3.43";

function versionParts(filename){
  const match=filename.match(/^test-v100\.3\.(\d+(?:\.\d+)*)-/);
  return match?match[1].split(".").map(Number):null;
}

function compareVersions(left,right){
  const a=versionParts(left)||[],b=versionParts(right)||[];
  for(let index=0;index<Math.max(a.length,b.length);index+=1){
    const difference=(a[index]||0)-(b[index]||0);
    if(difference)return difference;
  }
  return left.localeCompare(right);
}

function compareParts(left,right){
  for(let index=0;index<Math.max(left.length,right.length);index+=1){
    const difference=(left[index]||0)-(right[index]||0);
    if(difference)return difference;
  }
  return 0;
}

const tests=fs.readdirSync(maintenance)
  .filter(filename=>versionParts(filename))
  .sort(compareVersions)
  .filter(filename=>compareParts(versionParts(filename),[10,3])>=0&&compareParts(versionParts(filename),[42])<=0);

const gates=[
  {name:"Project validation",command:process.platform==="win32"?"npm.cmd":"npm",args:["run","check"]},
  ...tests.map(filename=>({name:filename,command:process.execPath,args:[path.join(maintenance,filename)]}))
];

if(process.argv.includes("--list")){
  console.log(JSON.stringify({release,gates:gates.map(gate=>gate.name)},null,2));
  process.exit(0);
}

const startedAt=new Date();
const results=[];
for(const gate of gates){
  const gateStarted=Date.now();
  console.log(`\n=== ${gate.name} ===`);
  const result=spawnSync(gate.command,gate.args,{cwd:root,stdio:"inherit",env:process.env});
  const passed=result.status===0&&!result.error;
  results.push({name:gate.name,passed,exitCode:result.status,durationMs:Date.now()-gateStarted});
  if(!passed){
    console.error(`PILOT RELEASE CANDIDATE BLOCKED: ${gate.name}`);
    if(result.error)console.error(result.error.message);
    console.log(JSON.stringify({release,status:"BLOCKED",startedAt:startedAt.toISOString(),completedAt:new Date().toISOString(),results},null,2));
    process.exit(1);
  }
}

const completedAt=new Date();
const report={
  release,
  status:"PILOT_RELEASE_CANDIDATE_CERTIFIED",
  automaticDeployment:false,
  automaticPilotActivation:false,
  databasePayloadIncluded:false,
  startedAt:startedAt.toISOString(),
  completedAt:completedAt.toISOString(),
  durationMs:completedAt-startedAt,
  gatesPassed:results.length,
  gatesTotal:results.length,
  results
};
console.log("\n=== BLUE CURRENT PILOT RELEASE CANDIDATE ===");
console.log(JSON.stringify(report,null,2));
