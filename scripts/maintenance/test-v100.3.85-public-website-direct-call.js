"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const candidates=["index.html","client/index.html"].filter(file=>fs.existsSync(path.join(root,file)));
const pkg=require(path.join(root,"package.json"));
let passed=0;
function check(name,value){assert.ok(value,name);passed++;console.log(`PASS: ${name}`);}
check("Build advances to V100.3.85",pkg.version==="100.3.85");
check("At least one public website entry exists",candidates.length>0);
for(const file of candidates){
  const html=fs.readFileSync(path.join(root,file),"utf8");
  check(`${file} removes Book a private demo`,!html.includes("Book a private demo"));
  check(`${file} removes Schedule a private walkthrough`,!html.includes("Schedule a private walkthrough"));
  check(`${file} exposes Keith's direct telephone link`,html.includes('href="tel:+18483090042"'));
  check(`${file} displays Keith's telephone number`,html.includes("Call Keith · 848-309-0042"));
  check(`${file} gives the call action an accessible name`,html.includes('aria-label="Call Keith at 848-309-0042"'));
}
console.log(`V100.3.85 public website direct call ${passed}/${passed}`);
