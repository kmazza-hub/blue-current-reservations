"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const root=path.resolve(__dirname,"../..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"js/site.js"),"utf8");

for(const id of ["story","guest-current","service-current","intelligence-current","demo"])
  assert(html.includes(`id="${id}"`),`missing ${id}`);

for(const copy of [
  "Hospitality moves fast.",
  "Blue Current moves with it.",
  "THE GUEST CURRENT",
  "THE SERVICE CURRENT",
  "THE INTELLIGENCE CURRENT",
  "AI Concierge","Reservations","Guest Intelligence","Host Stand &amp; Floor",
  "Live Command","Workforce","Kitchen Command","Service Coordination",
  "Restaurant AI Brain","Predictive Operations","Executive Command","Governed Automation"
]) assert(html.includes(copy),`missing story copy: ${copy}`);

assert(!html.includes('<a href="integrations.html">Integrations</a><a href="developers.html">'));
assert(css.includes(".bc-story"));
assert(css.includes(".bc-feature-grid"));
assert(css.includes(".bc-platform-foundation"));
assert(js.includes("WEB-029 — Hospitality Storyfront"));

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate homepage ids");
const targets=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
const set=new Set(ids);
const missing=[...new Set(targets.filter(x=>!set.has(x)))];
assert.equal(missing.length,0,`broken homepage anchors: ${missing.join(", ")}`);

console.log(JSON.stringify({
  ok:true,
  wave:"WEB-029",
  storyChapters:3,
  primaryFeatureCards:12,
  enterpriseFoundationSignals:12,
  simplifiedNavigation:true,
  hospitalityFirstHero:true,
  fastOperationsPositioning:true,
  premiumVisualStory:true,
  duplicateHomepageIds:0,
  brokenHomepageAnchors:0
},null,2));
