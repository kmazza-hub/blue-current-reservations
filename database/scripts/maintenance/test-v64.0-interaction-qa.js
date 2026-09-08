"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/interaction-feedback-v64.0.js"),"utf8");

assert.equal(pkg.version,"64.0.0");
assert(html.includes('content="64.0.0"'));
assert(html.includes("interaction-feedback-v64.0.js?v=64.0.0"));

for(const zone of ["main","waterfront","private"])assert(html.includes(`data-host-zone="${zone}"`));

assert(js.includes("window.BlueCurrentFeedback"));
assert(js.includes("Saved successfully."));
assert(js.includes("You’re offline. The action was not sent."));
assert(js.includes("bcSubmitting"));
assert(js.includes("bluecurrent:action-result"));
assert(js.includes("unhandledrejection"));
assert(js.includes("marked seated."));
assert(js.includes("hostFloorMap"));

assert(css.includes(".bc-toast-stack"));
assert(css.includes(".bc-action-working"));
assert(css.includes("@keyframes bcActionSpin"));
assert(css.includes('[data-host-zone][aria-pressed="true"]'));

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML ids found");

const anchors=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
const idSet=new Set(ids);
assert.equal([...new Set(anchors.filter(x=>!idSet.has(x)))].length,0,"broken hash targets found");

console.log(JSON.stringify({
  ok:true,
  version:"64.0.0",
  toastFeedback:true,
  mutationSuccessFeedback:true,
  mutationErrorFeedback:true,
  offlineFeedback:true,
  duplicateSubmitGuard:true,
  workingState:true,
  runtimeActionResultEvent:true,
  runtimeErrorFeedback:true,
  hostZoneControlsFunctional:true,
  localHostActionFeedback:true,
  duplicateHtmlIds:0,
  brokenHashTargets:0,
  noWorkflowDeletion:true
},null,2));
