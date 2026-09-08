"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const DatabaseService=require("../../server/services/databaseService");
const root=path.resolve(__dirname,"../..");

(async()=>{
  // Undefined module export guard across all maintained app copies.
  for(const rel of ["client/js/app-v15.1.3.js","client/app-v15.1.3.js","app-v15.1.3.js"]){
    const text=fs.readFileSync(path.join(root,rel),"utf8");
    const declared=new Set([...text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*Module)\b/g)].map(m=>m[1]));
    const refs=new Set([...text.matchAll(/:\s*([A-Za-z_$][\w$]*Module)\b/g)].map(m=>m[1]));
    assert.deepEqual([...refs].filter(x=>!declared.has(x)).sort(),[],`${rel} has undefined module export`);
  }

  // Executive workflow load must handle fetch failure instead of producing an unhandled rejection.
  const workflow=fs.readFileSync(path.join(root,"client/js/modules/executiveWorkflowComposerCenter.js"),"utf8");
  assert.ok(/async function load\(\)\{try\{/.test(workflow),"Executive Workflow Composer load is not guarded");
  assert.ok(workflow.includes("window.addEventListener?.('online',load)"),"Executive Workflow Composer does not retry when connection returns");

  const exec=fs.readFileSync(path.join(root,"client/js/modules/executiveCommandCenter.js"),"utf8");
  assert.ok(/async function load\(\)\{if\(!api\.token\)return;try\{/.test(exec),"Executive Command load is not guarded");

  // OneDrive/Dropbox/Google Drive paths should skip the long atomic-rename retry loop.
  const db=new DatabaseService("C:\\Users\\test\\OneDrive\\Desktop\\blue-current.json",{maxWriteAttempts:7,logger:{warn:()=>{},error:()=>{}}});
  assert.equal(db._isCloudSyncedPath(),true);
  const normal=new DatabaseService("C:\\BlueCurrent\\blue-current.json");
  assert.equal(normal._isCloudSyncedPath(),false);

  console.log(JSON.stringify({
    ok:true,version:"46.55.2",undefinedModuleExports:0,
    executiveWorkflowGuarded:true,executiveCommandGuarded:true,
    cloudSyncedDatabaseFastFallback:true
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
