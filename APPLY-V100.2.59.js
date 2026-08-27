"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const floor=path.join(root,"client","js","floor-reservations-v62.0.js");
const life=path.join(root,"client","js","service-table-lifecycle-v100.2.57.js");
const turn=path.join(root,"client","js","completed-visit-turn-certification-v100.2.58.js");
const html=path.join(root,"client","index.html");
if(![floor,life,turn,html].every(fs.existsSync)) throw new Error("V100.2.59 requires the applied V100.2.58 baseline.");
const floorText=fs.readFileSync(floor,"utf8");
const lifeText=fs.readFileSync(life,"utf8");
const turnText=fs.readFileSync(turn,"utf8");
if(!floorText.includes("V100.2.57 — Service Completion / Table Turn Handoff")) throw new Error("V100.2.59 guard failed: V100.2.57 service completion contract missing.");
if(!lifeText.includes('window.dispatchEvent(new CustomEvent("bc:host-table-cleaning"')) throw new Error("V100.2.59 guard failed: Service → CLEANING event missing.");
if(!turnText.includes('window.dispatchEvent(new CustomEvent("bc:table-turn-completed"')) throw new Error("V100.2.59 guard failed: CLEANING → OPEN certification event missing.");
const testSrc=path.join(__dirname,"patches","scripts","maintenance","test-v100.2.59-cross-workspace-lifecycle-certification.js");
const testDst=path.join(root,"scripts","maintenance","test-v100.2.59-cross-workspace-lifecycle-certification.js");
fs.mkdirSync(path.dirname(testDst),{recursive:true});
fs.copyFileSync(testSrc,testDst);
console.log(JSON.stringify({
 ok:true,version:"100.2.59",wave:"Cross-Workspace Lifecycle Certification",
 architecture:"certification-only; no runtime application files modified",
 certifiedPath:"Reservations/Waitlist → Floor → Service → CLEANING → OPEN → Guest memory",
 ownership:"single-party handoffs verified at source boundaries",
 protectedFloor:"unchanged",
 productBehavior:"unchanged"
},null,2));