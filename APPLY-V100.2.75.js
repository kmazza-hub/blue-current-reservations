"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),pkg=__dirname;
const required=[
 "server/services/schedulingService.js",
 "client/js/scheduling-truth-v100.2.73.js",
 "client/js/staff-role-coverage-v100.2.65.js",
 "client/js/staff-attendance-v100.2.66.js"
];
for(const rel of required){if(!fs.existsSync(path.join(root,rel)))throw new Error(`V100.2.75 requires current Scheduling/Staffing baseline: missing ${rel}`);}
const target="scripts/maintenance/test-v100.2.75-scheduling-rush-certification.js";
const source=path.join(pkg,"patches",target),dest=path.join(root,target);
fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);
const hash=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
console.log(JSON.stringify({ok:true,version:"100.2.75",wave:"Scheduling Rush-Condition Certification",architecture:"certification-only; zero runtime application changes",test:target,testSha256:hash(dest),protectedRuntime:"unchanged"},null,2));
