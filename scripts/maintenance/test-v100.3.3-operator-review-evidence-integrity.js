"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),protocol=require(path.join(root,"config/operator-review-v100.3.2.json"));
const recorder=require(path.join(root,"scripts/maintenance/operator-review-recorder-v100.3.3.js"));
const source=fs.readFileSync(path.join(root,"scripts/maintenance/operator-review-recorder-v100.3.3.js"),"utf8");
const review=recorder.createReview(protocol,{reviewer:"Test Reviewer",restaurant:"Test Location",device:"Test iPad"},"2026-09-03T12:00:00.000Z");
assert.equal(review.scenarios.length,12);assert.equal(review.summary.reviewed,0);assert.equal(review.decision,null);
assert.throws(()=>recorder.recordScenario(review,"AUTH_RESUME",{rating:"CLEAR",evidence:""}),/evidence/);
assert.throws(()=>recorder.recordScenario(review,"AUTH_RESUME",{rating:"FRICTION",severity:"",evidence:"Observed",notes:"Slow"}),/require/);
assert.throws(()=>recorder.recordScenario(review,"AUTH_RESUME",{rating:"FRICTION",severity:"HIGH",evidence:"Observed",notes:""}),/note/);
recorder.recordScenario(review,"AUTH_RESUME",{rating:"FRICTION",severity:"HIGH",evidence:"First tap delayed",notes:"Operator hesitated"},"2026-09-03T12:05:00.000Z");
assert.equal(review.summary.high,1);assert.throws(()=>recorder.decide(review,"READY","Looks good"),/remain/);
for(const row of review.scenarios.filter(x=>!x.rating))recorder.recordScenario(review,row.id,{rating:"CLEAR",evidence:`Observed ${row.id}`},"2026-09-03T12:10:00.000Z");
assert.equal(review.summary.reviewed,12);assert.throws(()=>recorder.decide(review,"READY","All tasks done"),/blocked/);
recorder.decide(review,"REVISE","Resolve and retest the high-friction resume finding.","2026-09-03T12:20:00.000Z");
assert.equal(review.status,"REVISE");assert.throws(()=>recorder.recordScenario(review,"HOST_SEATING",{rating:"CLEAR",evidence:"Rewrite"}),/closed/);
const report=recorder.renderReport(review);assert(report.includes("Status: **REVISE**"));assert(report.includes("First tap delayed"));assert(report.includes("Resolve and retest"));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"bc-review-v10033-")),file=path.join(temp,"evidence","review.json");recorder.saveReview(review,file);
assert(fs.existsSync(file));assert(fs.existsSync(file.replace(".json","-report.md")));
const hold=recorder.createReview(protocol,{reviewer:"Test",restaurant:"Test",device:"Test"});recorder.recordScenario(hold,"AUTH_RESUME",{rating:"BLOCKED",severity:"CRITICAL",evidence:"Screen froze",notes:"Could not continue"});recorder.decide(hold,"HOLD","Critical blocker stops the review.");assert.equal(hold.status,"HOLD");
const checks=[
 ["V100.3.3 recorder exports testable operations",["createReview","recordScenario","summarize","decide","renderReport","saveReview"].every(x=>typeof recorder[x]==="function")],
 ["existing evidence resumes instead of overwrites",/if\(fs\.existsSync\(evidenceFile\)\)/.test(source)&&/Resuming operator review/.test(source)],
 ["writes use temporary file then rename",/writeFileSync\(temporary/.test(source)&&/renameSync\(temporary,file\)/.test(source)],
 ["every rating requires observed evidence",/At least one observed evidence note is required/.test(source)],
 ["friction requires severity and notes",/FRICTION and BLOCKED require LOW/.test(source)&&/require an operator note/.test(source)],
 ["READY requires completed clean evidence",/readyEligible/.test(source)&&/READY is blocked/.test(source)],
 ["HOLD can preserve an early blocker",hold.status==="HOLD"&&hold.summary.remaining===11],
 ["completed reviews are immutable",/The review is closed/.test(source)],
 ["human metadata retained",review.reviewer==="Test Reviewer"&&review.restaurant==="Test Location"&&review.device==="Test iPad"],
 ["raw evidence retained",review.scenarios[0].evidence[0]==="First tap delayed"],
 ["no automatic READY decision",!source.includes('review.decision="READY"')],
 ["no live application file dependency",!source.includes("client/js/")&&!source.includes("server/services/")],
 ["review JSON and readable report both saved",fs.existsSync(file)&&fs.existsSync(file.replace(".json","-report.md"))],
 ["V100.3.2 protocol remains source",source.includes("operator-review-v100.3.2.json")],
 ["twelve scenarios remain required",protocol.scenarios.length===12&&protocol.rules.allScenariosRequired===true],
 ["profit claims still require measurement",protocol.rules.profitClaimsRequireMeasuredEvidence===true]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.3.3 validation ${passed}/${checks.length}`);assert.equal(passed,checks.length);
console.log(JSON.stringify({evidenceIntegrity:{scenarioRecords:12,unsupportedReadyBlocked:true,earlyHoldPreserved:true,completedReviewImmutable:true,atomicSave:true,jsonAndMarkdown:true,automaticApproval:false}},null,2));
