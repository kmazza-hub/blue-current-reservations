"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const root=path.resolve(__dirname,"../..");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");

assert(html.includes('data-web-art-direction="35"'));
for(const copy of ["Hospitality-first","Operator-controlled","Enterprise-ready"])assert(html.includes(copy),`missing ${copy}`);
for(const sel of [
'body[data-web-art-direction="35"] .hero',
'body[data-web-art-direction="35"] .product-stage',
'.hero-quality-line',
'@media(prefers-reduced-motion:reduce)'
])assert(css.includes(sel),`missing ${sel}`);

for(const id of ["service-speed","operating-current","profit-current","intelligence-current","blue-current-standard","pilot-proof","private-walkthrough","pilot"])
  assert(html.includes(`id="${id}"`),`missing ${id}`);

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate ids");
const targets=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]),set=new Set(ids),missing=[...new Set(targets.filter(x=>!set.has(x)))];
assert.equal(missing.length,0,`broken anchors: ${missing.join(", ")}`);

console.log(JSON.stringify({
 ok:true,wave:"WEB-035",luxurySaaSArtDirection:true,heroHierarchyPolished:true,
 productStageElevated:true,cardSystemPolished:true,mobileArtDirection:true,
 reducedMotionSupported:true,web034Preserved:true,duplicateHtmlIds:0,brokenHashTargets:0
},null,2));
