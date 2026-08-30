(() => {
"use strict";
// V100.2.68 — Manager Operations Truth Foundation.
// Primary manager command uses the live Manager Actions + Operations Feed APIs.
// It intentionally avoids the legacy Command Center readiness/forecast layer.
const LOCATION_ID="loc_marina";
const byId=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let api=null,loading=false,timer=null,last=null;

function ensureStyles(){
 if(byId("bcManagerTruthStylesV100268"))return;
 const s=document.createElement("style");s.id="bcManagerTruthStylesV100268";
 s.textContent=`
 #command-center.bc-manager-truth-active-v268>:not(.bc-manager-truth-v268){display:none!important}
 .bc-manager-truth-v268{max-width:1180px;margin:0 auto;padding:32px 24px;color:#17343c}
 .bc-manager-truth-v268 .bc-mgr-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.bc-manager-truth-v268 .bc-mgr-head small{display:block;color:#657d84;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.bc-manager-truth-v268 .bc-mgr-head h2{margin:4px 0 7px;font-size:32px}.bc-manager-truth-v268 .bc-mgr-head p{margin:0;color:#60777e;max-width:760px}.bc-manager-truth-v268 button{border:0;border-radius:12px;padding:11px 14px;background:#0c6978;color:#fff;font-weight:900;cursor:pointer}
 .bc-manager-truth-v268 .bc-mgr-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.bc-manager-truth-v268 .bc-mgr-kpis article{background:#f5fafb;border:1px solid #d9e6e8;border-radius:17px;padding:15px}.bc-manager-truth-v268 .bc-mgr-kpis span{display:block;color:#687f86;font-size:13px}.bc-manager-truth-v268 .bc-mgr-kpis strong{display:block;font-size:28px;margin-top:3px}
 .bc-manager-truth-v268 .bc-mgr-priority{display:flex;justify-content:space-between;gap:18px;align-items:center;background:#0d303a;color:#fff;border-radius:19px;padding:16px 18px;margin-bottom:16px}.bc-manager-truth-v268 .bc-mgr-priority small{display:block;color:#9ed4dd;font-size:10px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.bc-manager-truth-v268 .bc-mgr-priority strong{display:block;font-size:20px;margin-top:3px}.bc-manager-truth-v268 .bc-mgr-priority span{display:block;color:#d2e4e8;font-size:13px;margin-top:4px}.bc-manager-truth-v268 .bc-mgr-priority[data-tone="high"]{box-shadow:inset 4px 0 0 #ffad7a}
 .bc-manager-truth-v268 .bc-mgr-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:14px}.bc-manager-truth-v268 .bc-mgr-panel{background:#fff;border:1px solid #dbe7e9;border-radius:18px;padding:16px}.bc-manager-truth-v268 .bc-mgr-panel h3{margin:0 0 12px}.bc-manager-truth-v268 .bc-mgr-action,.bc-manager-truth-v268 .bc-mgr-feed{border-top:1px solid #e7eef0;padding:12px 0}.bc-manager-truth-v268 .bc-mgr-action:first-child,.bc-manager-truth-v268 .bc-mgr-feed:first-child{border-top:0}.bc-manager-truth-v268 .bc-mgr-action{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}.bc-manager-truth-v268 .bc-mgr-action small,.bc-manager-truth-v268 .bc-mgr-feed small{display:block;color:#71858b}.bc-manager-truth-v268 .bc-mgr-action strong,.bc-manager-truth-v268 .bc-mgr-feed strong{display:block}.bc-manager-truth-v268 .bc-mgr-empty{padding:18px;background:#f7fbfc;border-radius:14px;color:#526a71}.bc-manager-truth-v268 .bc-mgr-source{margin-top:14px;color:#70858b;font-size:12px}
 @media(max-width:760px){.bc-manager-truth-v268{padding:20px 12px}.bc-manager-truth-v268 .bc-mgr-head,.bc-manager-truth-v268 .bc-mgr-priority{display:block}.bc-manager-truth-v268 .bc-mgr-head button,.bc-manager-truth-v268 .bc-mgr-priority button{margin-top:12px;width:100%}.bc-manager-truth-v268 .bc-mgr-kpis{grid-template-columns:1fr}.bc-manager-truth-v268 .bc-mgr-grid{grid-template-columns:1fr}.bc-manager-truth-v268 .bc-mgr-action{grid-template-columns:1fr}}
 `;
 document.head.appendChild(s);
}
function shell(){
 const root=byId("command-center");if(!root)return null;
 root.classList.add("bc-manager-truth-active-v268");
 let view=root.querySelector(":scope > .bc-manager-truth-v268");
 if(!view){view=document.createElement("div");view.className="bc-manager-truth-v268";root.appendChild(view);}
 return view;
}
function rank(action){return ({high:0,medium:1,low:2}[String(action?.priority||"").toLowerCase()]??9);}
function openActions(payload){return (payload?.actions||[]).filter(x=>!x.completed).sort((a,b)=>rank(a)-rank(b)||new Date(a.createdAt||0)-new Date(b.createdAt||0));}
function render(actionsPayload,feedPayload){
 last={actions:actionsPayload,feed:feedPayload};
 const view=shell();if(!view)return;
 const open=openActions(actionsPayload),high=open.filter(x=>String(x.priority).toLowerCase()==="high"),automatic=open.filter(x=>x.automatic),first=open[0]||null,events=(feedPayload?.events||[]).slice(0,6);
 const priority=first?{tone:String(first.priority||"medium").toLowerCase(),title:first.title,detail:`${first.source||"Operations"} · ${first.due||"Due today"}`}:{tone:"clear",title:"No open manager actions",detail:"The live manager action list is clear."};
 view.innerHTML=`<div class="bc-mgr-head"><div><small>Manager · live operations</small><h2>What needs a manager right now?</h2><p>This view uses the live Manager Actions and Operations Feed records only. Forecast revenue, synthetic readiness scores, and speculative recommendations stay out of the primary shift command.</p></div><button type="button" data-bc-mgr-refresh>Refresh</button></div>
 <div class="bc-mgr-kpis"><article><span>Open actions</span><strong>${open.length}</strong></article><article><span>High priority</span><strong>${high.length}</strong></article><article><span>System-sourced</span><strong>${automatic.length}</strong></article></div>
 <div class="bc-mgr-priority" data-tone="${esc(priority.tone)}"><div><small>First priority</small><strong>${esc(priority.title)}</strong><span>${esc(priority.detail)}</span></div>${first?`<button type="button" data-bc-mgr-complete="${esc(first.id)}">Mark complete</button>`:""}</div>
 <div class="bc-mgr-grid"><section class="bc-mgr-panel"><h3>Open actions</h3>${open.length?open.slice(0,8).map(a=>`<article class="bc-mgr-action"><div><small>${esc(a.source||"Operations")} · ${esc(a.priority||"medium")} · ${esc(a.due||"Due today")}</small><strong>${esc(a.title)}</strong></div><button type="button" data-bc-mgr-complete="${esc(a.id)}">Complete</button></article>`).join(""):`<div class="bc-mgr-empty"><strong>No open actions.</strong><div>Nothing in the live action list currently requires manager ownership.</div></div>`}</section>
 <section class="bc-mgr-panel"><h3>Recent operating activity</h3>${events.length?events.map(e=>`<article class="bc-mgr-feed"><small>${esc(e.category||"operations")} · ${e.occurredAt?esc(new Date(e.occurredAt).toLocaleTimeString()):"recent"}</small><strong>${esc(e.title||"Operating update")}</strong>${e.detail?`<small>${esc(e.detail)}</small>`:""}</article>`).join(""):`<div class="bc-mgr-empty">No recent operating events.</div>`}</section></div>
 <div class="bc-mgr-source">Source: Manager Actions API + Operations Feed API · human completion remains explicit · no legacy readiness score or financial forecast used</div>`;
 view.querySelector("[data-bc-mgr-refresh]")?.addEventListener("click",load);
 view.querySelectorAll("[data-bc-mgr-complete]").forEach(button=>button.addEventListener("click",()=>complete(button.dataset.bcMgrComplete,button)));
 window.dispatchEvent(new CustomEvent("bluecurrent:manager-operations-rendered",{detail:{version:"100.2.68",openActions:open.length}}));
}
async function complete(id,button){
 if(!id||!api)return;
 button.disabled=true;const old=button.textContent;button.textContent="Saving…";
 try{await api.updateManagerAction(id,{locationId:LOCATION_ID,completed:true});await load();}
 catch(error){button.textContent="Try again";button.setAttribute("aria-label",error?.message||"Unable to complete action");}
 finally{if(button.isConnected&&!button.disabled)button.textContent=old;}
}
async function load(){
 if(loading)return;loading=true;ensureStyles();shell();
 try{
   api ||= new window.BlueCurrentCloudApi("");
   if(!api?.token)throw new Error("Sign in to load live manager operations.");
   const [actions,feed]=await Promise.all([api.managerActions(LOCATION_ID),api.operationsFeed(LOCATION_ID,"all",20)]);
   render(actions||{actions:[]},feed||{events:[]});
 }catch(error){
   const view=shell();if(view)view.innerHTML=`<div class="bc-mgr-head"><div><small>Manager · live operations</small><h2>Manager operations unavailable</h2><p>Blue Current will not substitute forecast/demo command data when the live action sources are unavailable.</p></div><button type="button" data-bc-mgr-refresh>Try again</button></div><div class="bc-mgr-empty"><strong>Live manager sources unavailable.</strong><div>${esc(error?.message||"Unable to load manager actions.")}</div></div>`;
   view?.querySelector("[data-bc-mgr-refresh]")?.addEventListener("click",load);
 }finally{loading=false;}
}
function init(){
 if(!byId("command-center"))return;ensureStyles();load();timer=setInterval(load,30000);
 window.BlueCurrentManagerTruthV100_2_68={refresh:load,getState:()=>last?JSON.parse(JSON.stringify(last)):null,destroy:()=>clearInterval(timer)};
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();