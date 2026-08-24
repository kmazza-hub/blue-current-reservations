"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),kit=__dirname;
const dst=path.join(root,"client","js","floor-reservations-v62.0.js");
if(!fs.existsSync(dst))throw new Error("V100.2.49 requires the current Blue Current repo with client/js/floor-reservations-v62.0.js");
const current=fs.readFileSync(dst,"utf8");
if(current.includes('bc:host-guest-seated')){console.log("V100.2.49 already applied.");process.exit(0);}
if(!current.includes('guestRegistryStorageKey="bcHostGuestRegistryV100_2_43"'))throw new Error("V100.2.49 requires the current Guest Workspace / Recognition lifecycle first.");
const src=path.join(kit,"patches","client","js","floor-reservations-v62.0.js");
fs.copyFileSync(dst,dst+".v100.2.49.bak");
fs.copyFileSync(src,dst);
const testSrc=path.join(kit,"scripts","maintenance","test-v100.2.49-seated-guest-handoff.js");
const testDst=path.join(root,"scripts","maintenance","test-v100.2.49-seated-guest-handoff.js");
fs.mkdirSync(path.dirname(testDst),{recursive:true});fs.copyFileSync(testSrc,testDst);
console.log(JSON.stringify({ok:true,version:"100.2.49",wave:"Seated Guest Handoff",fixes:["seated parties leave the active waitlist immediately","guest record is preserved in Guests","waitlist counters decrement once","seated count advances once","publishes a downstream host-to-service seating event","floor geometry and V100.2.48 readability remain untouched"]},null,2));
