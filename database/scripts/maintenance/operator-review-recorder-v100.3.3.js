"use strict";
const fs=require("fs"),path=require("path"),readline=require("readline/promises"),{stdin:input,stdout:output}=require("process");
const RATINGS=new Set(["CLEAR","FRICTION","BLOCKED"]),SEVERITIES=new Set(["LOW","MEDIUM","HIGH","CRITICAL"]),DECISIONS=new Set(["READY","REVISE","HOLD"]);
const clean=value=>String(value??"").trim();
const clone=value=>JSON.parse(JSON.stringify(value));

function createReview(protocol,metadata={},now=new Date().toISOString()){
  const review=clone(protocol);
  review.version="100.3.3";
  review.protocolVersion=protocol.version;
  review.status="IN_REVIEW";
  review.reviewer=clean(metadata.reviewer)||null;
  review.restaurant=clean(metadata.restaurant)||null;
  review.device=clean(metadata.device)||null;
  review.startedAt=now;
  review.completedAt=null;
  review.decision=null;
  review.decisionRationale="";
  review.scenarios=review.scenarios.map(item=>({...item,rating:null,severity:null,evidence:[],notes:"",reviewedAt:null}));
  return summarize(review);
}

function recordScenario(review,id,entry,now=new Date().toISOString()){
  if(review.decision)throw new Error("The review is closed. Start a new review instead of rewriting completed evidence.");
  const scenario=review.scenarios.find(item=>item.id===clean(id).toUpperCase());
  if(!scenario)throw new Error(`Unknown scenario: ${id}`);
  const rating=clean(entry.rating).toUpperCase(),severity=clean(entry.severity).toUpperCase();
  if(!RATINGS.has(rating))throw new Error("Rating must be CLEAR, FRICTION, or BLOCKED.");
  if(rating==="CLEAR"&&severity)throw new Error("A CLEAR scenario must not carry a severity.");
  if(rating!=="CLEAR"&&!SEVERITIES.has(severity))throw new Error("FRICTION and BLOCKED require LOW, MEDIUM, HIGH, or CRITICAL severity.");
  const evidence=Array.isArray(entry.evidence)?entry.evidence.map(clean).filter(Boolean):[clean(entry.evidence)].filter(Boolean);
  if(!evidence.length)throw new Error("At least one observed evidence note is required.");
  const notes=clean(entry.notes);
  if(rating!=="CLEAR"&&!notes)throw new Error("FRICTION and BLOCKED require an operator note.");
  Object.assign(scenario,{rating,severity:rating==="CLEAR"?null:severity,evidence,notes,reviewedAt:now});
  return summarize(review);
}

function summarize(review){
  const rows=review.scenarios||[],rated=rows.filter(x=>RATINGS.has(x.rating));
  review.summary={
    total:rows.length,
    reviewed:rated.length,
    remaining:rows.length-rated.length,
    clear:rated.filter(x=>x.rating==="CLEAR").length,
    friction:rated.filter(x=>x.rating==="FRICTION").length,
    blocked:rated.filter(x=>x.rating==="BLOCKED").length,
    critical:rated.filter(x=>x.severity==="CRITICAL").length,
    high:rated.filter(x=>x.severity==="HIGH").length,
    readyEligible:rated.length===rows.length&&!rated.some(x=>x.rating==="BLOCKED"||x.severity==="HIGH"||x.severity==="CRITICAL")
  };
  return review;
}

function decide(review,decision,rationale,now=new Date().toISOString()){
  summarize(review);
  const next=clean(decision).toUpperCase(),reason=clean(rationale);
  if(!DECISIONS.has(next))throw new Error("Decision must be READY, REVISE, or HOLD.");
  if(!reason)throw new Error("A written decision rationale is required.");
  if(next!=="HOLD"&&review.summary.remaining)throw new Error(`${review.summary.remaining} scenario(s) remain unreviewed.`);
  if(next==="READY"&&!review.summary.readyEligible)throw new Error("READY is blocked by an unreviewed, blocked, high, or critical finding.");
  review.decision=next;review.decisionRationale=reason;review.completedAt=now;review.status=next;
  return review;
}

function renderReport(review){
  summarize(review);
  const lines=["# Blue Current Operator Review Evidence",``,`Status: **${review.status}**  `,`Reviewer: ${review.reviewer||"Not recorded"}  `,`Restaurant: ${review.restaurant||"Not recorded"}  `,`Device: ${review.device||"Not recorded"}  `,`Started: ${review.startedAt||"Not recorded"}  `,`Completed: ${review.completedAt||"Not complete"}`,``,`Reviewed: ${review.summary.reviewed}/${review.summary.total} · Clear: ${review.summary.clear} · Friction: ${review.summary.friction} · Blocked: ${review.summary.blocked} · High: ${review.summary.high} · Critical: ${review.summary.critical}`,``];
  for(const row of review.scenarios){lines.push(`## ${row.id} — ${row.job}`,``,`Rating: ${row.rating||"NOT REVIEWED"}${row.severity?` · Severity: ${row.severity}`:""}`,``,`Evidence: ${row.evidence?.length?row.evidence.join(" | "):"None recorded"}`,``,`Notes: ${row.notes||"None recorded"}`,``);}
  lines.push("## Decision","",review.decision||"No decision recorded.","",review.decisionRationale||"No rationale recorded.","");
  return lines.join("\n");
}

function saveReview(review,file){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temporary=`${file}.tmp`;
  fs.writeFileSync(temporary,`${JSON.stringify(review,null,2)}\n`,"utf8");
  fs.renameSync(temporary,file);
  fs.writeFileSync(file.replace(/\.json$/i,"-report.md"),renderReport(review),"utf8");
}

async function runInteractive(root=process.cwd()){
  const protocol=require(path.join(root,"config/operator-review-v100.3.2.json"));
  const evidenceFile=path.join(root,"evidence","operator-review-v100.3.3.json");
  const rl=readline.createInterface({input,output});
  try{
    let review;
    if(fs.existsSync(evidenceFile)){
      review=JSON.parse(fs.readFileSync(evidenceFile,"utf8"));
      console.log(`Resuming operator review: ${review.summary?.reviewed||0}/${review.scenarios.length} scenarios recorded.`);
    }else{
      const reviewer=await rl.question("Reviewer name: "),restaurant=await rl.question("Restaurant/location: "),device=await rl.question("Device used: ");
      if(!clean(reviewer)||!clean(restaurant)||!clean(device))throw new Error("Reviewer, restaurant, and device are required.");
      review=createReview(protocol,{reviewer,restaurant,device});saveReview(review,evidenceFile);
    }
    if(review.decision){console.log(`Review already closed with ${review.decision}. Report: ${evidenceFile.replace(/\.json$/i,"-report.md")}`);return;}
    for(const scenario of review.scenarios.filter(x=>!x.rating)){
      console.log(`\n${scenario.id}: ${scenario.job}\nExpected: ${scenario.expected}`);
      const rating=(await rl.question("Rating (CLEAR/FRICTION/BLOCKED, or STOP): ")).trim().toUpperCase();
      if(rating==="STOP"){console.log(`Review saved: ${evidenceFile}`);return;}
      const severity=rating==="CLEAR"?"":await rl.question("Severity (LOW/MEDIUM/HIGH/CRITICAL): ");
      const evidence=await rl.question("Observed evidence (time, taps, state, or exact comment): ");
      const notes=rating==="CLEAR"?await rl.question("Optional note: "):await rl.question("Required friction/blocker note: ");
      recordScenario(review,scenario.id,{rating,severity,evidence,notes});saveReview(review,evidenceFile);
    }
    console.log(`\nAll scenarios recorded. READY eligible: ${review.summary.readyEligible?"YES":"NO"}`);
    const decision=await rl.question("Decision (READY/REVISE/HOLD): "),rationale=await rl.question("Decision rationale: ");
    decide(review,decision,rationale);saveReview(review,evidenceFile);
    console.log(`Review saved with ${review.decision}: ${evidenceFile.replace(/\.json$/i,"-report.md")}`);
  }finally{rl.close();}
}

module.exports={createReview,recordScenario,summarize,decide,renderReport,saveReview};
if(require.main===module)runInteractive().catch(error=>{console.error(error.message);process.exit(1);});
