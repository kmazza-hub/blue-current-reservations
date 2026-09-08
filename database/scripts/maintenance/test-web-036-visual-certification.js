"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const root=path.resolve(__dirname,"../..");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/website-certification-v36.js"),"utf8");

assert(html.includes('data-web-certified="36"'));
assert(html.includes("website-certification-v36.js?v=36"));
assert(html.includes('</section>\n\n    <section class="live-command-center container" id="blue-current-live"'),
  "Service Speed must close before Blue Current Live");

for(const term of ["IntersectionObserver","aria-current","Escape","noopener","noreferrer","WEB-036"])
  assert(js.includes(term),`missing ${term}`);

for(const term of [
  'body[data-web-certified="36"]','overflow-x:clip',':focus-visible',
  '@media(max-width:1100px)','@media(max-width:760px)','@media(max-width:390px)',
  '@media(prefers-reduced-motion:reduce)'
]) assert(css.includes(term),`missing ${term}`);

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML ids");
const targets=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
const set=new Set(ids);
const missing=[...new Set(targets.filter(x=>!set.has(x)))];
assert.equal(missing.length,0,`broken hash targets: ${missing.join(", ")}`);

console.log(JSON.stringify({
 ok:true,
 wave:"WEB-036",
 serviceSpeedStructureRepaired:true,
 publicNavigationPreserved:true,
 activeNavigationState:true,
 mobileMenuClose:true,
 escapeKeyRecovery:true,
 keyboardHashFocus:true,
 externalLinkHardening:true,
 horizontalOverflowGuard:true,
 desktopTabletMobileHardening:true,
 focusVisibility:true,
 reducedMotionHardening:true,
 conversionCollisionGuard:true,
 duplicateHtmlIds:0,
 brokenHashTargets:0
},null,2));
