"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const files=[
  {rel:"client/index.html",before:"6ef6328a6118bf1d8dfebd03823ed4694e66e6835be17e7f2ef55ef92ad0e065",after:"8c271bf22527b189b06bf3c3f955e16140c121a81b1f8857a8157a7517863d3e"},
  {rel:"client/styles.css",before:"c33b62febce584646d7eee5d099968a811f5837f7e8b95e85db168aa270e89d6",after:"c7a72318b58355b777f6ef9aad70d5e0c1bcff3923ed7f01537b676eb70f5162"}
];
const sha=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
let changed=false;
for(const item of files){
  const dst=path.join(process.cwd(),item.rel),src=path.join(__dirname,"patches",item.rel);
  if(!fs.existsSync(dst))throw new Error(`Missing ${item.rel}`);
  const current=sha(dst);
  if(current!==item.before&&current!==item.after)throw new Error(`Refusing unexpected ${item.rel} SHA256: ${current}`);
  if(current===item.before){fs.copyFileSync(src,dst);changed=true;}
}
console.log(changed?"Applied V100.2.95 — iPad Safe Area + Keyboard Viewport Integrity.":"V100.2.95 already applied.");
