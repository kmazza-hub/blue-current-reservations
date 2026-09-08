(() => {
"use strict";
// V100.2.69 — Manager Action Ownership / Accountability.
// Adds explicit human ownership to the existing V100.2.68 live Manager Actions view.
// It does not create a second action system and does not infer task status.
const LOCATION_ID="loc_marina";
const byId=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let api=null,currentUser=null,decorating=false,observer=null;

function ensureStyles(){
 if(byId("bcManagerOwnershipStylesV100269"))return;
 const s=document.createElement("style");s.id="bcManagerOwnershipStylesV100269";
 s.textContent=`
 .bc-mgr-owner-v269{display:flex;align-items:center;gap:8px;margin-top:7px;flex-wrap:wrap}
 .bc-mgr-owner-v269 small{display:inline-flex!important;align-items:center;width:max-content;padding:4px 7px;border-radius:999px;background:#edf4f6;color:#49636b!important;font-size:10px!important;font-weight:900!important;letter-spacing:.07em;text-transform:uppercase}
 .bc-mgr-owner-v269 small[data-owned="false"]{background:#fff1e6;color:#7a421f!important}
 .bc-mgr-owner-v269 button{padding:7px 9px!important;border-radius:9px!important;font-size:11px!important}
 .bc-manager-accountability-v269{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:0 0 16px}
 .bc-manager-accountability-v269 article{background:#f5fafb;border:1px solid #d9e6e8;border-radius:14px;padding:12px}
 .bc-manager-accountability-v269 span{display:block;color:#687f86;font-size:12px}.bc-manager-accountability-v269 strong{display:block;font-size:22px;margin-top:3px;color:#17343c}
 .bc-mgr-priority .bc-mgr-owner-v269 small{background:#1b4650;color:#d8eef2!important}
 @media(max-width:760px){.bc-manager-accountability-v269{grid-template-columns:1fr}}
 `;
 document.head.appendChild(s);
}
function actions(){
 const state=window.BlueCurrentManagerTruthV100_2_68?.getState?.();
 return Array.isArray(state?.actions?.actions)?state.actions.actions:[];
}
function ownerLabel(action){
 const owner=String(action?.assignedTo||"").trim();
 return owner?{owned:true,text:`Owner · ${owner}`}:{owned:false,text:"Unowned"};
}
async function user(){
 if(currentUser)return currentUser;
 try{
   api ||= new window.BlueCurrentCloudApi("");
   const result=await api.me();
   currentUser=result?.user||result||null;
 }catch{currentUser=null;}
 return currentUser;
}
function currentUserName(value){
 return String(value?.name||value?.displayName||value?.email||"").trim();
}
async function takeOwnership(id,button){
 if(!id)return;
 api ||= new window.BlueCurrentCloudApi("");
 button.disabled=true;const previous=button.textContent;button.textContent="Assigning…";
 try{
   const me=await user(),name=currentUserName(me);
   if(!name)throw new Error("Current manager identity is unavailable.");
   await api.updateManagerAction(id,{locationId:LOCATION_ID,assign:true,assignedTo:name});
   await window.BlueCurrentManagerTruthV100_2_68?.refresh?.();
   queueMicrotask(decorate);
 }catch(error){
   button.textContent="Try again";
   button.setAttribute("aria-label",error?.message||"Unable to take ownership");
   button.disabled=false;
   return;
 }
 if(button.isConnected){button.textContent=previous;button.disabled=false;}
}
function actionForElement(element){
 const button=element.querySelector("[data-bc-mgr-complete]");
 const id=button?.dataset?.bcMgrComplete;
 return id?actions().find(item=>String(item.id)===String(id)):null;
}
function addOwner(element,action){
 if(!element||!action||element.querySelector(":scope .bc-mgr-owner-v269"))return;
 const owner=ownerLabel(action),wrap=document.createElement("div");
 wrap.className="bc-mgr-owner-v269";
 wrap.innerHTML=`<small data-owned="${owner.owned}">${esc(owner.text)}</small>${owner.owned?"":`<button type="button" data-bc-mgr-take="${esc(action.id)}">Take ownership</button>`}`;
 const content=element.querySelector("div")||element;
 content.appendChild(wrap);
 wrap.querySelector("[data-bc-mgr-take]")?.addEventListener("click",event=>{
   event.preventDefault();event.stopPropagation();takeOwnership(action.id,event.currentTarget);
 });
}
function addSummary(view){
 view.querySelector(".bc-manager-accountability-v269")?.remove();
 const open=actions().filter(x=>!x.completed),unowned=open.filter(x=>!String(x.assignedTo||"").trim()),owned=open.length-unowned.length;
 const box=document.createElement("div");box.className="bc-manager-accountability-v269";
 box.innerHTML=`<article><span>Owned open actions</span><strong>${owned}</strong></article><article><span>Unowned open actions</span><strong>${unowned.length}</strong></article>`;
 const grid=view.querySelector(".bc-mgr-grid");
 grid?.insertAdjacentElement("beforebegin",box);
}
function decorate(){
 if(decorating)return;
 const view=document.querySelector("#command-center > .bc-manager-truth-v268");
 if(!view)return;
 decorating=true;observer?.disconnect();
 try{
   ensureStyles();addSummary(view);
   view.querySelectorAll(".bc-mgr-action").forEach(row=>addOwner(row,actionForElement(row)));
   const priority=view.querySelector(".bc-mgr-priority");
   if(priority){
     const action=actionForElement(priority);
     if(action)addOwner(priority,action);
   }
 }finally{
   observer?.observe(view,{childList:true,subtree:true});
   decorating=false;
 }
}
function init(){
 ensureStyles();
 const attach=()=>{
   const view=document.querySelector("#command-center > .bc-manager-truth-v268");
   if(!view){setTimeout(attach,100);return;}
   observer=new MutationObserver(()=>{if(!decorating)queueMicrotask(decorate);});
   observer.observe(view,{childList:true,subtree:true});
   decorate();
 };
 attach();
 window.BlueCurrentManagerOwnershipV100_2_69={decorate,getOpenActions:()=>actions().filter(x=>!x.completed).map(x=>({...x}))};
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();
