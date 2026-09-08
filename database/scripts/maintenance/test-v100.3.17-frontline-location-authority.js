"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.resolve(__dirname,"../..");let passed=0;
function ok(name,value){if(!value)throw new Error(`FAIL: ${name}`);console.log(`PASS ${++passed}: ${name}`)}
const authority=fs.readFileSync(path.join(root,"client/js/frontline-location-authority-v100.3.17.js"),"utf8"),index=fs.readFileSync(path.join(root,"client/index.html"),"utf8"),runtime=fs.readFileSync(path.join(root,"client/js/runtime-performance-v100.2.70.js"),"utf8"),floor=fs.readFileSync(path.join(root,"client/js/floor-reservations-v62.0.js"),"utf8");
const moduleFiles=["staff-truth-v100.2.64.js","staff-role-coverage-v100.2.65.js","staff-attendance-v100.2.66.js","scheduling-truth-v100.2.73.js","timeclock-truth-v100.2.76.js"];
const store=new Map(),updates=[],events=[];let allowed=["loc_harbor"];
const window={appState:{get:key=>key==="authorizedLocationIds"?allowed:undefined,update:value=>updates.push(value)},addEventListener:()=>{},dispatchEvent:event=>events.push(event)};
const context={window,location:{search:"?location=loc_harbor"},localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,String(value))},URLSearchParams,CustomEvent:function(type,options){this.type=type;this.detail=options.detail},Symbol,Object,Array,String,Error};
vm.runInNewContext(authority,context);
ok("Authority declares pilot version",window.BlueCurrentFrontlineLocation.version==="100.3.17");
ok("Authorized query location is selected",window.BlueCurrentFrontlineLocation.get()==="loc_harbor");
ok("Selection persists for repeat entry",store.get("blueCurrent.frontline.location.v100")==="loc_harbor");
allowed=["loc_marina"];context.location.search="?location=loc_harbor";
ok("Unauthorized query location is rejected",window.BlueCurrentFrontlineLocation.get()==="loc_marina");
let rejected=false;try{window.BlueCurrentFrontlineLocation.select("loc_river")}catch(error){rejected=/not authorized/.test(error.message)}
ok("Unauthorized programmatic selection is rejected",rejected);
ok("Dynamic reference serializes to current authority",JSON.stringify({locationId:window.BlueCurrentFrontlineLocation.reference})==='{"locationId":"loc_marina"}');
ok("Authority loads before Floor and lazy frontline modules",index.indexOf("frontline-location-authority-v100.3.17.js")<index.indexOf("floor-reservations-v62.0.js")&&index.indexOf("frontline-location-authority-v100.3.17.js")<index.indexOf("staff-truth-v100.2.64.js"));
ok("All five staff surfaces use shared location reference",moduleFiles.every(file=>fs.readFileSync(path.join(root,"client/js",file),"utf8").includes("BlueCurrentFrontlineLocation?.reference")));
ok("Service exception sync uses shared location authority",floor.includes("BlueCurrentFrontlineLocation?.get?.()"));
ok("All staff browser cache keys advance",moduleFiles.every(file=>index.includes(`${file}?v=100.3.17`)));
ok("Runtime staff manifest advances together",moduleFiles.every(file=>runtime.includes(`${file}?v=100.3.17`)));
ok("Marina remains safe development fallback",window.BlueCurrentFrontlineLocation.fallback==="loc_marina");
ok("No authorization list is modified",authority.includes("authorizedLocationIds")&&!authority.includes("set(\"authorizedLocationIds\""));
console.log(`V100.3.17 validation ${passed}/13`);
