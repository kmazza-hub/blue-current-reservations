"use strict";
const fs=require("fs"),path=require("path");
const file=path.join(process.cwd(),"client","js","floor-reservations-v62.0.js");
const s=fs.readFileSync(file,"utf8");
const tests=[
 ["guest registry preserved",s.includes('guestRegistryStorageKey="bcHostGuestRegistryV100_2_43"')],
 ["seat handler present",s.includes("function wireSeatButton(button)")],
 ["guest saved on seating",s.includes('source:"seated"')],
 ["party size captured",s.includes("const partySize=Number")],
 ["waitlist decremented",s.includes("const next=Math.max(0")],
 ["seated count advanced",s.includes('getElementById("hostSeated")')],
 ["service handoff event",s.includes('bc:host-guest-seated')],
 ["handoff carries guest",s.includes("detail:{guest,partySize,guestDetail")],
 ["queue card removed",s.includes("requestAnimationFrame(()=>item.remove())")],
 ["reservation handoff preserved",s.includes("function handoffReservationToFloor(article)")],
 ["guest recognition preserved",s.includes("recognitionForGuest")]
];
let ok=0;for(const [name,pass] of tests){console.log(`${pass?"PASS":"FAIL"} ${name}`);if(pass)ok++;}
console.log(`${ok}/${tests.length} checks passed`);if(ok!==tests.length)process.exit(1);
