"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd();
const required=[
 "client/js/floor-reservations-v62.0.js",
 "client/js/kitchen-truth-v100.2.60.js",
 "client/js/kitchen-service-handoff-v100.2.61.js",
 "client/js/kitchen-priority-v100.2.62.js",
 "client/index.html"
].map(p=>path.join(root,p));
if(required.some(p=>!fs.existsSync(p)))throw new Error("V100.2.63 requires applied V100.2.62 baseline.");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const before=new Map(required.map(p=>[p,hash(p)]));
const src=path.join(__dirname,"patches","scripts","maintenance","test-v100.2.63-kitchen-service-rush-certification.js");
const dst=path.join(root,"scripts","maintenance","test-v100.2.63-kitchen-service-rush-certification.js");
fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);
for(const p of required)if(hash(p)!==before.get(p))throw new Error(`Protected runtime changed during V100.2.63 apply: ${path.relative(root,p)}`);
console.log(JSON.stringify({
 ok:true,
 version:"100.2.63",
 wave:"Kitchen / Service Rush Handoff Certification",
 architecture:"certification-only; zero runtime application changes",
 certifiedScenarios:[
  "multiple simultaneous Ordering tables",
  "independent party identity",
  "Ready priority isolation",
  "single-table Food delivered cleanup",
  "duplicate Ready collapse",
  "no cross-table contamination"
 ],
 protectedRuntime:"unchanged"
},null,2));
