"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),manager=require(path.join(root,"server/persistence/runtimeBackupManager")),pkg=require(path.join(root,"package.json"));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"bc-render-marker-")),databasePath=path.join(temp,"blue-current.json"),markerPath=manager.runtimeMarkerPath(databasePath);
fs.writeFileSync(databasePath,"{}","utf8");
let passed=0;const check=(name,ok)=>{assert.ok(ok,name);passed+=1;console.log(`PASS: ${name}`);};
try{
  fs.writeFileSync(markerPath,JSON.stringify({version:1,pid:4242,databasePath}),"utf8");
  const legacy=manager.inspectRuntimeActivity(databasePath,{instanceId:"render-new",processProbe:()=>true});
  check("A legacy marker from a stopped Render container is stale",!legacy.active&&legacy.reason==="legacy-instance-marker");
  fs.writeFileSync(markerPath,JSON.stringify({version:2,pid:4242,instanceId:"render-old",databasePath}),"utf8");
  const replaced=manager.inspectRuntimeActivity(databasePath,{instanceId:"render-new",processProbe:()=>true});
  check("A marker owned by a previous Render instance is stale",!replaced.active&&replaced.reason==="stale-instance-marker");
  fs.writeFileSync(markerPath,JSON.stringify({version:2,pid:4242,instanceId:"render-current",databasePath}),"utf8");
  const current=manager.inspectRuntimeActivity(databasePath,{instanceId:"render-current",processProbe:()=>true});
  check("The current Render instance remains protected from a second writer",current.active&&current.reason==="runtime-active");
  fs.writeFileSync(markerPath,JSON.stringify({version:1,pid:4242,databasePath}),"utf8");
  const local=manager.inspectRuntimeActivity(databasePath,{instanceId:"",processProbe:()=>true});
  check("Local runtime PID ownership remains protected",local.active&&local.reason==="runtime-active");
  manager.claimRuntimeActivity(databasePath,{instanceId:"render-new",processProbe:()=>false});
  const claimed=JSON.parse(fs.readFileSync(markerPath,"utf8"));
  check("New hosted ownership records the unique Render instance",claimed.version===2&&claimed.instanceId==="render-new"&&claimed.pid===process.pid);
  check("Build retains V100.3.73 or later",["100.3.73","100.3.74","100.3.75","100.3.76"].includes(pkg.version));
  console.log(`V100.3.73 Render runtime marker continuity ${passed}/${passed}`);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
