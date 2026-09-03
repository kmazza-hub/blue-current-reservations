"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const files=[
  {rel:"client/js/kitchen-priority-v100.2.62.js",before:"1f1a22a73dd60dca308c151cbca2e83262410f0e474c654a9fb550e2556111c4",after:"8c67d30e3e321eacb6eb1b668b2fe56cf549925a42ce1d9f5b732f045baceffc"},
  {rel:"client/js/kitchen-service-handoff-v100.2.61.js",before:"b365779fb743d52fd4b5f36c8cd0d7d698c72b1998e99dc58e48608dd8ab6ef5",after:"e272e61e4ead917322e9d7d391775b7c9645a11874e3f636a4e2ab6295ea3b55"},
  {rel:"client/js/manager-action-ownership-v100.2.69.js",before:"77e2081fe3c11819906fe560a4d1e31e53a00c575ab962faafb06a7c4b524f1a",after:"451832fc83b01759c7ef1192e1df279ab78337de729b10562c5c27131ab2e9cd"}
];
const sha=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
for(const item of files){
  const dst=path.join(process.cwd(),item.rel),src=path.join(__dirname,"patches",item.rel);
  if(!fs.existsSync(dst))throw new Error(`Missing ${item.rel}`);
  const current=sha(dst);
  if(current!==item.before&&current!==item.after)throw new Error(`Refusing unexpected ${item.rel} SHA256: ${current}`);
  if(current===item.before)fs.copyFileSync(src,dst);
}
console.log(files.every(item=>sha(path.join(process.cwd(),item.rel))===item.after)?"Applied V100.2.94 — Runtime Observer Loop Guard.":"V100.2.94 application failed.");
