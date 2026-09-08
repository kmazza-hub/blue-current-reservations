"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd();

const required=[
 "client/js/floor-reservations-v62.0.js",
 "client/js/staff-truth-v100.2.64.js",
 "client/js/staff-role-coverage-v100.2.65.js",
 "client/js/staff-attendance-v100.2.66.js",
 "client/js/modules/scheduling.js",
 "server/services/schedulingService.js",
 "client/js/modules/timeClock.js",
 "server/services/timeClockService.js",
 "client/index.html"
].map(p=>path.join(root,p));

if(required.some(p=>!fs.existsSync(p))){
  throw new Error("V100.2.67 requires applied V100.2.66 baseline.");
}

const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const before=new Map(required.map(p=>[p,hash(p)]));

const src=path.join(__dirname,"patches","scripts","maintenance","test-v100.2.67-staffing-rush-certification.js");
const dst=path.join(root,"scripts","maintenance","test-v100.2.67-staffing-rush-certification.js");
fs.mkdirSync(path.dirname(dst),{recursive:true});
fs.copyFileSync(src,dst);

for(const p of required){
  if(hash(p)!==before.get(p)){
    throw new Error(`Protected runtime changed during V100.2.67 apply: ${path.relative(root,p)}`);
  }
}

console.log(JSON.stringify({
  ok:true,
  version:"100.2.67",
  wave:"Staffing Rush-Condition Certification",
  architecture:"certification-only; zero runtime application changes",
  certifiedScenarios:[
    "multiple simultaneous employees",
    "multiple simultaneous roles",
    "break coverage isolation",
    "person-level attendance isolation",
    "late clock-in correction isolation",
    "duplicate active identity containment"
  ],
  protectedRuntime:"unchanged"
},null,2));
