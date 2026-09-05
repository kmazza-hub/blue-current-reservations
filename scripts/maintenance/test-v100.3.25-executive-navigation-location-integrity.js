"use strict";
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
let passed=0,total=0;
function check(name,condition){total++;if(condition){passed++;console.log(`PASS ${total}: ${name}`)}else{console.error(`FAIL ${total}: ${name}`);process.exitCode=1}}
const analytics=read("client/js/modules/executiveAnalytics.js"),scorecards=read("client/js/modules/executiveScorecards.js"),brief=read("client/js/modules/executiveDailyBrief.js"),index=read("client/index.html");
for(const [name,source] of [["Analytics",analytics],["Scorecards",scorecards],["Daily Brief",brief]]){
  check(`${name} does not substitute Marina for missing identity`,!source.includes('dataset?.locationId || "loc_marina"'));
  check(`${name} excludes locationless district cards`,source.includes(".filter(location => location.id)"));
  check(`${name} blocks empty review navigation`,source.includes("if (!locationId) return"));
}
check("Analytics clears and disables unavailable focus",analytics.includes('focus.dataset.locationId = result.priorityLocation?.id || ""')&&analytics.includes("focus.disabled = !result.priorityLocation?.id"));
check("Scorecards clear and disable unavailable focus",scorecards.includes('focus.dataset.locationId = ranked.at(-1)?.id || ""')&&scorecards.includes("focus.disabled = !ranked.at(-1)?.id"));
check("Daily Brief clears and disables unavailable priority",brief.includes('priority.dataset.locationId = result.priorityLocation?.id || ""')&&brief.includes("priority.disabled = !result.priorityLocation?.id"));
check("Analytics cache key advances",index.includes("js/modules/executiveAnalytics.js?v=100.3.25"));
check("Scorecards cache key advances",index.includes("js/modules/executiveScorecards.js?v=100.3.25"));
check("Daily Brief cache key advances",index.includes("js/modules/executiveDailyBrief.js?v=100.3.25"));
check("Portfolio ranking behavior remains intact",analytics.includes("priorityLocation")&&scorecards.includes("locationScore(location)")&&brief.includes("location.risk"));
console.log(`V100.3.25 validation ${passed}/${total}`);if(passed!==total)process.exitCode=1;
