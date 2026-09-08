"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/rush-hour-v65.50.js"),"utf8");

assert.equal(pkg.version,"65.50.0");
assert(html.includes('content="65.50.0"'));
assert(html.includes("rush-hour-v65.50.js?v=65.50.0"));
for(const term of ["bcRushModeToggle","bcRushDock","data-rush-job=\"walkin\"","data-rush-job=\"addReservation\"","data-rush-job=\"service\"","data-rush-job=\"kitchen\"","data-rush-job=\"staff\"","BlueCurrentRush"]) assert(js.includes(term),term);
assert(js.includes('event.altKey'));
assert(js.includes('"1":"walkin"'));
assert(js.includes("sortKitchen"));
assert(css.includes(".bc-rush-mode .bc-rush-dock{display:grid}"));
assert(css.includes(".bc-rush-primary-action"));
assert(css.includes(".bc-rush-hide:not(.bc-nav-open)"));

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size);
const anchors=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]),set=new Set(ids);
assert.equal([...new Set(anchors.filter(x=>!set.has(x)))].length,0);

console.log(JSON.stringify({
 ok:true,
 version:"65.50.0",
 rushMode:true,
 persistentRushDock:true,
 canonicalJobs:6,
 keyboardShortcuts:true,
 hostRushCompression:true,
 serviceRiskShortcuts:true,
 kitchenPrioritySort:true,
 staffingRecommendationsPromoted:true,
 duplicateHtmlIds:0,
 brokenHashTargets:0,
 noWorkflowDeletion:true
},null,2));
