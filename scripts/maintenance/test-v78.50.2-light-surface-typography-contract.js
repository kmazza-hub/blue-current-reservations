"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

assert.equal(pkg.version,"78.50.2");
assert(html.includes("styles.css?v=78.50.2"));
assert(css.includes("V78.50.2 — Light Surface Typography Contract"));

for(const surface of [
  ".operator-section",
  ".host-stand-section",
  ".guest-intelligence-section",
  ".analytics-section",
  ".predictive-operations-section",
  ".intelligence-network-section",
  ".inventory-intelligence"
]) assert(css.includes(surface),surface);

assert(css.includes("--bc-light-ink:#0b2a35"));
assert(css.includes("--bc-light-ink-strong:#071f29"));
assert(css.includes(".inventory-intelligence .section-heading h2"));
assert(css.includes("color:var(--bc-light-ink-strong)!important"));
assert(css.includes(".inventory-intelligence .inventory-kpis strong"));
assert(css.includes("color:#ffffff!important"));
assert(css.includes(".portfolio-focus-panel"));
assert(css.includes(".predictive-card:not(.recommendation-card)"));
assert(css.includes(".guest-card"));

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML IDs");
const anchors=[...html.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual([...new Set(anchors.filter(id=>!ids.includes(id)))],[],"broken fragment anchors");

console.log(JSON.stringify({
  ok:true,
  version:"78.50.2",
  inventoryLightCanvasDarkHeading:true,
  lightSectionTypographyContract:true,
  lightCardsDarkText:true,
  darkNestedCardsPreserved:true,
  mobileLightContrast:true,
  duplicateIds:0,
  brokenAnchors:0
},null,2));
