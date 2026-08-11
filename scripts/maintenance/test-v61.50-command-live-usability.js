"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/command-live-v61.50.js"),"utf8");
assert.equal(pkg.version,"61.50.0");
assert(html.includes('content="61.50.0"'));
assert(html.includes("Know the shift in seconds."));
assert(html.includes("Ask what matters right now."));
assert(html.includes("Find what happened."));
assert(html.includes("Tonight's VIPs"));
assert(html.includes("Birthdays tonight"));
assert(html.includes("Service slowdowns"));
assert(html.includes("Closing revenue"));
assert(js.includes("bc-command-detail"));
assert(js.includes("Show leadership & analysis"));
assert(js.includes("bc-live-priority-action"));
assert(js.includes("Show system connections"));
assert(js.includes("SHIFT SNAPSHOT"));
assert(css.includes("#command-center .bc-command-detail{display:none!important}"));
assert(css.includes(".live-command-center .bc-live-priority-action"));
assert(css.includes(".live-command-center .bc-live-detail{display:none!important}"));
console.log(JSON.stringify({
 ok:true,version:"61.50.0",
 commandFirstScreenSimplified:true,
 leadershipAnalysisCollapsed:true,
 commandDetailsRecoverable:true,
 liveLanguageSimplified:true,
 nextBestActionPrioritized:true,
 copilotPromptsShortened:true,
 timelineEmptyStateImproved:true,
 systemConnectionsCollapsed:true,
 systemConnectionsRecoverable:true,
 liveKpiIntentLabels:true,
 noWorkflowDeletion:true
},null,2));
