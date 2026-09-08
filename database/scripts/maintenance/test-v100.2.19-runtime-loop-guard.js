"use strict";
const fs=require("fs"), path=require("path");
const root=process.cwd();
function walk(dir,out=[]){ if(!fs.existsSync(dir)) return out; for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,out); else if(e.isFile()&&e.name.endsWith('.js')) out.push(p);} return out; }
const files=walk(path.join(root,'client','js'));
const sources=files.map(f=>({f,s:fs.readFileSync(f,'utf8')}));
const hit=sources.find(x=>x.s.includes('__bcRuntimeLoopGuardV100_2_19'));
const checks=[]; const check=(name,ok)=>checks.push({name,ok:!!ok});
check('runtime loop guard installed',hit);
if(hit){
 const s=hit.s;
 check('V100.2.18 unified seating preserved',s.includes('__bcUnifiedSeatingFlowV100_2_18'));
 check('V100.2.17 priority queue preserved',s.includes('__bcArrivalPriorityQueueV100_2_17'));
 check('sort has alreadySorted guard',s.includes('alreadySorted'));
 check('sort returns without DOM churn when stable',s.includes('if (alreadySorted) return false'));
 check('observer excludes characterData',!s.includes('observer.observe(hostWorkspace, {childList:true,subtree:true,characterData:true})'));
 check('observer structural mutations only',s.includes("const observerOptions = { childList:true, subtree:true }"));
 check('observer disconnects during maintenance',s.includes('observer.disconnect()'));
 check('observer reconnects after maintenance',s.includes('observer.observe(hostWorkspace, observerOptions)'));
 check('no rollback marker',!s.includes('ROLLBACK V100.2.18'));
}
const failed=checks.filter(x=>!x.ok); console.log(JSON.stringify({ok:failed.length===0,version:'100.2.19',checks:checks.map(x=>x.name),failed:failed.map(x=>x.name)},null,2)); if(failed.length) process.exit(1);
