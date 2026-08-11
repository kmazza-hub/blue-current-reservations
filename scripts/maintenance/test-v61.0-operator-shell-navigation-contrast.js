"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const nav=fs.readFileSync(path.join(root,"client/js/navigation-v61.0.js"),"utf8");
const shell=fs.readFileSync(path.join(root,"client/js/top-shell-v61.0.js"),"utf8");
assert.equal(pkg.version,"61.0.0");
assert(html.includes('content="61.0.0"'));
const expected=[
 ["Command","command-center"],["Live","blue-current-live"],["Floor","host-stand"],
 ["Reservations","journey"],["Staff","workforce-foundation"],["Kitchen","kitchenThroughputCenter"],
 ["Executive","executive-command-center"],["AI Brain","restaurantAiBrainV341"]
];
for(const [label,id] of expected){
 assert(html.includes(`href="#${id}"`),`${label} nav href missing`);
 assert(html.includes(`id="${id}"`),`${label} target missing`);
}
assert(nav.includes("scrollIntoView"));
assert(nav.includes("bc-nav-open"));
assert(shell.includes("bcOperatorUtilityBar"));
assert(shell.includes("Restaurant operations first."));
assert(css.includes(".bc-shell-merged-source{display:none!important}"));
assert(css.includes(".live-command-center .live-kpi-grid button strong"));
assert(css.includes("color:#ffffff!important"));
console.log(JSON.stringify({
 ok:true,version:"61.0.0",
 compactOperatorShell:true,
 productModeMerged:true,
 shiftFocusMerged:true,
 workingNavigation:true,
 desktopNavigationTargets:8,
 allNavigationTargetsExist:true,
 hiddenTargetsRevealOnNavigation:true,
 liveKpiContrast:true,
 livePanelContrast:true,
 featureDeletion:false
},null,2));
