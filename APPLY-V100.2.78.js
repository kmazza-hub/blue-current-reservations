"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),pkg=__dirname;
const hash=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const plan=[
  {
    rel:"server/services/timeClockService.js",
    expected:["7fb98a6fb84b53dfb24ceac015baebf5073a3ace750a3b2378f8064a98723a94"],
    target:"48ecb399c5c3d7ca2f3206a79883332e9c27f08ca742d14ccd5bcd88b9ad8006"
  },
  {
    rel:"scripts/maintenance/test-v100.2.76-timeclock-truth-foundation.js",
    expected:["6695f9f7fd85e0e7ed337bd2b2c7d74d8bf6bd45bc73d8cf56be90039194637a"],
    target:"cee634f1c6978fd3cbadabfd184edb1dc1244905ed95942622e23851f4a29b2e"
  }
];
for(const item of plan){
  const dest=path.join(root,item.rel),source=path.join(pkg,"patches",item.rel);
  if(!fs.existsSync(dest))throw new Error(`V100.2.78 requires current baseline: missing ${item.rel}`);
  if(!fs.existsSync(source))throw new Error(`V100.2.78 package incomplete: missing patch ${item.rel}`);
  const current=hash(dest);
  if(current!==item.target&&!item.expected.includes(current))throw new Error(`V100.2.78 hash guard refused ${item.rel}; current=${current}`);
}
for(const item of plan){
  const dest=path.join(root,item.rel),source=path.join(pkg,"patches",item.rel);
  if(hash(dest)!==item.target)fs.copyFileSync(source,dest);
}
const testRel="scripts/maintenance/test-v100.2.78-timeclock-identity-integrity.js";
const testSrc=path.join(pkg,"patches",testRel),testDest=path.join(root,testRel);
fs.mkdirSync(path.dirname(testDest),{recursive:true});fs.copyFileSync(testSrc,testDest);
console.log(JSON.stringify({ok:true,version:"100.2.78",wave:"Time Clock Identity Integrity",architecture:"narrow server-side integrity hardening",runtimeApplicationChanges:1,serviceSha256:hash(path.join(root,"server/services/timeClockService.js")),test:testRel,testSha256:hash(testDest)},null,2));
