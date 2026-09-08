"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),rel="scripts/maintenance/test-v100.2.92-ipad-recovery-rush-certification.js";
const src=path.join(__dirname,rel),dst=path.join(root,rel);
const sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
fs.mkdirSync(path.dirname(dst),{recursive:true});
if(fs.existsSync(dst)&&sha(dst)===sha(src)){console.log("V100.2.92 already applied.");process.exit(0);}
fs.copyFileSync(src,dst);
console.log("Applied V100.2.92 — iPad Recovery Rush Certification (certification-only).");
