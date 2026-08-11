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

 function openDialog(mode,payload={}){
   dialogMode=mode;
   dialogEyebrow.textContent=mode==="reservation"?"RESERVATION":mode==="walkin"?"WALK-IN":"GUEST";
   dialogSubmit.hidden=mode==="details";
   if(mode==="reservation"){
     dialogTitle.textContent="Add reservation";
     dialogBody.innerHTML=`<div class="bc-dialog-grid">
       <label><span>Guest name</span><input name="guestName" required placeholder="Guest name"></label>
       <label><span>Time</span><input name="time" type="time" required value="19:30"></label>
       <label><span>Party size</span><input name="partySize" type="number" min="1" max="30" required value="2"></label>
       <label><span>Seating preference</span><select name="preference"><option>Flexible</option><option>Waterfront</option><option>Main dining</option><option>Bar</option><option>Accessible</option></select></label>
       <label class="wide"><span>Occasion / notes</span><input name="notes" placeholder="Birthday, allergy, high chair…"></label>
     </div>`;
     dialogSubmit.textContent="Add reservation";
   }else if(mode==="walkin"){
     dialogTitle.textContent="Add walk-in";
     dialogBody.innerHTML=`<div class="bc-dialog-grid">
       <label><span>Guest name</span><input name="guestName" required placeholder="Guest name"></label>
       <label><span>Party size</span><input name="partySize" type="number" min="1" max="30" required value="2"></label>
       <label><span>Preference</span><select name="preference"><option>Flexible</option><option>Bar okay</option><option>High chair</option><option>Accessible</option></select></label>
       <label><span>Quoted wait</span><input name="quotedWait" type="number" min="0" max="180" value="15"><small>minutes</small></label>
     </div>`;
     dialogSubmit.textContent="Add to waitlist";
   }else{
     dialogTitle.textContent=payload.name||"Guest details";
     dialogBody.innerHTML=`<div class="bc-guest-detail">
       <strong>${payload.name||"Guest"}</strong>
       <span>${payload.detail||"Tonight's guest"}</span>
       <div><small>Host focus</small><p>${payload.note||"Confirm timing, table preference, and any special occasion before seating."}</p></div>
     </div>`;
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
   const badge=document.getElementById("waitlistBadge"), waiting=document.getElementById("hostWaiting"), bc=document.getElementById("bcWaitCount");
   const next=Number(badge?.textContent||0)+1;
   if(badge)badge.textContent=String(next);if(waiting)waiting.textContent=String(next);if(bc)bc.textContent=String(next);
   document.getElementById("bcLongestWait").textContent=Math.max(18,Number(wait)||0)+" min";
 }
 function addReservation(name,time,party,preference,notes){
   const list=document.getElementById("bcReservationList");if(!list)return;
   const readable=time?new Date(`2000-01-01T${time}`).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"Tonight";
   const article=document.createElement("article");article.dataset.reservationName=name;
   article.innerHTML=`<time>${readable}</time><div><strong>${name}</strong><span>Party of ${party} · ${preference}${notes?` · ${notes}`:""}</span></div><b data-tone="expected">Expected</b><button type="button" data-reservation-action="details">Details</button>`;
   list.appendChild(article);wireReservation(article);
 }

 document.getElementById("hostAddReservation")?.addEventListener("click",()=>openDialog("reservation"));
 document.getElementById("bcReservationQuickAdd")?.addEventListener("click",()=>openDialog("reservation"));
 document.getElementById("addWalkIn")?.addEventListener("click",event=>{event.stopImmediatePropagation();openDialog("walkin");});
 document.getElementById("bcWalkInQuickAdd")?.addEventListener("click",()=>openDialog("walkin"));
 document.getElementById("hostSearchGuest")?.addEventListener("click",()=>{setView("guests");document.getElementById("bcGuestSearchInput")?.focus();});

 document.getElementById("bcHostDialogForm")?.addEventListener("submit",event=>{
   event.preventDefault();
   if(dialogMode==="details"){closeDialog();return;}
   const data=new FormData(event.currentTarget);
   if(dialogMode==="reservation")addReservation(String(data.get("guestName")||"Guest"),String(data.get("time")||""),String(data.get("partySize")||"2"),String(data.get("preference")||"Flexible"),String(data.get("notes")||""));
   if(dialogMode==="walkin")addWalkin(String(data.get("guestName")||"Walk-in"),String(data.get("partySize")||"2"),String(data.get("preference")||"Flexible"),String(data.get("quotedWait")||"15"));
   closeDialog();
 });

 function wireSeatButton(button){
   if(!button||button.dataset.bcWired)return;button.dataset.bcWired="true";
   button.addEventListener("click",()=>{
     const item=button.closest(".queue-item");if(!item)return;
     const guest=item.querySelector("strong")?.textContent||"Guest";
     button.textContent="Seated";button.disabled=true;item.classList.add("bc-seated");
     const badge=document.getElementById("waitlistBadge"),waiting=document.getElementById("hostWaiting"),bc=document.getElementById("bcWaitCount");
     const next=Math.max(0,Number(badge?.textContent||0)-1);
     if(badge)badge.textContent=String(next);if(waiting)waiting.textContent=String(next);if(bc)bc.textContent=String(next);
     const seated=document.getElementById("hostSeated");if(seated)seated.textContent=String(Number(seated.textContent||0)+Number((item.querySelector("small")?.textContent.match(/Party of (\d+)/)||[])[1]||0));
     item.setAttribute("aria-label",`${guest} seated`);
   });
 }
 host.querySelectorAll("#waitlistQueue .queue-item button").forEach(wireSeatButton);

 function wireReservation(article){
   const btn=article.querySelector('[data-reservation-action="details"]');if(!btn)return;
   btn.addEventListener("click",()=>{
     const name=article.querySelector("strong")?.textContent||"Guest";
     const detail=article.querySelector("span")?.textContent||"Tonight";
     openDialog("details",{name,detail,note:"Confirm arrival status, seating preference, and celebration notes before assigning a table."});
   });
 }
 host.querySelectorAll("#bcReservationList article").forEach(wireReservation);

 const guestData=[
   {name:"Anthony Russo",detail:"7:30 PM · Party of 4 · Birthday",note:"Waterfront preference. Birthday dessert note is loaded."},
   {name:"Melissa Grant",detail:"7:15 PM · Party of 2 · Anniversary",note:"Anniversary dinner. Guest has arrived."},
   {name:"Daniel Cho",detail:"7:45 PM · Party of 6",note:"Large party. Confirm table combination before arrival."},
   {name:"Alyssa Moore",detail:"8:00 PM · Party of 3 · High chair",note:"High chair requested. Confirm accessible path."}
 ];
 const search=document.getElementById("bcGuestSearchInput"),results=document.getElementById("bcGuestSearchResults");
 search?.addEventListener("input",()=>{
   const q=search.value.trim().toLowerCase();
   if(!q){results.innerHTML="<p>Search tonight’s guests and recent profiles.</p>";return;}
   const matches=guestData.filter(x=>x.name.toLowerCase().includes(q));
   results.innerHTML=matches.length?matches.map((x,i)=>`<button type="button" data-guest-result="${i}"><strong>${x.name}</strong><span>${x.detail}</span></button>`).join(""):"<p>No matching guest found.</p>";
   results.querySelectorAll("[data-guest-result]").forEach((b,i)=>b.addEventListener("click",()=>openDialog("details",matches[i])));
 });

 // Make queue tabs intentionally switch the visible queue inside Floor, while sidebar nav changes workspaces.
 host.querySelectorAll(".queue-tabs button").forEach(button=>button.setAttribute("aria-label",button.dataset.queue==="waitlist"?"Show live waitlist":"Show upcoming arrivals"));
});
})();