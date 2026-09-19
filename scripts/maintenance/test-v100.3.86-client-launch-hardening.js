"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
let passed=0;
function check(name,value){assert.ok(value,name);passed++;console.log(`PASS: ${name}`);}
check("Build advances to V100.3.86",pkg.version==="100.3.86");
check("Shell reports V100.3.86",shell.includes('version:"100.3.86"'));
check("Navigation activation is synchronous",shell.includes("activate(name,{scroll:true});"));
check("Navigation has post-interaction settlement checks",shell.includes("[0,80,320,900].forEach"));
check("Pointer navigation is captured",shell.includes('window.addEventListener("pointerdown"'));
check("Click navigation is captured",shell.includes('window.addEventListener("click"'));
check("Keyboard navigation supports Enter and Space",shell.includes('if(!["Enter"," "].includes(event.key))return;'));
for(const workspace of ["command","guests","service","team","kitchen","inventory","performance","executive","integrations","system"]){
  check(`${workspace} workspace is mapped`,shell.includes(`${workspace}:`)||shell.includes(`${workspace}:"`));
}
check("Touch controls enforce 44px minimum height",shell.includes("min-height:44px"));
check("Navigation exposes a visible keyboard focus ring",shell.includes(":focus-visible"));
console.log(`V100.3.86 client launch hardening ${passed}/${passed}`);
