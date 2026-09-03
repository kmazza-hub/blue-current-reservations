"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const files=[
  ["server/services/actionListService.js","25e082cf3638158d738b66baca5124ff986d0d91ae67e93331ce9b2f4347c84a","00c33b110ea6067e27a4104ac9714b96491cfa1897db2aba8ee360fd555d9577"],
  ["server/api/router.js","3f892730fc36625df467b74a5cee5f2b0f734f051cb43dd5c923322602840a1b","823cc822eb9bcf4c8c1bc3f713404a35f901fb675a82525eeb3782f0c6102805"],
  ["client/js/cloud/cloudApi.js","c56d2a639b7435fdf52434123ebd93aeb362f8bf06f733d3478c4c89d570e337","167f92a395235ea7a4cbfde92de2e96cb81105244b57226944adc659d9235d1f"],
  ["client/js/floor-reservations-v62.0.js","526d152c4f0010b449760937119eeb13cea5a93fdbbad1dea10e1b7f3226862b","0d0b79a6d941aca4e7c0a4cdd1831e13b3d8a40ead9febf26fdcf6d7844e2c07"]
];
const sha=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const states=files.map(([rel,before,after])=>{const dst=path.join(process.cwd(),rel);if(!fs.existsSync(dst))throw new Error(`Missing ${rel}`);const current=sha(dst);if(current!==before&&current!==after)throw new Error(`Refusing unexpected ${rel} SHA256: ${current}`);return{rel,before,after,dst,current};});
if(states.every(x=>x.current===x.after)){console.log("V100.3.0 already applied.");process.exit(0);}
if(states.some(x=>x.current===x.after))throw new Error("Refusing partially applied V100.3.0. Restore a consistent V100.2.99 baseline or finish the existing installation first.");
for(const item of states){const src=path.join(__dirname,"patches",item.rel);if(!fs.existsSync(src)||sha(src)!==item.after)throw new Error(`Invalid packaged replacement for ${item.rel}`);}
for(const item of states)fs.copyFileSync(path.join(__dirname,"patches",item.rel),item.dst);
console.log("Applied V100.3.0 — Service → Manager Exception Visibility Integrity.");
