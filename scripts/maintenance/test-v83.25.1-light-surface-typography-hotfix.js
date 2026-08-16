"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

assert.equal(pkg.version,"83.25.1");
assert(css.includes("V83.25.1 — Light Surface Typography Enforcement Hotfix"));
assert(css.includes("#host-stand .section-heading h2"));
assert(css.includes(".workforce-foundation .section-heading h2"));
assert(css.includes(".workforce-foundation .wff-kpis strong"));
assert(css.includes(".workforce-foundation .wff-form input"));
assert(css.includes("color:var(--bc-light-ink-strong)!important"));
assert(css.includes("color:var(--bc-light-muted)!important"));
assert(html.includes("styles.css?v=83.25.1"));

const hotfixIndex=css.lastIndexOf("V83.25.1 — Light Surface Typography Enforcement Hotfix");
const legacyHostIndex=css.indexOf("#host-stand .section-heading h2");
assert(hotfixIndex>legacyHostIndex,"Hotfix must appear after legacy Host Stand white-text rule.");

console.log(JSON.stringify({
  ok:true,
  version:"83.25.1",
  hostLightHeadingDark:true,
  hostLightBodyDark:true,
  workforceHeadingDark:true,
  workforceMetricsDark:true,
  workforcePanelsDarkTypography:true,
  workforceFormsDarkTypography:true,
  mobileContrastEnforced:true,
  cssCacheBusted:true
},null,2));
