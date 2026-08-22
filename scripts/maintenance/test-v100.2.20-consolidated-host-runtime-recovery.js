"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const root=process.cwd(), file=path.join(root,"client","js","app-v15.1.3.js");
const s=fs.readFileSync(file,"utf8");
const checks=[]; const add=(n,ok)=>checks.push({name:n,ok:!!ok});
add("V100.2.17 priority queue preserved",s.includes("__bcArrivalPriorityQueueV100_2_17"));
add("V100.2.20 recovery marker",s.includes("__bcHostRuntimeRecoveryV100_2_20"));
add("idempotent queue sort",s.includes("const changed = sorted.some"));
add("observer disconnects during maintenance",s.includes("observer.disconnect()"));
add("characterData observer removed from priority queue",!s.includes("observer.observe(hostWorkspace, {childList:true,subtree:true,characterData:true})"));
add("unified seating owner installed",s.includes("__bcUnifiedSeatingFlowV100_2_20"));
add("document capture seating controller",s.includes("document.addEventListener('click'"));
add("seat chooses table",s.includes("Choose a table for ${guestName}"));
add("seat confirmation exists",s.includes("Seat ${flow.guestName} at Table ${num}"));
add("reentrancy guard",s.includes("flow.handling"));
try{ new vm.Script(s); add("runtime JavaScript syntax",true);}catch(e){add("runtime JavaScript syntax",false); console.error(e.message);}
const failed=checks.filter(x=>!x.ok); console.log(JSON.stringify({ok:failed.length===0,version:"100.2.20",checks,failed:failed.map(x=>x.name)},null,2)); process.exit(failed.length?1:0);
