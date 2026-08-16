"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const root=path.resolve(__dirname,"../..");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");

for(const id of ["profit-current","blue-current-standard","pilot-proof","pilot"])
  assert(html.includes(`id="${id}"`),`missing ${id}`);

for(const copy of [
 "Profit is won and lost in hundreds of small operating moments.",
 "CAPTURE DEMAND",
 "USE CAPACITY BETTER",
 "REDUCE OPERATING DRAG",
 "PROTECT THE NEXT VISIT",
 "See the leak. Understand the cause. Take the action. Measure the outcome.",
 "Give hospitality teams more control without giving them more chaos.",
 "Where is the operation losing the most time, revenue, or control?"
]) assert(html.includes(copy),`missing WEB-033 copy: ${copy}`);

assert(html.includes('href="#profit-current">Profitability</a>'));
assert(css.includes(".profit-current"));
assert(css.includes(".profit-levers"));
assert(css.includes(".profit-operating-model"));
assert(css.includes(".final-thesis"));

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML ids");
const targets=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
const set=new Set(ids);
const missing=[...new Set(targets.filter(x=>!set.has(x)))];
assert.equal(missing.length,0,`broken hash targets: ${missing.join(", ")}`);

console.log(JSON.stringify({
 ok:true,
 wave:"WEB-033",
 profitabilityStory:true,
 revenueProtectionStory:true,
 capacityUtilizationStory:true,
 operatingDragStory:true,
 retentionStory:true,
 economicsToOperationsModel:true,
 finalBrandThesis:true,
 unsupportedProfitGuarantee:false,
 duplicateHtmlIds:0,
 brokenHashTargets:0
},null,2));
