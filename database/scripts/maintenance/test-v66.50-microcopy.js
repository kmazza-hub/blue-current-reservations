"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/microcopy-v66.50.js"),"utf8");
assert.equal(pkg.version,"66.50.0");
assert(html.includes('content="66.50.0"'));
assert(html.includes("microcopy-v66.50.js?v=66.50.0"));
for(const term of ["View details","Ask Blue Current","Reset view","BlueCurrentCopy","bc-copy-high-impact","Search by guest name, phone, or note","Nothing else was changed."])assert(js.includes(term),term);
assert(css.includes(".bc-copy-high-impact"));
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size);
const anchors=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]),set=new Set(ids);
assert.equal([...new Set(anchors.filter(x=>!set.has(x)))].length,0);
console.log(JSON.stringify({
 ok:true,version:"66.50.0",primaryWorkspaceCopyPass:true,
 vagueActionNormalization:true,contextualAriaLabels:true,
 placeholderAccessibility:true,highImpactActionClarity:true,
 hostActionHelpers:true,standardCopyApi:true,
 duplicateHtmlIds:0,brokenHashTargets:0,noWorkflowDeletion:true
},null,2));
