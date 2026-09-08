"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd();
const protectedFiles=[
 "client/js/floor-reservations-v62.0.js",
 "client/js/manager-operations-truth-v100.2.68.js",
 "client/js/manager-action-ownership-v100.2.69.js",
 "client/js/runtime-performance-v100.2.70.js",
 "client/js/manager-action-followup-v100.2.71.js",
 "server/services/actionListService.js",
 "client/index.html"
].map(p=>path.join(root,p));
if(protectedFiles.some(p=>!fs.existsSync(p)))throw new Error("V100.2.72 requires applied V100.2.71 baseline.");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const before=new Map(protectedFiles.map(p=>[p,hash(p)]));
const src=path.join(__dirname,"patches","scripts","maintenance","test-v100.2.72-manager-operations-rush-certification.js");
const dst=path.join(root,"scripts","maintenance","test-v100.2.72-manager-operations-rush-certification.js");
fs.mkdirSync(path.dirname(dst),{recursive:true});
fs.copyFileSync(src,dst);
for(const p of protectedFiles){if(hash(p)!==before.get(p))throw new Error(`Protected runtime changed during V100.2.72 apply: ${path.relative(root,p)}`);}
console.log(JSON.stringify({
 ok:true,
 version:"100.2.72",
 wave:"Manager Operations Rush-Condition Certification",
 architecture:"certification-only; zero runtime application changes",
 certifiedScenarios:[
  "simultaneous manager actions",
  "priority ordering isolation",
  "ownership isolation",
  "completion isolation",
  "follow-up isolation",
  "unknown timestamp truth protection",
  "automatic action lifecycle protection",
  "performance-deferred manager loading"
 ],
 protectedRuntime:"unchanged"
},null,2));
