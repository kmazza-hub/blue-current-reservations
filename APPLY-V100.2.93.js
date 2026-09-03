"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),rel="client/styles.css",dst=path.join(root,rel),src=path.join(__dirname,"patches","client","styles.css");
const before="b85d3de0546d8663c21d8fc54d90495485e2e289d1e339c780340b4b74a865c7",after="c33b62febce584646d7eee5d099968a811f5837f7e8b95e85db168aa270e89d6",sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
if(!fs.existsSync(dst))throw new Error("Missing client/styles.css");
const current=sha(dst);
if(current!==before&&current!==after)throw new Error(`Refusing unexpected client/styles.css SHA256: ${current}`);
if(current===before)fs.copyFileSync(src,dst);
console.log(current===after?"V100.2.93 already applied.":"Applied V100.2.93 — iPad Touch Target Foundation.");
