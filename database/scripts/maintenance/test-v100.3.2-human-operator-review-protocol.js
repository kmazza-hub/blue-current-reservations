"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const protocol=require(path.join(root,"config/operator-review-v100.3.2.json"));
const app=read("client/js/app-v15.1.3.js"),floor=read("client/js/floor-reservations-v62.0.js"),lifecycle=read("client/js/service-table-lifecycle-v100.2.57.js"),kitchen=read("client/js/kitchen-service-handoff-v100.2.61.js"),staff=read("client/js/staff-attendance-v100.2.66.js"),resume=read("client/js/ipad-resume-truth-v100.2.86.js"),manager=read("client/js/manager-operations-truth-v100.2.68.js"),actions=read("server/services/actionListService.js");
const ids=protocol.scenarios.map(x=>x.id),expected=["AUTH_RESUME","RESERVATION_ARRIVAL","WALKIN_WAITLIST","HOST_SEATING","SERVICE_INTAKE","SERVICE_MILESTONES","KITCHEN_READY_HANDOFF","TABLE_TURN","SERVICE_RECOVERY","MANAGER_OWNERSHIP","STAFF_ATTENDANCE","RUSH_READABILITY"];
const checks=[
 ["protocol version",protocol.version==="100.3.2"],
 ["review remains human required",protocol.status==="HUMAN_REVIEW_REQUIRED"&&protocol.rules.humanObservationRequired===true],
 ["real device evidence required",protocol.rules.realDeviceRequired===true],
 ["all twelve workflows present",JSON.stringify(ids)===JSON.stringify(expected)],
 ["scenario identities are unique",new Set(ids).size===ids.length],
 ["every scenario has one job",protocol.scenarios.every(x=>x.job&&x.start&&x.expected)],
 ["every scenario has operational observations",protocol.scenarios.every(x=>Array.isArray(x.observe)&&x.observe.length>=4)],
 ["every scenario has profitability lens",protocol.scenarios.every(x=>x.profitabilityLens)],
 ["no scenario is pre-rated",protocol.scenarios.every(x=>x.rating===null&&x.severity===null)],
 ["no evidence is invented",protocol.scenarios.every(x=>Array.isArray(x.evidence)&&x.evidence.length===0)],
 ["final decision remains blank",protocol.decision===null&&protocol.reviewer===null&&protocol.completedAt===null],
 ["READY REVISE HOLD only",JSON.stringify(protocol.allowedDecisions)===JSON.stringify(["READY","REVISE","HOLD"])],
 ["critical finding blocks READY",protocol.rules.criticalFindingBlocksReady===true],
 ["profit claims require measurement",protocol.rules.profitClaimsRequireMeasuredEvidence===true],
 ["automatic approval disabled",protocol.rules.automaticApproval===false],
 ["automatic workflow changes disabled",protocol.rules.automaticWorkflowChange===false],
 ["Host seating commit exists",app.includes("bc:host-guest-seated")&&app.includes("markSeated")],
 ["Service intake identity exists",floor.includes("acceptServiceHandoff")&&floor.includes("partySize:incomingParty")],
 ["Service milestones remain human actions",floor.includes('data-service-action="advance"')],
 ["Kitchen Ready handoff exists",kitchen.includes("bc:kitchen-order-ready")],
 ["table turn requires cleaning",lifecycle.includes('table.classList.add("cleaning")')&&!lifecycle.includes('table.classList.add("available")')],
 ["Service recovery truth exists",floor.includes("serviceRecoveryException")&&floor.includes("SERVICE_RECOVERY_GUIDANCE")],
 ["Manager live actions exist",manager.includes("api.managerActions(LOCATION_ID)")],
 ["Service Manager ledger exists",actions.includes('sourceRecordType: "service_exception"')],
 ["Staff attendance truth exists",staff.includes("attendance exception")||staff.includes("Attendance")],
 ["iPad resume lifecycle exists",resume.includes('document.addEventListener("visibilitychange"')&&resume.includes('window.addEventListener("pageshow"')],
 ["protocol creates no runtime surface",protocol.scenarios.every(x=>!Object.hasOwn(x,"automaticAction"))],
 ["first-day comprehension is observed",protocol.scenarios.find(x=>x.id==="RUSH_READABILITY").observe.includes("first-day employee comprehension")]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.3.2 validation ${passed}/${checks.length}`);assert.equal(passed,checks.length);
console.log(JSON.stringify({protocol:{status:protocol.status,scenarios:protocol.scenarios.length,humanReviewRequired:true,preRated:0,inventedEvidence:0,automaticApproval:false,nextDecision:"READY | REVISE | HOLD"}},null,2));
