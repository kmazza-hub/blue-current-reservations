"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd();
const sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const entries=[{"rel": "client/index.html", "source": "bf5c8258a97c936b608208433fb3483684570375a56998d21f39b5a1b019117c", "target": "ed43c965c75dc5ad6c84c86e8c1b192efc9247a75f96380d54789b29813e913e"}, {"rel": "client/js/interaction-feedback-v64.0.js", "source": "67c434cdae31ef9538155ce722b98cae55d0fe7f95d640fecfc73d196c44032c", "target": "cf0125d775823ff29bb542b849a62409d2f4ca16cf78a6328c6c05c2a386228a"}, {"rel": "client/js/empty-recovery-v65.0.js", "source": "0ff252f811fc98a3513daf2a685167cc57737ef685e0da1fd70fded85be5be89", "target": "9d7ba8b805bb5e52a8e67c5023c89dd44e84949867515b21948cb7ebb6e9544a"}];
for(const e of entries){const dst=path.join(root,e.rel),src=path.join(__dirname,"patches",e.rel);if(!fs.existsSync(dst))throw new Error(`Missing ${e.rel}`);const h=sha(dst);if(h!==e.source&&h!==e.target)throw new Error(`Refusing unexpected ${e.rel} SHA256: ${h}`);if(h===e.source)fs.copyFileSync(src,dst);}
const addRel="client/js/network-connectivity-truth-v100.2.85.js",addDst=path.join(root,addRel),addSrc=path.join(__dirname,"patches",addRel);fs.mkdirSync(path.dirname(addDst),{recursive:true});fs.copyFileSync(addSrc,addDst);
console.log("Applied V100.2.85 — Network Connectivity Truth Foundation.");
