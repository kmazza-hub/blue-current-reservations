"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");
const vm=require("vm");
const {spawn}=require("child_process");

const root=path.resolve(__dirname,"../..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const pkg=require(path.join(root,"package.json"));
const html=read("client/index.html");
const css=read("client/styles.css");
const firstUse=read("client/js/empty-recovery-v65.0.js");
const manifestSource=JSON.parse(read("client/manifest.webmanifest"));

function simulateDismissal(eventName,{throwOnWrite=false}={}){
  const handlers={};
  const button={
    addEventListener(name,handler){handlers[name]=handler;}
  };
  const hint={
    removed:false,
    setAttribute(){},
    querySelector(){return button;},
    remove(){this.removed=true;}
  };
  const utility={insertAdjacentElement(_position,node){assert.strictEqual(node,hint);}};
  const document={
    readyState:"complete",
    documentElement:{dataset:{}},
    getElementById(id){return id==="bcOperatorUtilityBar"?utility:null;},
    createElement(){return hint;}
  };
  const localStorage={
    getItem(){return null;},
    setItem(){if(throwOnWrite)throw new Error("storage unavailable");}
  };
  const window={addEventListener(){},dispatchEvent(){}};
  vm.runInNewContext(firstUse,{document,window,localStorage,CustomEvent:function(){},MutationObserver:function(){}},{filename:"empty-recovery-v65.0.js"});
  assert.equal(typeof handlers[eventName],"function",`${eventName} dismissal handler must be installed`);
  handlers[eventName]({pointerType:"touch"});
  assert.equal(hint.removed,true,`${eventName} must remove the first-use card`);
  assert.equal(document.documentElement.dataset.bcFirstUseDismissed,"true",`${eventName} must expose dismissed state`);
}

const version=String(pkg.version).split(".").map(Number);
assert(version[0]===100&&version[1]===3&&version[2]>=97,"build must retain V100.3.97 or later");
assert(Boolean(pkg.scripts["certify:pilot"]),"a pilot certification command must remain registered");
assert(html.includes(`name="blue-current-build" content="${pkg.version}"`));
assert(html.includes(`styles.css?v=${pkg.version}`));
assert(html.includes(`empty-recovery-v65.0.js?v=${pkg.version}`));
assert(html.includes(`manifest.webmanifest?v=${pkg.version}`));
assert(firstUse.indexOf("hint.remove()")<firstUse.indexOf('localStorage.setItem(KEY,"seen")'),"visible dismissal must precede optional persistence");
assert(firstUse.includes('aria-label="Dismiss getting started guidance"'));
assert.match(css,/\.bc-first-use-hint button\{[^}]*min-height:48px!important[^}]*pointer-events:auto[^}]*touch-action:manipulation/);
assert.match(css,/@media \(display-mode:standalone\) and \(pointer:coarse\)[\s\S]*safe-area-inset-top[\s\S]*safe-area-inset-bottom/);
assert.match(css,/@media\(max-width:760px\)[\s\S]*\.bc-first-use-hint[\s\S]*width:calc\(100% - 24px\)/);
for(const width of [420,700,760,900,1100,1366])assert(css.includes(`max-width:${width}px`)||css.includes(`max-width: ${width}px`),`responsive contract must include ${width}px breakpoint`);
for(const workspace of ["command","guests","service","kitchen","team","inventory","performance","integrations","executive","system"]){
  assert(html.includes(`data-bc-workspace="${workspace}"`),`${workspace} view must remain reachable`);
}
simulateDismissal("click",{throwOnWrite:true});
simulateDismissal("pointerup");
assert.equal(manifestSource.short_name,"Blue Current");
assert.ok(manifestSource.icons.some(icon=>icon.purpose==="maskable"&&icon.sizes==="512x512"));

console.log("PASS V100.3.97 — iPhone dismissal, safe areas, touch targets, and all ten responsive workspace routes are intact.");
