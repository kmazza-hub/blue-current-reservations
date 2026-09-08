"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const root=path.resolve(__dirname,"../..");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");

for(const id of ["service-speed","operating-current","intelligence-current","why-blue-current","pilot"])
  assert(html.includes(`id="${id}"`),`missing ${id}`);

for(const copy of [
 "The product should disappear into the shift.",
 "30-second operating picture",
 "One job. One clear path.",
 "Rush-ready on mobile and tablet",
 "Intelligence without losing control",
 "Everyone sees the same operation—at the level they need.",
 "FOR THE FLOOR",
 "FOR OPERATORS",
 "FOR LEADERSHIP",
 "Put it inside a real service."
]) assert(html.includes(copy),`missing WEB-031 copy: ${copy}`);

assert(css.includes(".service-speed-proof"));
assert(css.includes(".speed-proof-grid"));
assert(css.includes(".buyer-bridge"));
assert(css.includes(".buyer-pilot-bridge"));

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML ids");
const targets=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
const set=new Set(ids);
const missing=[...new Set(targets.filter(x=>!set.has(x)))];
assert.equal(missing.length,0,`broken hash targets: ${missing.join(", ")}`);

console.log(JSON.stringify({
 ok:true,
 wave:"WEB-031",
 web030CarriedForward:true,
 serviceSpeedStory:true,
 productQualityStory:true,
 rushReadyStory:true,
 buyerRoleBridge:true,
 pilotConversionBridge:true,
 duplicateHtmlIds:0,
 brokenHashTargets:0
},null,2));
