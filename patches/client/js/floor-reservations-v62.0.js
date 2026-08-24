(function(){
"use strict";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
ready(()=>{
 const host=document.getElementById("host-stand");if(!host)return;
 const floor=host.querySelector(".host-workspace");
 const navButtons=Array.from(host.querySelectorAll(".host-nav [data-host-view]"));
 const panels=Array.from(host.querySelectorAll("[data-host-panel]"));
 const dialog=document.getElementById("bcHostDialog");
 const dialogTitle=document.getElementById("bcHostDialogTitle");
 const dialogEyebrow=document.getElementById("bcHostDialogEyebrow");
 const dialogBody=document.getElementById("bcHostDialogBody");
 const dialogSubmit=document.getElementById("bcHostDialogSubmit");
 let dialogMode=null;
 let activeReservationArticle=null;
 let activeGuestProfile=null;

 function setView(view){
   navButtons.forEach(b=>{const on=b.dataset.hostView===view;b.classList.toggle("active",on);b.setAttribute("aria-current",on?"page":"false");});
   const isFloor=view==="floor";
   if(floor){floor.hidden=!isFloor;floor.setAttribute("aria-hidden",String(!isFloor));}
   panels.forEach(panel=>{const on=panel.dataset.hostPanel===view;panel.hidden=!on;panel.setAttribute("aria-hidden",String(!on));});
   if(view==="waitlist"){
     document.getElementById("waitlistQueue")?.classList.remove("hidden");
     document.getElementById("arrivalQueue")?.classList.add("hidden");
   }
 }
 navButtons.forEach(b=>b.addEventListener("click",()=>setView(b.dataset.hostView)));
 setView("floor");

 function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));}
 function escapeAttr(value){return escapeHtml(value);}
 function to24Hour(value){
   const raw=String(value||"").trim();
   if(/^\d{2}:\d{2}$/.test(raw))return raw;
   const match=raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);if(!match)return "19:30";
   let hour=Number(match[1]);const minute=match[2],period=match[3].toUpperCase();
   if(period==="PM"&&hour<12)hour+=12;if(period==="AM"&&hour===12)hour=0;
   return `${String(hour).padStart(2,"0")}:${minute}`;
 }
 function openDialog(mode,payload={}){
   dialogMode=mode;
   dialogEyebrow.textContent=mode==="reservation"?"RESERVATION":mode==="walkin"?"WALK-IN":"GUEST";
   dialogSubmit.hidden=mode==="details";
   if(mode==="reservation"||mode==="edit-reservation"){
     const editing=mode==="edit-reservation";
     const values=payload||{};
     dialogEyebrow.textContent="RESERVATION";
     dialogTitle.textContent=editing?"Edit reservation":"Add reservation";
     dialogBody.innerHTML=`<div class="bc-dialog-grid">
       <label><span>Guest name</span><input name="guestName" required placeholder="Guest name" value="${escapeAttr(values.name||"")}"></label>
       <label><span>Time</span><input name="time" type="time" required value="${escapeAttr(values.time24||"19:30")}"></label>
       <label><span>Party size</span><input name="partySize" type="number" min="1" max="30" required value="${escapeAttr(values.party||"2")}"></label>
       <label><span>Seating preference</span><select name="preference">${["Flexible","Waterfront","Main dining","Bar","Accessible"].map(option=>`<option${option===(values.preference||"Flexible")?" selected":""}>${option}</option>`).join("")}</select></label>
       <label class="wide"><span>Occasion / notes</span><input name="notes" placeholder="Birthday, allergy, high chair…" value="${escapeAttr(values.notes||"")}"></label>
     </div>`;
     dialogSubmit.textContent=editing?"Save changes":"Add reservation";
   }else if(mode==="walkin"){
     dialogTitle.textContent="Add walk-in";
     dialogBody.innerHTML=`<div class="bc-dialog-grid">
       <label><span>Guest name</span><input name="guestName" required placeholder="Guest name"></label>
       <label><span>Party size</span><input name="partySize" type="number" min="1" max="30" required value="2"></label>
       <label><span>Preference</span><select name="preference"><option>Flexible</option><option>Bar okay</option><option>High chair</option><option>Accessible</option></select></label>
       <label><span>Quoted wait</span><input name="quotedWait" type="number" min="0" max="180" value="15"><small>minutes</small></label>
     </div>`;
     dialogSubmit.textContent="Add to waitlist";
   }else if(mode==="edit-guest"){
     activeGuestProfile=payload||{};
     dialogEyebrow.textContent="GUEST PROFILE";
     dialogTitle.textContent=`Edit ${payload.name||"guest"}`;
     dialogBody.innerHTML=`<div class="bc-dialog-grid bc-guest-edit-v245">
       <label><span>Guest name</span><input name="guestName" required value="${escapeAttr(payload.name||"")}"></label>
       <label><span>Phone</span><input name="phone" inputmode="tel" placeholder="(555) 555-5555" value="${escapeAttr(payload.phone||"")}"></label>
       <label><span>Email</span><input name="email" type="email" placeholder="guest@example.com" value="${escapeAttr(payload.email||"")}"></label>
       <label><span>Seating preference</span><input name="preference" placeholder="Waterfront, booth, bar okay…" value="${escapeAttr(payload.preference||"")}"></label>
       <label class="wide"><span>Hospitality notes</span><textarea name="guestNotes" rows="4" placeholder="Allergies, accessibility, celebrations, service preferences…">${escapeHtml(payload.guestNotes||payload.note||"")}</textarea></label>
     </div>`;
     dialogSubmit.hidden=false;
     dialogSubmit.textContent="Save guest profile";
   }else if(mode==="reservation-details"){
     activeReservationArticle=payload.article||null;
     dialogSubmit.hidden=false;
     dialogSubmit.textContent="Add to waitlist";
     dialogTitle.textContent=payload.name||"Reservation details";
     dialogBody.innerHTML=`<div class="bc-reservation-detail">
       <div class="bc-reservation-detail__identity"><strong>${escapeHtml(payload.name||"Guest")}</strong><span>${escapeHtml(payload.status||"Expected")}</span></div>
       <dl class="bc-reservation-detail__grid">
         <div><dt>Time</dt><dd>${escapeHtml(payload.time||"Tonight")}</dd></div>
         <div><dt>Party</dt><dd>${escapeHtml(String(payload.party||"—"))}</dd></div>
         <div><dt>Seating</dt><dd>${escapeHtml(payload.preference||"Flexible")}</dd></div>
         <div><dt>Status</dt><dd>${escapeHtml(payload.status||"Expected")}</dd></div>
         <div class="wide"><dt>Occasion / notes</dt><dd>${escapeHtml(payload.notes||"None recorded")}</dd></div>
       </dl>
       <div class="bc-reservation-detail__focus"><small>Host focus</small><p>Review seating preference and notes, then add the party to the waitlist when they are ready to be seated.</p></div>
       <div class="bc-reservation-detail__actions">
         <button type="button" data-reservation-detail-action="edit">Edit reservation</button>
         <button type="button" data-reservation-detail-action="cancel" class="danger">Cancel reservation</button>
       </div>
     </div>`;
     wireReservationDetailActions(payload);
   }else{
     dialogTitle.textContent=payload.name||"Guest details";
     const visits=Array.isArray(payload.visits)?payload.visits.slice().reverse().slice(0,6):[];
     const recognition=guestRecognitionSummary(payload);
     dialogBody.innerHTML=`<div class="bc-guest-detail bc-guest-profile-v244">
       <div class="bc-guest-profile-v244__head"><div><strong>${escapeHtml(payload.name||"Guest")}</strong><span>${escapeHtml(payload.detail||"Tonight's guest")}</span></div><em>${escapeHtml(guestStatusLabel(payload))}</em></div>
       <div class="bc-guest-profile-v246__recognition"><div><small>Recognition</small><strong>${escapeHtml(recognition.intel.recognition)}</strong><span>${escapeHtml(recognition.intel.cue)}</span></div><div class="bc-guest-profile-v246__tags">${recognition.tags.map(tag=>`<em>${escapeHtml(tag)}</em>`).join("")}</div></div>
       <div class="bc-guest-profile-v245__facts">
         <div><small>Phone</small><strong>${escapeHtml(payload.phone||"Not saved")}</strong></div>
         <div><small>Email</small><strong>${escapeHtml(payload.email||"Not saved")}</strong></div>
         <div><small>Preference</small><strong>${escapeHtml(payload.preference||"Flexible")}</strong></div>
         <div><small>Visits</small><strong>${escapeHtml(String(recognition.intel.visitCount))}</strong></div>
       </div>
       <div class="bc-guest-profile-v244__focus"><small>What matters now</small><p>${escapeHtml(payload.guestNotes||payload.note||recognition.intel.cue||"No special preference or service note is recorded yet.")}</p></div>
       <div class="bc-guest-profile-v244__history"><small>Visit history</small>${visits.length?visits.map(v=>`<article><strong>${escapeHtml(v.detail||"Host Stand activity")}</strong><span>${escapeHtml(v.at?new Date(v.at).toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"Saved visit")}</span></article>`).join(""):`<p>First recorded visit in Blue Current.</p>`}</div>
       <div class="bc-guest-profile-v245__actions"><button type="button" data-guest-profile-edit>Edit guest profile</button></div>
     </div>`;
     dialogBody.querySelector("[data-guest-profile-edit]")?.addEventListener("click",()=>openDialog("edit-guest",payload));
   }
   if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");
 }
 function closeDialog(){if(typeof dialog.close==="function")dialog.close();else dialog.removeAttribute("open");}
 document.getElementById("bcHostDialogClose")?.addEventListener("click",closeDialog);
 document.getElementById("bcHostDialogCancel")?.addEventListener("click",closeDialog);

 function addWalkin(name,party,preference,wait){
   const list=document.getElementById("waitlistQueue");if(!list)return;
   const item=document.createElement("article");item.className="queue-item";
   item.innerHTML=`<span class="queue-time">0m</span><div><strong>${name}</strong><small>Party of ${party} · ${preference}</small></div><button type="button">Seat</button>`;
   list.appendChild(item);wireSeatButton(item.querySelector("button"));
   registerGuest({name,detail:`Waitlist · Party of ${party} · ${preference}`,note:`Walk-in guest. Quoted wait ${wait} min.`,source:"waitlist"});
   const badge=document.getElementById("waitlistBadge"), waiting=document.getElementById("hostWaiting"), bc=document.getElementById("bcWaitCount");
   const next=Number(badge?.textContent||0)+1;
   if(badge)badge.textContent=String(next);if(waiting)waiting.textContent=String(next);if(bc)bc.textContent=String(next);
   document.getElementById("bcLongestWait").textContent=Math.max(18,Number(wait)||0)+" min";
 }
 function addReservation(name,time,party,preference,notes){
   const list=document.getElementById("bcReservationList");if(!list)return null;
   const readable=time?new Date(`2000-01-01T${time}`).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"Tonight";
   const article=document.createElement("article");article.dataset.reservationName=name;article.dataset.reservationTime=time;article.dataset.reservationParty=party;article.dataset.reservationPreference=preference;article.dataset.reservationNotes=notes||"";article.dataset.reservationStatus="Expected";
   article.innerHTML=`<time>${readable}</time><div><strong>${escapeHtml(name)}</strong><span>Party of ${escapeHtml(party)} · ${escapeHtml(preference)}${notes?` · ${escapeHtml(notes)}`:""}</span></div><b data-tone="expected">Expected</b><button type="button" data-reservation-action="details">Details</button>`;
   list.appendChild(article);wireReservation(article);
   registerGuest({name,detail:`${readable} · Party of ${party} · ${preference}${notes?` · ${notes}`:""}`,note:"Saved from a Host Stand reservation.",source:"reservation"});
   return article;
 }

 document.getElementById("hostAddReservation")?.addEventListener("click",()=>openDialog("reservation"));
 document.getElementById("bcReservationQuickAdd")?.addEventListener("click",()=>openDialog("reservation"));
 document.getElementById("addWalkIn")?.addEventListener("click",event=>{event.stopImmediatePropagation();openDialog("walkin");});
 document.getElementById("bcWalkInQuickAdd")?.addEventListener("click",()=>openDialog("walkin"));
 document.getElementById("hostSearchGuest")?.addEventListener("click",()=>{setView("guests");document.getElementById("bcGuestSearchInput")?.focus();});

 document.getElementById("bcHostDialogForm")?.addEventListener("submit",event=>{
   event.preventDefault();
   if(dialogMode==="details"){closeDialog();return;}
   const mode=dialogMode;
   const data=new FormData(event.currentTarget);
   let reservationArticle=null;
   if(mode==="reservation")reservationArticle=addReservation(String(data.get("guestName")||"Guest"),String(data.get("time")||""),String(data.get("partySize")||"2"),String(data.get("preference")||"Flexible"),String(data.get("notes")||""));
   if(mode==="edit-reservation"&&activeReservationArticle){
     const name=String(data.get("guestName")||"Guest"),time=String(data.get("time")||""),party=String(data.get("partySize")||"2"),preference=String(data.get("preference")||"Flexible"),notes=String(data.get("notes")||"");
     updateReservationArticle(activeReservationArticle,{name,time,party,preference,notes});reservationArticle=activeReservationArticle;
   }
   if(mode==="walkin")addWalkin(String(data.get("guestName")||"Walk-in"),String(data.get("partySize")||"2"),String(data.get("preference")||"Flexible"),String(data.get("quotedWait")||"15"));
   if(mode==="edit-guest"&&activeGuestProfile){
     const originalName=activeGuestProfile.name;
     updateGuestProfile(originalName,{name:String(data.get("guestName")||originalName),phone:String(data.get("phone")||""),email:String(data.get("email")||""),preference:String(data.get("preference")||""),guestNotes:String(data.get("guestNotes")||"")});
   }
   if(mode==="reservation-details"&&activeReservationArticle)handoffReservationToFloor(activeReservationArticle);

   // V100.2.3: own the post-dialog transition explicitly. Native <dialog> focus
   // restoration can otherwise return focus to a control inside a workspace that
   // the Host Stand immediately hides, producing aria-hidden/focus warnings and
   // a visually blank Guests surface. Move focus out before closing, then land
   // deterministically on the completed workflow.
   if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
   closeDialog();
   if(mode==="edit-guest"){
     setView("guests");
     requestAnimationFrame(()=>document.getElementById("bcGuestSearchInput")?.focus());
   }else if(mode==="reservation"||mode==="edit-reservation"){
     setView("reservations");
     const panel=document.getElementById("bcHostReservationsPanel");
     panel?.scrollIntoView({behavior:"smooth",block:"nearest"});
     requestAnimationFrame(()=>{
       const focusTarget=reservationArticle?.querySelector('[data-reservation-action="details"]')||document.getElementById("bcReservationQuickAdd");
       focusTarget?.focus({preventScroll:true});
     });
   }else if(mode==="walkin"||mode==="reservation-details"){
     setView("floor");
   }
 });

 function wireSeatButton(button){
   if(!button||button.dataset.bcWired)return;button.dataset.bcWired="true";
   button.addEventListener("click",()=>{
     const item=button.closest(".queue-item");if(!item)return;
     const guest=item.querySelector("strong")?.textContent||"Guest";
     const guestDetail=normalizeGuestName(item.querySelector("small")?.textContent)||"Seated guest";
     registerGuest({name:guest,detail:`Seated · ${guestDetail}`,note:"Guest reached the live floor and was seated.",source:"seated"});
     button.textContent="Seated";button.disabled=true;item.classList.add("bc-seated");
     const badge=document.getElementById("waitlistBadge"),waiting=document.getElementById("hostWaiting"),bc=document.getElementById("bcWaitCount");
     const next=Math.max(0,Number(badge?.textContent||0)-1);
     if(badge)badge.textContent=String(next);if(waiting)waiting.textContent=String(next);if(bc)bc.textContent=String(next);
     const partySize=Number((item.querySelector("small")?.textContent.match(/Party of (\d+)/)||[])[1]||0);
     const seated=document.getElementById("hostSeated");if(seated)seated.textContent=String(Number(seated.textContent||0)+partySize);
     item.setAttribute("aria-label",`${guest} seated`);
     // V100.2.49 — once seating is confirmed, the host queue is finished with this party.
     // Preserve the guest record, publish a clean downstream handoff, then remove the stale queue card.
     window.dispatchEvent(new CustomEvent("bc:host-guest-seated",{detail:{guest,partySize,guestDetail,source:item.dataset.bcSourceType||"waitlist"}}));
     requestAnimationFrame(()=>item.remove());
   });
 }
 host.querySelectorAll("#waitlistQueue .queue-item button").forEach(wireSeatButton);

 function reservationRecord(article){
   const name=article.dataset.reservationName||article.querySelector("strong")?.textContent||"Guest";
   const time=article.querySelector("time")?.textContent||"Tonight";
   const detail=article.querySelector("span")?.textContent||"";
   const party=article.dataset.reservationParty||(detail.match(/Party of ([^·]+)/)?.[1]||"—").trim();
   const preference=article.dataset.reservationPreference||(detail.split("·")[1]||"Flexible").trim();
   const notes=article.dataset.reservationNotes||(detail.split("·").slice(2).join(" · ").trim());
   const status=article.dataset.reservationStatus||article.querySelector("b")?.textContent||"Expected";
   return {article,name,time,time24:article.dataset.reservationTime||to24Hour(time),party,preference,notes,status};
 }
 function updateReservationArticle(article,record){
   const readable=record.time?new Date(`2000-01-01T${record.time}`).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"Tonight";
   article.dataset.reservationName=record.name;article.dataset.reservationTime=record.time;article.dataset.reservationParty=record.party;article.dataset.reservationPreference=record.preference;article.dataset.reservationNotes=record.notes||"";
   article.querySelector("time").textContent=readable;article.querySelector("strong").textContent=record.name;article.querySelector("span").textContent=`Party of ${record.party} · ${record.preference}${record.notes?` · ${record.notes}`:""}`;
 }
 function handoffReservationToFloor(article){
   if(!article)return false;
   const record=reservationRecord(article);
   article.dataset.reservationStatus="Arrived";
   const badge=article.querySelector("b");
   if(badge){badge.textContent="Arrived";badge.dataset.tone="arrived";}

   const priorityApi=window.__bcArrivalPriorityQueueV100_2_17;
   if(priorityApi?.moveArrivalToReady){
     priorityApi.moveArrivalToReady(article);
   }else{
     const list=document.getElementById("waitlistQueue");
     if(list){
       const name=record.name;
       const exists=Array.from(list.querySelectorAll(".queue-item")).some(item=>normalizeGuestName(item.querySelector("strong")?.textContent)===normalizeGuestName(name));
       if(!exists){
         const item=document.createElement("article");
         item.className="queue-item bc-arrived-reservation-ready-v100-2-40";
         item.dataset.bcGuestStatus="waiting";
         item.dataset.bcSourceType="reservation";
         item.innerHTML=`<span class="queue-time">0m</span><div><strong>${escapeHtml(name)}</strong><small>Party of ${escapeHtml(record.party)} · ${escapeHtml(record.preference)}${record.notes?` · ${escapeHtml(record.notes)}`:""}</small></div><button type="button">Seat</button>`;
         list.appendChild(item);
         wireSeatButton(item.querySelector("button"));
       }
       const count=Array.from(list.querySelectorAll(".queue-item")).filter(item=>!item.classList.contains("bc-seated")).length;
       const badgeNode=document.getElementById("waitlistBadge"),waiting=document.getElementById("hostWaiting"),bc=document.getElementById("bcWaitCount");
       if(badgeNode)badgeNode.textContent=String(count);if(waiting)waiting.textContent=String(count);if(bc)bc.textContent=String(count);
     }
   }

   registerGuest({name:record.name,detail:`Waitlist · Party of ${record.party} · ${record.preference}${record.notes?` · ${record.notes}`:""}`,note:"Reservation arrived and entered the live seating queue.",source:"waitlist"});
   article.remove();
   setView("floor");
   const waitTab=host.querySelector('.queue-tabs [data-queue="waitlist"]');
   waitTab?.click();
   return true;
 }

 function wireReservationDetailActions(payload){
   const article=payload.article;if(!article)return;
   dialogBody.querySelector('[data-reservation-detail-action="edit"]')?.addEventListener("click",()=>{
     const record=reservationRecord(article);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();closeDialog();openDialog("edit-reservation",record);
   });
   dialogBody.querySelector('[data-reservation-detail-action="cancel"]')?.addEventListener("click",()=>{
     if(!window.confirm(`Cancel reservation for ${payload.name||"this guest"}?`))return;
     if(document.activeElement instanceof HTMLElement)document.activeElement.blur();article.remove();closeDialog();setView("reservations");document.getElementById("bcReservationQuickAdd")?.focus({preventScroll:true});
   });
 }
 function wireReservation(article){
   const btn=article.querySelector('[data-reservation-action="details"]');if(!btn||btn.dataset.bcWired)return;btn.dataset.bcWired="true";
   btn.addEventListener("click",()=>openDialog("reservation-details",reservationRecord(article)));
 }
 host.querySelectorAll("#bcReservationList article").forEach(wireReservation);

 const profileGuestData=[
   {name:"Anthony Russo",detail:"7:30 PM · Party of 4 · Birthday",note:"Waterfront preference. Birthday dessert note is loaded.",source:"profile"},
   {name:"Melissa Grant",detail:"7:15 PM · Party of 2 · Anniversary",note:"Anniversary dinner. Guest has arrived.",source:"profile"},
   {name:"Daniel Cho",detail:"7:45 PM · Party of 6",note:"Large party. Confirm table combination before arrival.",source:"profile"},
   {name:"Alyssa Moore",detail:"8:00 PM · Party of 3 · High chair",note:"High chair requested. Confirm accessible path.",source:"profile"}
 ];

 function normalizeGuestName(value){return String(value||"").trim().replace(/\s+/g," ");}
 function guestKey(value){return normalizeGuestName(value).toLowerCase();}
 const guestRegistryStorageKey="bcHostGuestRegistryV100_2_43"; // schema upgraded in V100.2.44 without breaking stored profiles
 function loadGuestRegistry(){
   try{const parsed=JSON.parse(localStorage.getItem(guestRegistryStorageKey)||"[]");return Array.isArray(parsed)?parsed:[];}catch(_){return [];}
 }
 function saveGuestRegistry(records){try{localStorage.setItem(guestRegistryStorageKey,JSON.stringify(records.slice(-200)));}catch(_){/* storage is best-effort */}}
 function registerGuest(record={}){
   const name=normalizeGuestName(record.name);if(!name)return;
   const records=loadGuestRegistry(),key=guestKey(name),index=records.findIndex(x=>guestKey(x.name)===key);
   const previous=index>=0?records[index]:{};
   const now=Date.now();
   const visit={at:now,detail:record.detail||previous.detail||"Host Stand activity",note:record.note||"",source:record.source||previous.source||"history"};
   const visits=Array.isArray(previous.visits)?previous.visits.slice(-11):[];
   const last=visits[visits.length-1];
   if(!last||last.detail!==visit.detail||last.source!==visit.source)visits.push(visit);
   const next={...previous,...record,name,lastSeenAt:now,source:record.source||previous.source||"history",visits};
   if(index>=0)records.splice(index,1);records.push(next);saveGuestRegistry(records);
 }
 function updateGuestProfile(originalName,changes={}){
   const records=loadGuestRegistry(),key=guestKey(originalName),index=records.findIndex(x=>guestKey(x.name)===key);
   const previous=index>=0?records[index]:{name:originalName,visits:[]};
   const next={...previous,...changes,name:normalizeGuestName(changes.name||originalName),lastSeenAt:previous.lastSeenAt||Date.now(),source:previous.source||"history"};
   if(index>=0)records.splice(index,1);records.push(next);saveGuestRegistry(records);
   activeGuestProfile=next;
   renderGuestSearch();
 }
 function historicalGuestData(){
   return loadGuestRegistry().map(x=>({...x,name:x.name,detail:x.detail||"Guest history",note:x.note||"Saved guest profile from Host Stand activity.",source:x.source||"history"}));
 }
 function guestSearchText(guest){
   return guestKey([guest.name,guest.phone,guest.email,guest.detail,guest.note,...(guest.visits||[]).map(v=>`${v.detail||""} ${v.note||""}`)].filter(Boolean).join(" "));
 }
 function guestStatusLabel(guest){
   const source=String(guest.source||"history");
   return ({waitlist:"Waiting",arrival:"Arriving",reservation:"Reserved",seated:"Seated",profile:"Known guest",history:"Guest"})[source]||"Guest";
 }
 function guestRecognition(guest){
   const visits=Array.isArray(guest.visits)?guest.visits:[];
   const visitCount=Math.max(visits.length,1);
   const context=[guest.guestNotes,guest.note,guest.detail,...visits.map(v=>`${v.detail||""} ${v.note||""}`)].filter(Boolean).join(" ").toLowerCase();
   const occasions=[];
   if(/anniversary/.test(context))occasions.push("Anniversary");
   if(/birthday/.test(context))occasions.push("Birthday");
   if(/vip|regular|preferred guest/.test(context))occasions.push("VIP");
   const care=[];
   if(/allerg|gluten|celiac|nut|dairy|shellfish/.test(context))care.push("Dietary note");
   if(/accessible|wheelchair|mobility/.test(context))care.push("Accessibility");
   if(/high chair|highchair|booster/.test(context))care.push("Child seating");
   const repeat=visitCount>=2;
   const recognition=visitCount>=5?"Regular":repeat?"Returning":"First visit";
   const cue=care[0]||occasions[0]||(guest.preference&&guest.preference!=="Flexible"?`${guest.preference} preferred`:(repeat?"Welcome back":"New guest"));
   return {visitCount,repeat,recognition,cue,occasions:[...new Set(occasions)],care:[...new Set(care)]};
 }
 function guestRecognitionSummary(guest){
   const intel=guestRecognition(guest);
   const tags=[intel.recognition,...intel.occasions,...intel.care];
   return {intel,tags:[...new Set(tags)].slice(0,4)};
 }
 function guestLastSeen(guest){
   if(!guest.lastSeenAt)return "Tonight";
   const d=new Date(guest.lastSeenAt);
   return Number.isNaN(d.getTime())?"Tonight":d.toLocaleDateString([],{month:"short",day:"numeric"});
 }
 function liveGuestData(){
   const live=[];
   host.querySelectorAll("#waitlistQueue .queue-item").forEach(item=>{
     const name=normalizeGuestName(item.querySelector("strong")?.textContent);if(!name)return;
     const detail=normalizeGuestName(item.querySelector("small")?.textContent)||"Live waitlist";
     live.push({name,detail:`Waitlist · ${detail}`,note:"Currently on the live waitlist. Confirm quoted wait, party needs, and table fit before seating.",source:"waitlist"});
   });
   host.querySelectorAll("#arrivalQueue .queue-item").forEach(item=>{
     const name=normalizeGuestName(item.querySelector("strong")?.textContent);if(!name)return;
     const time=normalizeGuestName(item.querySelector(".arrival-time")?.textContent);
     const detail=normalizeGuestName(item.querySelector("small")?.textContent)||"Tonight's arrival";
     live.push({name,detail:`${time?`${time} · `:""}${detail}`,note:"Tonight's arrival. Confirm arrival status and seating needs before assigning a table.",source:"arrival"});
   });
   host.querySelectorAll("#bcReservationList article").forEach(item=>{
     const name=normalizeGuestName(item.querySelector("strong")?.textContent);if(!name)return;
     const time=normalizeGuestName(item.querySelector("time")?.textContent);
     const detail=normalizeGuestName(item.querySelector("span")?.textContent)||"Tonight's reservation";
     live.push({name,detail:`${time?`${time} · `:""}${detail}`,note:"Tonight's reservation. Confirm arrival status, seating preference, and any occasion notes.",source:"reservation"});
   });
   return live;
 }
 function searchableGuestData(){
   const merged=new Map();
   [...historicalGuestData(),...profileGuestData,...liveGuestData()].forEach(guest=>{
     const key=guestKey(guest.name);if(!key)return;
     const existing=merged.get(key);
     // Live operating state wins over static profile/demo context for the same guest.
     if(!existing||guest.source!=="profile")merged.set(key,{...(existing||{}),...guest});
   });
   return Array.from(merged.values());
 }
 function renderGuestSearch(){
   if(!search||!results)return;
   const q=guestKey(search.value);
   if(!q){
     const recent=searchableGuestData().slice().sort((a,b)=>(b.lastSeenAt||0)-(a.lastSeenAt||0)).slice(0,20);
     results.innerHTML=recent.length?recent.map((x,i)=>{const r=guestRecognition(x);return `<button type="button" class="bc-guest-result-v244" data-guest-result="${i}"><span><strong>${escapeHtml(x.name)}</strong><small>${escapeHtml(x.detail||"Guest profile")}</small></span><em>${escapeHtml(r.repeat?r.recognition:guestStatusLabel(x))} · ${escapeHtml(guestLastSeen(x))}</em></button>`;}).join(""):"<p>No guests saved yet.</p>";
     results.querySelectorAll("[data-guest-result]").forEach((b,i)=>b.addEventListener("click",()=>openDialog("details",recent[i])));
     return;
   }
   const matches=searchableGuestData().filter(x=>guestSearchText(x).includes(q));
   results.innerHTML=matches.length?matches.map((x,i)=>{const r=guestRecognition(x);return `<button type="button" class="bc-guest-result-v244" data-guest-result="${i}"><span><strong>${escapeHtml(x.name)}</strong><small>${escapeHtml(x.detail||"Guest profile")}</small></span><em>${escapeHtml(r.repeat?r.recognition:guestStatusLabel(x))} · ${escapeHtml(guestLastSeen(x))}</em></button>`;}).join(""):"<p>No matching guest found.</p>";
   results.querySelectorAll("[data-guest-result]").forEach((b,i)=>b.addEventListener("click",()=>openDialog("details",matches[i])));
 }
 const search=document.getElementById("bcGuestSearchInput"),results=document.getElementById("bcGuestSearchResults");
 search?.addEventListener("input",renderGuestSearch);
 // Keep search results synchronized with local Host Stand mutations without inventing a second guest store.
 document.getElementById("bcHostDialogForm")?.addEventListener("submit",()=>setTimeout(()=>{if(search?.value.trim())renderGuestSearch();},0));

 // V100.2.50 — Service Intake Queue. Host seating is the authoritative transition into service.
 const SERVICE_HANDOFF_KEY="blueCurrent.service.activeParties.v100";
 function readServiceParties(){try{const x=JSON.parse(localStorage.getItem(SERVICE_HANDOFF_KEY)||"[]");return Array.isArray(x)?x:[];}catch{return [];}}
 function writeServiceParties(rows){try{localStorage.setItem(SERVICE_HANDOFF_KEY,JSON.stringify(rows));}catch{}}
 function servicePartyKey(x){return `${guestKey(x?.guest||"")}|${Number(x?.partySize||0)}|${String(x?.tableId||x?.table||"")}`;}
 function acceptServiceHandoff(detail={}){
   const guest=String(detail.guest||"").trim(); if(!guest)return;
   const next={guest,partySize:Number(detail.partySize||0),guestDetail:String(detail.guestDetail||""),source:String(detail.source||"host"),tableId:String(detail.tableId||detail.table||""),seatedAt:Date.now(),status:"seated"};
   const key=servicePartyKey(next), rows=readServiceParties().filter(x=>servicePartyKey(x)!==key);
   rows.unshift(next); writeServiceParties(rows.slice(0,100));
   window.dispatchEvent(new CustomEvent("bc:service-party-received",{detail:next}));
 }
 window.addEventListener("bc:host-guest-seated",e=>acceptServiceHandoff(e.detail||{}));
 window.BlueCurrentServiceHandoff={
   getActive:()=>readServiceParties().slice(),
   clear:(match)=>{const rows=readServiceParties();const keep=typeof match==="function"?rows.filter(x=>!match(x)):rows.filter(x=>servicePartyKey(x)!==String(match||""));writeServiceParties(keep);return keep.slice();}
 };
 // V100.2.51 — Service Active Tables. Make the Service handoff visible without changing the Host Stand floor lifecycle.
 function injectServiceWorkspaceStyles(){
   if(document.getElementById("bcServiceWorkspaceStylesV100251"))return;
   const style=document.createElement("style");style.id="bcServiceWorkspaceStylesV100251";
   style.textContent=`
   .bc-service-workspace-v251{position:fixed;inset:0;z-index:2147482000;background:rgba(7,33,43,.66);backdrop-filter:blur(8px);display:grid;place-items:center;padding:28px}
   .bc-service-workspace-v251[hidden]{display:none!important}
   .bc-service-shell-v251{width:min(1120px,94vw);max-height:88vh;overflow:hidden;background:#0d3440;border:1px solid rgba(117,210,218,.32);border-radius:28px;box-shadow:0 30px 90px rgba(0,0,0,.34);color:#fff;display:flex;flex-direction:column}
   .bc-service-head-v251{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:28px 30px 22px;border-bottom:1px solid rgba(255,255,255,.12)}
   .bc-service-head-v251 small{display:block;color:#8ed8e3;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px}.bc-service-head-v251 h2{margin:0;font-size:32px;line-height:1.05}.bc-service-head-v251 p{margin:8px 0 0;color:#c9e4e8;font-size:17px}
   .bc-service-close-v251{appearance:none;border:1px solid #b9c9cc;background:#fff;color:#092a34;width:54px;height:54px;border-radius:18px;font-size:30px;font-weight:900;cursor:pointer}
   .bc-service-summary-v251{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:20px 30px}.bc-service-summary-v251 div{background:#f4fbfc;color:#0b2b35;border-radius:18px;padding:16px 18px}.bc-service-summary-v251 span{display:block;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#54717a}.bc-service-summary-v251 strong{display:block;font-size:28px;margin-top:4px}
   .bc-service-list-v251{overflow:auto;padding:0 30px 30px;display:grid;gap:12px}.bc-service-party-v251{display:grid;grid-template-columns:minmax(0,1.6fr) .7fr .7fr auto;gap:16px;align-items:center;background:#154653;border:1px solid rgba(133,217,225,.24);border-radius:20px;padding:18px 20px}.bc-service-party-v251 strong{font-size:20px}.bc-service-party-v251 small{display:block;color:#c5e4e8;margin-top:4px;font-size:14px}.bc-service-party-v251 .meta span{display:block;color:#8fd6df;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.bc-service-party-v251 .meta b{display:block;font-size:18px;margin-top:2px}.bc-service-party-v251 button{border:1px solid #55c7d8;background:#0d7590;color:#fff;border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer}.bc-service-empty-v251{background:#f4fbfc;color:#0b2b35;border-radius:22px;padding:34px;text-align:center;font-size:18px}.bc-service-empty-v251 strong{display:block;font-size:24px;margin-bottom:8px}
   @media(max-width:760px){.bc-service-workspace-v251{padding:10px}.bc-service-shell-v251{width:100%;max-height:96vh;border-radius:20px}.bc-service-summary-v251{grid-template-columns:1fr}.bc-service-party-v251{grid-template-columns:1fr 1fr}.bc-service-party-v251>div:first-child{grid-column:1/-1}.bc-service-party-v251 button{grid-column:1/-1}.bc-service-head-v251 h2{font-size:26px}}
   `;document.head.appendChild(style);
 }
 function serviceElapsed(at){const mins=Math.max(0,Math.floor((Date.now()-Number(at||Date.now()))/60000));return mins<1?"Now":`${mins}m`;}
 function serviceTableLabel(p){return p.tableId||p.table||"Assigned table";}
 function renderServiceWorkspace(){
   injectServiceWorkspaceStyles();
   let overlay=document.getElementById("bcServiceWorkspaceV100251");
   if(!overlay){
     overlay=document.createElement("section");overlay.id="bcServiceWorkspaceV100251";overlay.className="bc-service-workspace-v251";overlay.hidden=true;overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","bcServiceWorkspaceTitleV100251");
     overlay.innerHTML=`<div class="bc-service-shell-v251"><header class="bc-service-head-v251"><div><small>Service · live</small><h2 id="bcServiceWorkspaceTitleV100251">Active tables</h2><p>Who was just seated and what service owns now.</p></div><button type="button" class="bc-service-close-v251" aria-label="Close Service">×</button></header><div class="bc-service-summary-v251"></div><div class="bc-service-list-v251"></div></div>`;
     document.body.appendChild(overlay);
     overlay.querySelector(".bc-service-close-v251")?.addEventListener("click",()=>{overlay.hidden=true;});
     overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.hidden=true;});
     document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!overlay.hidden)overlay.hidden=true;});
   }
   const rows=readServiceParties().filter(p=>p&&p.status!=="cleared");
   const covers=rows.reduce((n,p)=>n+Number(p.partySize||0),0);
   const oldest=rows.length?Math.max(...rows.map(p=>Math.max(0,Math.floor((Date.now()-Number(p.seatedAt||Date.now()))/60000)))):0;
   const summary=overlay.querySelector(".bc-service-summary-v251"),list=overlay.querySelector(".bc-service-list-v251");
   summary.innerHTML=`<div><span>Active tables</span><strong>${rows.length}</strong></div><div><span>Active covers</span><strong>${covers}</strong></div><div><span>Longest seated</span><strong>${rows.length?`${oldest}m`:"—"}</strong></div>`;
   list.innerHTML=rows.length?rows.map((p,i)=>`<article class="bc-service-party-v251" data-service-row="${i}"><div><strong>${escapeHtml(p.guest||"Guest")}</strong><small>${escapeHtml(p.guestDetail||`Party of ${p.partySize||"—"}`)}</small></div><div class="meta"><span>Table</span><b>${escapeHtml(serviceTableLabel(p))}</b></div><div class="meta"><span>Seated</span><b>${escapeHtml(serviceElapsed(p.seatedAt))}</b></div><button type="button" data-service-action="complete">Complete service</button></article>`).join(""):`<div class="bc-service-empty-v251"><strong>No active service handoffs</strong>Seat a party from the Host Stand and it will appear here automatically.</div>`;
   list.querySelectorAll('[data-service-action="complete"]').forEach((button,i)=>button.addEventListener("click",()=>{const row=rows[i];if(!row)return;window.BlueCurrentServiceHandoff?.clear?.(servicePartyKey(row));renderServiceWorkspace();}));
   return overlay;
 }
 function openServiceWorkspace(){const overlay=renderServiceWorkspace();overlay.hidden=false;requestAnimationFrame(()=>overlay.querySelector(".bc-service-close-v251")?.focus());}
 const serviceQuickButton=Array.from(host.querySelectorAll("button,a")).find(el=>/\bservice\b/i.test((el.textContent||"").trim())&&/run floor/i.test((el.textContent||"").trim()));
 if(serviceQuickButton&&!serviceQuickButton.dataset.bcServiceV251){serviceQuickButton.dataset.bcServiceV251="true";serviceQuickButton.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();openServiceWorkspace();});}
 window.addEventListener("bc:service-party-received",()=>{const overlay=document.getElementById("bcServiceWorkspaceV100251");if(overlay&&!overlay.hidden)renderServiceWorkspace();});
 window.BlueCurrentServiceWorkspace={open:openServiceWorkspace,render:renderServiceWorkspace};
 // Make queue tabs intentionally switch the visible queue inside Floor, while sidebar nav changes workspaces.
 host.querySelectorAll(".queue-tabs button").forEach(button=>button.setAttribute("aria-label",button.dataset.queue==="waitlist"?"Show live waitlist":"Show upcoming arrivals"));
});
})();