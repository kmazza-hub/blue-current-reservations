"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8"),expect=(value,message)=>{if(!value)throw new Error(message);};
const pkg=JSON.parse(read("package.json")),html=read("client/index.html"),manifest=JSON.parse(read("client/manifest.webmanifest")),readiness=read("client/js/pilot-readiness-evidence-v100.3.94.js");
function pngSize(file){const data=fs.readFileSync(path.join(root,file));expect(data.subarray(1,4).toString()==="PNG",`${file} must be PNG`);return [data.readUInt32BE(16),data.readUInt32BE(20)];}
expect(pkg.version==="100.3.95","package version must be 100.3.95");
expect(pkg.scripts["certify:pilot"]==="node scripts/maintenance/certify-v100.3.95-installed-app-identity.js","certify:pilot must target V100.3.95");
expect(/<title>Blue Current<\/title>/.test(html),"desktop shortcut title must stay concise");
expect(html.includes('manifest.webmanifest?v=100.3.95'),"manifest must be cache-busted");
expect(html.includes('blue-current-apple-touch-180.png?v=100.3.95'),"Apple touch icon must be current");
expect(manifest.name==="Blue Current Hospitality OS"&&manifest.short_name==="Blue Current","installed names must remain branded and concise");
expect(manifest.display==="standalone"&&manifest.start_url==="/"&&manifest.scope==="/","standalone launch contract must remain intact");
expect(manifest.launch_handler?.client_mode==="navigate-existing","desktop launches must reuse the installed app window when supported");
for(const [file,size] of [["blue-current-app-32.png",32],["blue-current-app-96.png",96],["blue-current-apple-touch-180.png",180],["blue-current-app-192.png",192],["blue-current-maskable-192.png",192],["blue-current-app-256.png",256],["blue-current-app-512.png",512],["blue-current-maskable-512.png",512]])expect(pngSize(`client/assets/${file}`).every(value=>value===size),`${file} must be ${size}x${size}`);
expect(manifest.icons.some(icon=>icon.purpose==="maskable"&&icon.sizes==="512x512"),"manifest must include a 512px maskable icon");
expect(fs.existsSync(path.join(root,"client/assets/blue-current-maskable-icon.svg")),"maskable source artwork must remain independently reproducible");
expect(!html.includes("navigator.serviceWorker.register"),"release must not claim unsupported offline behavior");
expect(/window\.BlueCurrentPilotReadinessEvidence=\{version:"100\.3\.94"/.test(readiness),"V100.3.94 readiness evidence must remain present");
new vm.Script(readiness,{filename:"pilot-readiness-evidence-v100.3.94.js"});
console.log("PASS V100.3.95 — installed app identity is concise, branded, mask-safe, and standalone-ready.");
