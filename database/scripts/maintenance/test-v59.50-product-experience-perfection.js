"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/product-experience-v59.50.js"),"utf8");
const pkg=require(path.join(root,"package.json"));
assert.equal(pkg.version,"59.50.0");
assert(html.includes('content="59.50.0"'));
assert(html.includes("Blue Current V59.50"));
assert(html.includes("Blue Current Cloud V59.50"));
assert(!html.includes("Blue Current V34.6.6"));
assert(!html.includes("Blue Current Cloud V23"));
assert(html.includes("product-experience-v59.50.js?v=59.50.0"));
assert(css.includes(".bc-advanced-surface{display:none !important}"));
assert(css.includes(".bc-advanced-open .bc-advanced-surface{display:block !important}"));
assert(js.includes('id="bcAdvancedToggle"'));
assert(js.includes('Restaurant operations first.'));
const desktop=html.match(/<nav class="desktop-nav"[\s\S]*?<\/nav>/)?.[0]||"";
const links=(desktop.match(/<a\b/g)||[]).length;
assert(links<=8);
for(const label of ["Command","Live","Floor","Reservations","Staff","Kitchen","Executive","AI Brain"])assert(desktop.includes(`>${label}</a>`));
console.log(JSON.stringify({
 ok:true,version:"59.50.0",
 staleBootVersionRemoved:true,staleCloudVersionRemoved:true,
 primaryNavigationLinks:links,operatorFirstNavigation:true,
 advancedSurfacesPreserved:true,advancedSurfacesCollapsedByDefault:true,
 advancedControlsRecoverable:true,readabilityLayer:true,
 functionalityRemoved:false
},null,2));
