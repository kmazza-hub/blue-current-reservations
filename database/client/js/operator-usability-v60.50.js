(function(){
"use strict";
const STORAGE="blueCurrentWorkspaceMode";
function humanize(value){
 return String(value||"")
  .replace(/^v\d+/i,"")
  .replace(/([a-z0-9])([A-Z])/g,"$1 $2")
  .replace(/[-_]+/g," ")
  .replace(/\s+/g," ")
  .trim()
  .replace(/\b\w/g,c=>c.toUpperCase());
}
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
ready(()=>{
 const main=document.getElementById("main"); if(!main)return;

 // ---------- Global workspace modes ----------
 const primary=Array.from(main.querySelectorAll(':scope > section[data-bc-priority="primary"]'));
 const support=Array.from(main.querySelectorAll(':scope > section[data-bc-priority="support"]'));
 const deep=Array.from(main.querySelectorAll(':scope > section[data-bc-priority="deep"]'));

 // Product-facing shift focus strip.
 const command=document.getElementById("command-center");
 if(command && !document.getElementById("bcShiftFocusBar")){
   const bar=document.createElement("section");
   bar.id="bcShiftFocusBar";
   bar.className="bc-shift-focus-bar container";
   bar.innerHTML=`
    <div class="bc-shift-focus-copy">
      <small>SHIFT FOCUS</small>
      <strong>Only what the restaurant needs right now.</strong>
      <span>Primary service work stays visible. Insights, specialist tools, and release controls stay one click away.</span>
    </div>
    <div class="bc-shift-focus-actions">
      <button type="button" class="button button-primary button-small" id="bcFocusMode">Shift Focus</button>
      <button type="button" class="button button-light button-small" id="bcInsightsToggle">Show insights</button>
    </div>`;
   main.insertBefore(bar,command);
 }

 let mode=localStorage.getItem(STORAGE)||"focus";
 let insightsOpen=new URLSearchParams(location.search).get("insights")==="1";
 function applyWorkspace(){
   document.documentElement.classList.toggle("bc-shift-focus",mode==="focus");
   document.documentElement.classList.toggle("bc-full-workspace",mode==="full");
   document.documentElement.classList.toggle("bc-insights-open",insightsOpen||mode==="full");
   support.forEach(x=>x.setAttribute("aria-hidden",(mode==="focus"&&!insightsOpen)?"true":"false"));
   const focus=document.getElementById("bcFocusMode");
   if(focus){
     focus.textContent=mode==="focus"?"Shift Focus ✓":"Use Shift Focus";
     focus.setAttribute("aria-pressed",String(mode==="focus"));
   }
   const insights=document.getElementById("bcInsightsToggle");
   if(insights){
     const open=insightsOpen||mode==="full";
     insights.textContent=open?"Hide insights":"Show insights";
     insights.setAttribute("aria-expanded",String(open));
   }
 }
 document.getElementById("bcFocusMode")?.addEventListener("click",()=>{
   mode=mode==="focus"?"full":"focus";
   if(mode==="full")insightsOpen=true;
   localStorage.setItem(STORAGE,mode);applyWorkspace();
 });
 document.getElementById("bcInsightsToggle")?.addEventListener("click",()=>{
   insightsOpen=!insightsOpen;
   if(!insightsOpen)mode="focus";
   localStorage.setItem(STORAGE,mode);applyWorkspace();
 });
 applyWorkspace();

 // ---------- Make section purpose explicit ----------
 const topLevel=Array.from(main.querySelectorAll(":scope > section[id]"));
 topLevel.forEach(section=>{
   // V100.2.0: do not inject legacy purpose/priority presentation into the
   // Hospitality OS application shell.
   if(section.id==="blueCurrentCommand" || section.classList.contains("bc-os-shell"))return;
   if(section.classList.contains("bc-advanced-surface"))return;
   if(section.querySelector(":scope > .bc-purpose-chip"))return;
   const priority=section.dataset.bcPriority||"deep";
   const chip=document.createElement("div");
   chip.className="bc-purpose-chip bc-purpose-auto";
   if(priority==="support")chip.textContent="Supporting insight · use when you need more context";
   else if(priority==="deep")chip.textContent="Specialist tool · open only when needed";
   else chip.textContent="Primary workspace · live restaurant operation";
   section.prepend(chip);
 });

 // ---------- Accessible, understandable controls ----------
 const controls=Array.from(document.querySelectorAll("button,input,select,textarea"));
 controls.forEach(control=>{
   const type=(control.getAttribute("type")||"").toLowerCase();
   if(type==="hidden")return;
   const text=(control.textContent||"").replace(/\s+/g," ").trim();
   const placeholder=(control.getAttribute("placeholder")||"").trim();
   const current=control.getAttribute("aria-label")||control.getAttribute("title")||placeholder||text;
   if(!current){
     const inferred=humanize(control.id||control.name||control.dataset.action||control.dataset.command||"Control");
     control.setAttribute("aria-label",inferred);
     if(control.tagName==="BUTTON")control.setAttribute("title",inferred);
   } else if(control.tagName==="BUTTON"&&!control.getAttribute("title")&&text.length<=3){
     control.setAttribute("title",current);
   }
   control.classList.add("bc-touch-control");
 });

 // Visual treatment for actions: destructive/hold actions are not styled like primary progress.
 document.querySelectorAll("button").forEach(button=>{
   const label=((button.textContent||"")+" "+(button.getAttribute("aria-label")||"")).toLowerCase();
   if(/\b(delete|remove|rollback|retire|hold|reject|cancel)\b/.test(label))button.classList.add("bc-action-caution");
   else if(/\b(save|confirm|approve|accept|seat|assign|create|add|release|ship|continue|start)\b/.test(label))button.classList.add("bc-action-primary");
   else if(/\b(refresh|view|show|open|details|export|download|copy|print)\b/.test(label))button.classList.add("bc-action-secondary");
 });

 // Prevent "dashboards of dashes": visually de-emphasize empty placeholders while making real values stronger.
 document.querySelectorAll("strong,span").forEach(node=>{
   const t=(node.textContent||"").trim();
   if(t==="—"||t==="0/0"||t==="0%"||t==="$0")node.classList.add("bc-empty-value");
 });

 // V64.50: the duplicate sticky workspace jump bar was retired.
 // The primary top navigation is now the single canonical workspace navigation layer.
 document.getElementById("bcPrimaryJump")?.remove();
});
})();