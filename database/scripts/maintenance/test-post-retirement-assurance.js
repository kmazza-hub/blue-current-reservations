"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),os=require("os");
global.structuredClone=global.structuredClone||((x)=>JSON.parse(JSON.stringify(x)));
const Impact=require("../../server/services/repositoryImpactService");
const Assurance=require("../../server/services/retirementAssuranceService");
const Client=require("../../client/js/modules/retirementAssuranceEngine");

const root=path.resolve(__dirname,"../.."),impact=new Impact(root),service=new Assurance(root,impact);
const snap=service.snapshot();
assert.equal(snap.version,"46.55.0");
assert.equal(snap.status,"post-retirement-assurance-ready");
assert.equal(snap.trusted,true);
assert.equal(snap.retirements>=1,true);
assert.equal(snap.regressions,0);
assert.equal(snap.nextCandidateGate.eligible,true);
const first=snap.items.find(x=>x.surfaceId==="enterpriseValuePlanCenter");
assert.ok(first);
assert.equal(first.score,100);
for(const id of ["retired-files-absent","owned-runtime-files","startup-regression","api-regression","operational-reference-regression","rollback-record","baseline-hashes"])assert.equal(first.checks.find(x=>x.id===id).pass,true,id);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"bc-retirement-assurance-"));
fs.mkdirSync(path.join(tmp,"config/retirements"),{recursive:true});fs.mkdirSync(path.join(tmp,"client/js/modules"),{recursive:true});fs.mkdirSync(path.join(tmp,"client/js"),{recursive:true});
fs.writeFileSync(path.join(tmp,"client/js/modules/retiredThingCenter.js"),"window.retiredThingCenter=true;");
fs.writeFileSync(path.join(tmp,"config/retirements/test.json"),JSON.stringify({surfaceId:"retiredThingCenter",status:"authoritatively-retired",retiredFiles:["client/js/modules/retiredThingCenter.js"],rollbackRequired:true,rollbackAvailable:true,baselineHashes:{a:"b"}}));
fs.writeFileSync(path.join(tmp,"client/index.html"),"");
fs.writeFileSync(path.join(tmp,"client/js/app-v15.1.3.js"),"");
const negative=new Assurance(tmp,new Impact(tmp)).snapshot();
assert.equal(negative.trusted,false);
assert.equal(negative.regressions,1);
assert.equal(negative.nextCandidateGate.eligible,false);

const appState={data:{retirementAssurance:snap},getState(){return this.data;},update(o){Object.assign(this.data,o);}},client=new Client({appState,eventBus:{emit:()=>{}}});
assert.equal(client.nextCandidateReadiness(snap).eligible,true);
assert.equal(client.nextCandidateReadiness(negative).eligible,false);

console.log(JSON.stringify({ok:true,version:snap.version,retirements:snap.retirements,assured:snap.assured,regressions:snap.regressions,assuranceDigest:snap.digest.slice(0,12),firstRetirement:first.surfaceId,firstScore:first.score,nextCandidateGate:snap.nextCandidateGate.eligible,negativeRegressionDetected:negative.regressions===1,automaticDeletion:snap.safety.automaticDeletion},null,2));
