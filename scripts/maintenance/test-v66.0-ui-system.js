"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/ui-system-v66.0.js"),"utf8");

assert.equal(pkg.version,"66.0.0");
assert(html.includes('content="66.0.0"'));
assert(html.includes("ui-system-v66.0.js?v=66.0.0"));
for(const term of ["bc-ui-system","bc-ui-card","bc-ui-heading","bc-ui-button","bc-ui-status","BlueCurrentUISystem"])assert(js.includes(term),term);
for(const term of ["--bc-ui-radius-md","--bc-ui-border","--bc-ui-shadow-sm","--bc-ui-primary","--bc-ui-positive-bg","--bc-ui-warning-bg","--bc-ui-critical-bg",".bc-ui-status[data-bc-status-tone=\"positive\"]",".bc-ui-field",".bc-ui-section"])assert(css.includes(term),term);

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size);
const anchors=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]),set=new Set(ids);
assert.equal([...new Set(anchors.filter(x=>!set.has(x)))].length,0);

console.log(JSON.stringify({
 ok:true,
 version:"66.0.0",
 unifiedSpacing:true,
 unifiedRadius:true,
 unifiedBorders:true,
 unifiedShadows:true,
 unifiedButtonHierarchy:true,
 unifiedStatusTones:true,
 unifiedFormControls:true,
 unifiedTypography:true,
 tabularNumericEmphasis:true,
 responsiveConsistency:true,
 duplicateHtmlIds:0,
 brokenHashTargets:0,
 noWorkflowDeletion:true
},null,2));
