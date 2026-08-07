(function(){"use strict";
function createBlueCurrentSourceAdapterRegistryCenterModule(eventBus){
const root=document.getElementById("sourceAdapterRegistryCenter");if(!root||!window.BlueCurrentSourceAdapterRegistryEngine)return null;
const e=new window.BlueCurrentSourceAdapterRegistryEngine(eventBus),$=id=>document.getElementById(id);let rows=[];
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
async function render(){try{rows=await e.adapters();$("sourceAdapterCount").textContent=rows.length;$("sourceAdapterDomains").textContent=new Set(rows.map(x=>x.sourceType)).size;$("sourceAdapterStatus").textContent=rows.length?"Mapping ready":"No adapters";$("sourceAdapterList").innerHTML=rows.map(x=>`<article><div><strong>${esc(x.name)}</strong><span>${esc(x.sourceType)} · ${esc(x.events.join(", "))}</span><small>${esc(x.note)}</small></div><b class="pass">${esc(x.status)}</b></article>`).join("");}catch(err){$("sourceAdapterStatus").textContent=err.message;}}
$("sourceAdapterRefresh")?.addEventListener("click",render);render();return{engine:e,render};}
window.createBlueCurrentSourceAdapterRegistryCenterModule=createBlueCurrentSourceAdapterRegistryCenterModule;})();