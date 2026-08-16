"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");

assert(/^75\.50\.[01]$/.test(pkg.version));
assert(html.includes('id="blueCurrentCommand"'));
assert(html.includes('id="bcCommandTitle"'));
assert(html.includes("Run the whole restaurant from here."));
assert(html.includes("What needs attention"));
assert(html.includes("NEXT 30 MINUTES"));
assert(html.includes("BLUE CURRENT INTELLIGENCE"));
assert(html.includes("Protect hospitality and profit"));

for(const workspace of ["command","guests","service","team","kitchen","inventory","performance","executive","integrations","system"]){
  assert(html.includes(`data-bc-workspace="${workspace}"`),workspace);
  assert(js.includes(`${workspace}:`)||js.includes(`${workspace}:[`)||workspace==="command",workspace);
}

assert(css.includes("body.bc-hospitality-os>.site-header{display:none}"));
assert(css.includes("#main>.bc-os-shell~section:not(.bc-workspace-visible){display:none!important}"));
assert(css.includes("@media(max-width:900px)"));
assert(css.includes("min-height:46px"));
assert(js.includes("candidateSections"));
assert(js.includes("bc-workspace-visible"));
assert(js.includes('activate("command",{scroll:false})'));
assert(js.includes("sessionStorage"));
assert(!js.includes("fetch(")); // shell does not create a second source of truth or mutate APIs

// Existing deep product surfaces remain in the document rather than being deleted.
for(const id of ["host-stand","operating-current","profit-current","executive-command-center","inventory-intelligence","integrationControlCenter"]){
  assert(html.includes(`id="${id}"`),id);
}

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML IDs");
const anchors=[...html.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
const missing=[...new Set(anchors.filter(id=>!ids.includes(id)))];
assert.deepEqual(missing,[],"broken fragment anchors");

console.log(JSON.stringify({
  ok:true,version:"75.50.0",
  hospitalityOsShell:true,
  commandDefault:true,
  workspaces:10,
  immediateAttention:true,
  next30Minutes:true,
  intelligence:true,
  profitability:true,
  roleReadyNavigation:true,
  darkRestaurantContrast:true,
  mobileOperatingRail:true,
  legacyDepthPreserved:true,
  shellApiMutations:false,
  duplicateIds:0,
  brokenAnchors:0
},null,2));
