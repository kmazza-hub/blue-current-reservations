"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
for(const rel of ["client/js/app-v15.1.3.js","client/app-v15.1.3.js","app-v15.1.3.js"]){
  const text=fs.readFileSync(path.join(root,rel),"utf8");
  const declared=new Set([...text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*Module)\b/g)].map(m=>m[1]));
  const refs=new Set([...text.matchAll(/:\s*([A-Za-z_$][\w$]*Module)\b/g)].map(m=>m[1]));
  const undefinedRefs=[...refs].filter(x=>!declared.has(x)).sort();
  assert.deepEqual(undefinedRefs,[],`${rel} undefined module export(s): ${undefinedRefs.join(", ")}`);
  assert.ok(text.includes("const marginIntelligenceCenterModule = startupRegistry.register("),`${rel} missing Margin Intelligence registration`);
  assert.ok(text.includes('marginIntelligence: marginIntelligenceCenterModule'),`${rel} missing Margin Intelligence export`);
}
const index=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
assert.ok(index.includes('id="marginIntelligenceCenter"'));
assert.ok(index.includes("marginIntelligenceEngine.js"));
assert.ok(index.includes("marginIntelligenceCenter.js"));
console.log(JSON.stringify({ok:true,version:"46.55.1",marginIntelligenceRegistered:true,undefinedModuleExports:0,appCopiesChecked:3},null,2));
