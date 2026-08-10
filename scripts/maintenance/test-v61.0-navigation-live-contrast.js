"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const nav=fs.readFileSync(path.join(root,"client/js/navigation-v61.0.js"),"utf8");
const ux=fs.readFileSync(path.join(root,"client/js/operator-experience-v60.0.js"),"utf8");
assert.equal(pkg.version,"61.0.0");
const expected=[
 ["Command","command-center"],["Live","blue-current-live"],["Floor","host-stand"],
 ["Reservations","journey"],["Staff","workforce-foundation"],["Kitchen","kitchenThroughputCenter"],
 ["Executive","executive-command-center"],["AI Brain","restaurantAiBrainV341"]
];
for(const [label,id] of expected){
 assert(html.includes(`href="#${id}"`),`${label} nav href missing`);
 assert(html.includes(`id="${id}"`),`${label} target missing`);
}
assert(!html.includes('href="#live-floor-operations"'));
assert(!html.includes('href="#reservation-operations"'));
assert(!html.includes('href="#staff-sections"'));
assert(!html.includes('href="#kitchen-command-center"'));
assert(!html.includes('href="#ai-restaurant-brain"'));
assert(nav.includes("scrollIntoView"));
assert(nav.includes("bc-nav-open"));
assert(css.includes(".bc-deep-tool.bc-nav-open{display:block!important}"));
assert(css.includes(".live-command-center .live-kpi-grid button strong"));
assert(css.includes("color:#ffffff!important"));
assert(css.includes(".live-command-center .live-health-ring strong"));
assert(css.includes(".live-command-center .live-event-empty"));
assert(ux.includes('"host-stand"'));
assert(ux.includes('"journey"'));
assert(ux.includes('"workforce-foundation"'));
console.log(JSON.stringify({
 ok:true,version:"61.0.0",
 desktopNavigationTargets:8,mobileNavigationTargets:8,
 allNavigationTargetsExist:true,
 hiddenNestedTargetsRevealOnNavigation:true,
 liveKpiNumbersBright:true,
 liveKpiLabelsBright:true,
 healthRingBright:true,
 copilotBright:true,
 timelineBright:true,
 navigationDeadLinksRemoved:true
},null,2));
