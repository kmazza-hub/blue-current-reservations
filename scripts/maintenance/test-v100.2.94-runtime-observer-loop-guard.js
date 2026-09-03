"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const targets=[
  ["Kitchen priority","client/js/kitchen-priority-v100.2.62.js","root"],
  ["Kitchen → Service handoff","client/js/kitchen-service-handoff-v100.2.61.js","overlay"],
  ["Manager ownership","client/js/manager-action-ownership-v100.2.69.js","view"]
];
const checks=[];
for(const [label,file,target] of targets){
  const source=read(file),start=source.indexOf("function decorate(){"),end=source.indexOf("\nfunction ",start+1),body=source.slice(start,end<0?source.length:end);
  checks.push(
    [`${label} decorator exists`,start>=0],
    [`${label} pauses its observer before DOM writes`,/decorating=true;observer\?\.disconnect\(\);/.test(body)],
    [`${label} uses guaranteed observer recovery`,/try\{[\s\S]*\}finally\{/.test(body)],
    [`${label} resumes the same observation boundary`,new RegExp(`observer\\?\\.observe\\(${target},\\{childList:true,subtree:true\\}\\)`).test(body)],
    [`${label} clears its render lock after re-observing`,/observer\?\.observe\([\s\S]*decorating=false;/.test(body)]
  );
}
const kitchenPriority=read("client/js/kitchen-priority-v100.2.62.js");
checks.push(
  ["Kitchen runtime still decorates the existing truth surface",/bc-kt-row/.test(kitchenPriority)],
  ["Kitchen priority still schedules external mutations",/new MutationObserver\(\(\)=>\{if\(!decorating\)queueMicrotask\(decorate\);\}\)/.test(kitchenPriority)],
  ["No new polling was added by V100.2.94",targets.every(([,file])=>!read(file).includes("V100.2.94")||!read(file).includes("setInterval"))]
);
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.94 validation ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
