"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const jsPath=path.join(root,"client","js","floor-reservations-v62.0.js");
const cssPath=path.join(root,"client","styles.css");
const fragPath=path.join(root,"patches","host-floor-organic-collision-safe-v100.2.43.cssfrag");
for(const p of [jsPath,cssPath,fragPath]){if(!fs.existsSync(p)){console.error(`V100.2.43 apply failed: missing ${path.relative(root,p)}`);process.exit(1);}}
let js=fs.readFileSync(jsPath,"utf8"),css=fs.readFileSync(cssPath,"utf8");
if(!css.includes("V100.2.42 — Zero-Overlap Restaurant Floor Spacing")){console.error("V100.2.43 requires V100.2.42 first.");process.exit(1);}
if(css.includes("V100.2.43 — Organic Collision-Safe Restaurant Floor")){console.log("V100.2.43 already applied.");process.exit(0);}
const replaceOnce=(text,from,to,label)=>{if(!text.includes(from)){console.error(`V100.2.43 apply failed: ${label} anchor not found.`);process.exit(1);}return text.replace(from,to);};
fs.writeFileSync(jsPath+".v100.2.43.bak",js);fs.writeFileSync(cssPath+".v100.2.43.bak",css);

js=replaceOnce(js,
' function guestKey(value){return normalizeGuestName(value).toLowerCase();}\n',
` function guestKey(value){return normalizeGuestName(value).toLowerCase();}\n const guestRegistryStorageKey="bcHostGuestRegistryV100_2_43";\n function loadGuestRegistry(){\n   try{const parsed=JSON.parse(localStorage.getItem(guestRegistryStorageKey)||"[]");return Array.isArray(parsed)?parsed:[];}catch(_){return [];}\n }\n function saveGuestRegistry(records){try{localStorage.setItem(guestRegistryStorageKey,JSON.stringify(records.slice(-200)));}catch(_){/* storage is best-effort */}}\n function registerGuest(record={}){\n   const name=normalizeGuestName(record.name);if(!name)return;\n   const records=loadGuestRegistry(),key=guestKey(name),index=records.findIndex(x=>guestKey(x.name)===key);\n   const previous=index>=0?records[index]:{};\n   const next={...previous,...record,name,lastSeenAt:Date.now(),source:record.source||previous.source||"history"};\n   if(index>=0)records.splice(index,1);records.push(next);saveGuestRegistry(records);\n }\n function historicalGuestData(){\n   return loadGuestRegistry().map(x=>({name:x.name,detail:x.detail||"Guest history",note:x.note||"Saved guest profile from Host Stand activity.",source:"history"}));\n }\n`,
"guest registry");

js=replaceOnce(js,
'   list.appendChild(item);wireSeatButton(item.querySelector("button"));\n   const badge=document.getElementById("waitlistBadge"), waiting=document.getElementById("hostWaiting"), bc=document.getElementById("bcWaitCount");',
'   list.appendChild(item);wireSeatButton(item.querySelector("button"));\n   registerGuest({name,detail:`Waitlist · Party of ${party} · ${preference}`,note:`Walk-in guest. Quoted wait ${wait} min.`,source:"waitlist"});\n   const badge=document.getElementById("waitlistBadge"), waiting=document.getElementById("hostWaiting"), bc=document.getElementById("bcWaitCount");',
"walk-in guest persistence");

js=replaceOnce(js,
'   list.appendChild(article);wireReservation(article);\n   return article;',
'   list.appendChild(article);wireReservation(article);\n   registerGuest({name,detail:`${readable} · Party of ${party} · ${preference}${notes?` · ${notes}`:""}`,note:"Saved from a Host Stand reservation.",source:"reservation"});\n   return article;',
"reservation guest persistence");

js=replaceOnce(js,
'     const guest=item.querySelector("strong")?.textContent||"Guest";\n     button.textContent="Seated";button.disabled=true;item.classList.add("bc-seated");',
'     const guest=item.querySelector("strong")?.textContent||"Guest";\n     const guestDetail=normalizeGuestName(item.querySelector("small")?.textContent)||"Seated guest";\n     registerGuest({name:guest,detail:`Seated · ${guestDetail}`,note:"Guest reached the live floor and was seated.",source:"seated"});\n     button.textContent="Seated";button.disabled=true;item.classList.add("bc-seated");',
"seated guest persistence");

js=replaceOnce(js,
'   setView("floor");\n   const waitTab=host.querySelector(\'.queue-tabs [data-queue="waitlist"]\');',
'   registerGuest({name:record.name,detail:`Waitlist · Party of ${record.party} · ${record.preference}${record.notes?` · ${record.notes}`:""}`,note:"Reservation arrived and entered the live seating queue.",source:"waitlist"});\n   article.remove();\n   setView("floor");\n   const waitTab=host.querySelector(\'.queue-tabs [data-queue="waitlist"]\');',
"arrived reservation leaves reservation list");

js=replaceOnce(js,
'   [...profileGuestData,...liveGuestData()].forEach(guest=>{',
'   [...historicalGuestData(),...profileGuestData,...liveGuestData()].forEach(guest=>{',
"guest history search merge");

js=replaceOnce(js,
'   if(!q){results.innerHTML="<p>Search tonight’s waitlist, arrivals, reservations, and recent profiles.</p>";return;}',
'   if(!q){\n     const recent=searchableGuestData().slice(-20).reverse();\n     results.innerHTML=recent.length?recent.map((x,i)=>`<button type="button" data-guest-result="${i}"><strong>${x.name}</strong><span>${x.detail}</span></button>`).join(""):"<p>No guests saved yet.</p>";\n     results.querySelectorAll("[data-guest-result]").forEach((b,i)=>b.addEventListener("click",()=>openDialog("details",recent[i])));\n     return;\n   }',
"guest tab recent records");

css += "\n\n"+fs.readFileSync(fragPath,"utf8").trim()+"\n";
fs.writeFileSync(jsPath,js);fs.writeFileSync(cssPath,css);
console.log(JSON.stringify({ok:true,version:"100.2.43",repair:"Expected-only Reservations + Persistent Guests + Organic Collision-Safe Floor",fixes:["reservation leaves Reservations immediately when Add to waitlist hands it to Floor","walk-ins, arrived reservations, and seated guests are retained in the Guests registry","Guests opens with recent saved guest records and remains searchable without duplicate names","restores a more natural staggered restaurant floor composition","keeps direct collision-safe coordinates so tables retain breathing room","preserves seating, table-fit, wait-time, room zoning, and lifecycle behavior"]},null,2));
