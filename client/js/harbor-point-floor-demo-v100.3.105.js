(()=>{
  "use strict";
  const rooms=[
    {id:"inlet",name:"Inlet Room",prefix:"I",count:6},
    {id:"sunset",name:"Sunset Ballroom",prefix:"S",count:12}
  ];
  const $=id=>document.getElementById(id);
  function mount(){
    const trigger=$("bcHarborPointDemoOpen");
    if(!trigger||$("bcHarborPointDemo"))return;
    const dialog=document.createElement("dialog");
    dialog.id="bcHarborPointDemo";
    dialog.className="bc-harbor-demo";
    dialog.setAttribute("aria-labelledby","bcHarborDemoTitle");
    dialog.innerHTML=`<div class="bc-harbor-shell"><header><div><small>BLUE CURRENT · FLOOR PREVIEW</small><h2 id="bcHarborDemoTitle">Harbor Point</h2><p>Illustrative seating layout · 83 Channel Drive, Point Pleasant Beach</p></div><button type="button" data-close aria-label="Close Harbor Point demo">Close</button></header><div class="bc-harbor-notice">DEMO ONLY · Table positions, counts, capacities and accessibility are awaiting venue approval. No live floor or reservations are changed.</div><nav aria-label="Demo rooms"></nav><section class="bc-harbor-room" aria-live="polite"></section><footer><span>Tap a sample table to inspect its identity.</span><button type="button" data-close>Return to Host Stand</button></footer></div>`;
    document.body.appendChild(dialog);
    const nav=dialog.querySelector("nav"),panel=dialog.querySelector(".bc-harbor-room");
    function show(room){
      nav.innerHTML=rooms.map(item=>`<button type="button" data-room="${item.id}" aria-pressed="${item.id===room.id}">${item.name}</button>`).join("");
      panel.innerHTML=`<div class="bc-harbor-room-head"><h3>${room.name}</h3><span>${room.count} sample tables</span></div><div class="bc-harbor-map" role="group" aria-label="${room.name} sample tables">${Array.from({length:room.count},(_,index)=>{const label=`${room.prefix}${String(index+1).padStart(2,"0")}`;return `<button type="button" class="bc-harbor-table" data-table="${label}" aria-label="Sample table ${label}">${label}</button>`;}).join("")}</div><p class="bc-harbor-selection" role="status">Choose a table to inspect the sample layout.</p>`;
    }
    show(rooms[0]);
    trigger.addEventListener("click",()=>{show(rooms[0]);dialog.showModal();});
    dialog.addEventListener("click",event=>{
      if(event.target.matches("[data-close]")){dialog.close();trigger.focus();return;}
      const roomButton=event.target.closest("[data-room]");
      if(roomButton){const room=rooms.find(item=>item.id===roomButton.dataset.room);if(room)show(room);return;}
      const table=event.target.closest("[data-table]");
      if(table){panel.querySelectorAll("[data-table]").forEach(button=>button.setAttribute("aria-pressed",String(button===table)));panel.querySelector(".bc-harbor-selection").textContent=`${roomName()} · ${table.dataset.table} · sample table. Capacity and placement await confirmation.`;}
    });
    function roomName(){return nav.querySelector('[aria-pressed="true"]')?.textContent||"Demo room";}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
