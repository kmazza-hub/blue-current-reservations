"use strict";
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const read=(rel)=>fs.readFileSync(path.join(root,rel),"utf8");
const floor=read("client/js/floor-reservations-v62.0.js");
const css=read("client/styles.css");
const checks=[
 ["guest search derives live waitlist guests",/liveGuestData\(\)[\s\S]*#waitlistQueue \.queue-item/.test(floor)],
 ["guest search derives live arrivals",/#arrivalQueue \.queue-item/.test(floor)],
 ["guest search derives live reservations",/#bcReservationList article/.test(floor)],
 ["live operating state wins over static profile context",/guest\.source!=="profile"/.test(floor)],
 ["search re-evaluates current Host Stand data",/searchableGuestData\(\)\.filter/.test(floor)],
 ["local Host Stand mutations refresh active search",/bcHostDialogForm[\s\S]*renderGuestSearch/.test(floor)],
 ["guest search field has explicit restaurant-safe dark contrast",/#host-stand \.bc-host-search input\{[\s\S]*background:#0d2e3b!important;[\s\S]*color:#f7fbfd!important/.test(css)],
 ["guest search placeholder is explicitly readable",/#host-stand \.bc-host-search input::placeholder\{color:#b9d7df!important/.test(css)],
 ["empty search results are readable",/#host-stand \.bc-guest-results>p\{color:#d7edf2!important/.test(css)]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,repair:"V100.2.2 Guest Search Consistency & Readability",baselineVersion:"100.0.0",checks:checks.map(([name])=>name),failed},null,2));
if(failed.length)process.exit(1);
