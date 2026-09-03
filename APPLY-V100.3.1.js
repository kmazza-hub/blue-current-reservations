"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const rel="server/services/actionListService.js";
const before="00c33b110ea6067e27a4104ac9714b96491cfa1897db2aba8ee360fd555d9577";
const after="0cc6d15431cbb625e48fdb1d49953e703b22b5386bd1d584e7a77e68593f623c";
const dst=path.join(process.cwd(),rel),src=path.join(__dirname,"patches",rel);
const sha=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
if(!fs.existsSync(dst))throw new Error(`Missing ${rel}`);
const current=sha(dst);
if(current!==before&&current!==after)throw new Error(`Refusing unexpected ${rel} SHA256: ${current}`);
if(current===before){if(!fs.existsSync(src)||sha(src)!==after)throw new Error(`Invalid packaged replacement for ${rel}`);fs.copyFileSync(src,dst);}
console.log(current===after?"V100.3.1 already applied.":"Applied V100.3.1 — Service → Manager Cross-Domain Certification.");
