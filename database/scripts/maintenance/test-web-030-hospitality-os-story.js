"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const root=path.resolve(__dirname,"../..");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");

for(const id of ["operating-current","intelligence-current","host-stand","ai-concierge","executive-command-center","pilot"])
  assert(html.includes(`id="${id}"`),`missing ${id}`);

for(const copy of [
 "The guest experience is only the beginning.",
 "Know the shift in seconds.",
 "Put the right coverage where the rush needs it.",
 "Protect throughput before the guest feels the delay.",
 "Keep tables, servers, expo, and kitchen moving together.",
 "Turn the noise of the operation into one clear decision.",
 "Restaurant AI Brain",
 "Enterprise controls that stay out of the way of hospitality."
]) assert(html.includes(copy),`missing story copy: ${copy}`);

assert(html.includes('href="#operating-current">Operations</a>'));
assert(html.includes('href="#intelligence-current">AI Brain</a>'));
assert(html.includes('href="#ai-concierge">Concierge</a>'));
assert(css.includes(".hospitality-os-story"));
assert(css.includes(".intelligence-story"));
assert(css.includes(".os-story-grid"));
assert(css.includes(".enterprise-foundation-grid"));

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML ids");
const targets=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
const set=new Set(ids);
const missing=[...new Set(targets.filter(x=>!set.has(x)))];
assert.equal(missing.length,0,`broken hash targets: ${missing.join(", ")}`);

console.log(JSON.stringify({
 ok:true,
 wave:"WEB-030",
 existingHospitalityIdentityPreserved:true,
 heroScopeExpanded:true,
 operationsStory:true,
 workforceStory:true,
 kitchenStory:true,
 serviceCoordinationStory:true,
 aiBrainStory:true,
 enterpriseFoundationStory:true,
 publicNavigationExpanded:true,
 duplicateHtmlIds:0,
 brokenHashTargets:0
},null,2));
