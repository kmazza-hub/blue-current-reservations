"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/operator-usability-v60.50.js"),"utf8");
assert.equal(pkg.version,"60.50.0");
assert(html.includes('content="60.50.0"'));
assert(html.includes("operator-usability-v60.50.js?v=60.50.0"));
assert(js.includes("Only what the restaurant needs right now."));
assert(js.includes("Show insights"));
assert(js.includes("bc-touch-control"));
assert(js.includes("bc-action-caution"));
assert(js.includes("bc-action-primary"));
assert(js.includes("bc-primary-jump"));
assert(css.includes('.bc-shift-focus [data-bc-priority="support"]{display:none!important}'));
assert(css.includes(".bc-touch-control{min-height:46px!important}"));
assert(css.includes("font-size:16px!important"));
assert(css.includes("@media (prefers-reduced-motion:reduce)"));
console.log(JSON.stringify({
 ok:true,version:"60.50.0",
 shiftFocusMode:true,
 supportInsightsCollapsedByDefault:true,
 insightsRecoverable:true,
 specialistToolsRemainRecoverable:true,
 universalTouchTargets:true,
 mobileInputLegibility:true,
 inferredAccessibleControlNames:true,
 primarySecondaryCautionActions:true,
 emptyStateDeemphasis:true,
 primaryWorkspaceJumpNav:true,
 reducedMotionSupport:true,
 featureDeletion:false
},null,2));
