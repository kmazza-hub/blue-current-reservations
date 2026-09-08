(()=>{
"use strict";
const ROLE_KEY="bluecurrent.operatorRole";
const roleMap={
 host:{label:"Host",targets:["host-stand","operating-current"],now:"Arrivals, waitlist, and table availability",next:"Seat the right party with guest context",later:"Review upcoming reservation pressure"},
 server:{label:"Server",targets:["operating-current"],now:"Assigned tables and guest needs",next:"Service timing and exceptions",later:"Prepare the next turn"},
 kitchen:{label:"Kitchen",targets:["operating-current"],now:"Tickets requiring action",next:"Station pressure and plating",later:"Upcoming demand"},
 manager:{label:"Manager",targets:["operating-current","profit-current"],now:"Exceptions requiring intervention",next:"Protect the next 30 minutes",later:"Review shift performance"},
 executive:{label:"Executive",targets:["executive-command-center","profit-current"],now:"Material risk and profit impact",next:"Accountable actions",later:"Portfolio trend"}
};
function target(id){return document.getElementById(id)}
function emit(role){
 const detail={role,...roleMap[role]};
 window.dispatchEvent(new CustomEvent("bluecurrent:operator-role-changed",{detail}));
 document.documentElement.dataset.operatorRole=role;
 try{localStorage.setItem(ROLE_KEY,role)}catch{}
}
function init(){
 const root=document.getElementById("operatorRoleFocus");
 if(!root)return;
 const select=root.querySelector("[data-operator-role]");
 const now=root.querySelector("[data-focus-now]");
 const next=root.querySelector("[data-focus-next]");
 const later=root.querySelector("[data-focus-later]");
 const open=root.querySelector("[data-focus-open]");
 const render=()=>{
   const role=select.value in roleMap?select.value:"manager", cfg=roleMap[role];
   now.textContent=cfg.now; next.textContent=cfg.next; later.textContent=cfg.later;
   open.textContent=`Open ${cfg.label} workspace`;
   emit(role);
 };
 select.addEventListener("change",render);
 open.addEventListener("click",()=>{
   const cfg=roleMap[select.value]||roleMap.manager;
   const destination=cfg.targets.map(target).find(Boolean);
   destination?.scrollIntoView({behavior:"smooth",block:"start"});
 });
 let saved="manager";try{saved=localStorage.getItem(ROLE_KEY)||"manager"}catch{}
 if(saved in roleMap)select.value=saved;
 render();
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();