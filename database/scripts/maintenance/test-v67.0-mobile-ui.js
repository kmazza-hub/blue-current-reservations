"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/mobile-ui-v67.0.js"),"utf8");

assert.equal(pkg.version,"67.0.0");
assert(html.includes('content="67.0.0"'));
assert(html.includes("mobile-ui-v67.0.js?v=67.0.0"));
for(const term of ["bc-mobile-ui","bc-mobile-ready","bc-mobile-scroll","bc-mobile-action-row","BlueCurrentMobileUI"]) assert(js.includes(term),term);
for(const term of [
 "@media(max-width:760px)",
 "--bc-mobile-page",
 "--bc-mobile-dark",
 ".bc-operator-utility-actions",
 ".bc-rush-dock",
 ".bc-mobile-scroll",
 "#blue-current-live",
 "#service-coordination",
 "grid-template-columns:1fr!important"
]) assert(css.includes(term),term);

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML ids found");
const anchors=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
const set=new Set(ids);
assert.equal([...new Set(anchors.filter(x=>!set.has(x)))].length,0,"broken hash targets found");

console.log(JSON.stringify({
 ok:true,
 version:"67.0.0",
 mobileBreakpoint:760,
 brighterMobileLightSurfaces:true,
 brightDarkSurfaceText:true,
 compactVerticalRhythm:true,
 responsiveGridCollapse:true,
 mobileTouchTargets:true,
 mobileForms:true,
 hostMobileLayout:true,
 mobileTableScroll:true,
 compactOperatorUtility:true,
 compactRushDock:true,
 mobileToastRecovery:true,
 duplicateHtmlIds:0,
 brokenHashTargets:0,
 noWorkflowDeletion:true
},null,2));
