"use strict";
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

class V46ReleaseCertificationService{
  constructor(rootPath,retirementAssuranceService){this.rootPath=rootPath;this.retirementAssuranceService=retirementAssuranceService;}
  read(rel){try{return fs.readFileSync(path.join(this.rootPath,rel),"utf8");}catch{return "";}}
  exists(rel){return fs.existsSync(path.join(this.rootPath,rel));}
  appAudit(){
    const files=["client/js/app-v15.1.3.js","client/app-v15.1.3.js","app-v15.1.3.js"];
    const results=files.map(file=>{const text=this.read(file),declared=new Set([...text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*Module)\b/g)].map(m=>m[1])),refs=new Set([...text.matchAll(/:\s*([A-Za-z_$][\w$]*Module)\b/g)].map(m=>m[1])),undefinedExports=[...refs].filter(x=>!declared.has(x)).sort();return {file,exists:Boolean(text),declaredModules:declared.size,referencedModules:refs.size,undefinedExports};});
    return {files:results,pass:results.every(x=>x.exists&&x.undefinedExports.length===0),undefinedExports:results.reduce((s,x)=>s+x.undefinedExports.length,0)};
  }
  navigationAudit(){
    const html=this.read("client/index.html"),audit=cls=>{const m=html.match(new RegExp(`<nav class="${cls}"[\\s\\S]*?<\\/nav>`,"i"));if(!m)return {entries:0,unique:0,duplicates:[],pass:false};const hrefs=[...m[0].matchAll(/<a[^>]+href="([^"]+)"/gi)].map(x=>x[1]),counts={};for(const h of hrefs)counts[h]=(counts[h]||0)+1;const duplicates=Object.entries(counts).filter(([,n])=>n>1).map(([href,count])=>({href,count}));return {entries:hrefs.length,unique:Object.keys(counts).length,duplicates,pass:duplicates.length===0};};return {desktop:audit("desktop-nav"),mobile:audit("mobile-nav")};
  }
  scriptAudit(){
    const html=this.read("client/index.html"),srcs=[...html.matchAll(/<(?:script)[^>]+(?:src|data-src)="([^"]+\.js)(?:\?[^"]*)?"/gi)].map(m=>m[1]).filter(x=>!/^https?:/i.test(x)),missing=[];
    for(const src of srcs){const rel=src.startsWith("js/")?`client/${src}`:src.startsWith("/")?src.slice(1):src;if(!this.exists(rel))missing.push({src,expected:rel});}
    return {referencedScripts:srcs.length,missing,pass:missing.length===0};
  }
  previewSafetyAudit(){
    const engine=this.read("client/js/modules/selectedCandidatePreviewEngine.js"),selection=this.read("client/js/modules/retirementCandidateSelectionEngine.js"),router=this.read("server/api/router.js");
    const checks=[
      {id:"preview-reversible",pass:engine.includes('reversible:true')&&engine.includes("applyVisibility(preview.surfaceId,true)")&&engine.includes("applyVisibility(p.surfaceId,false)")},
      {id:"preview-no-delete",pass:engine.includes("codeDeletionAllowed:false")&&engine.includes("deletionExecuted:false")},
      {id:"selection-no-auto",pass:selection.includes("automaticSelection:false")&&selection.includes("automaticDeletion:false")},
      {id:"no-fine-comb-delete-route",pass:!/[\"']\/api\/operator-fine-comb\/[^\"']+[\"'][\s\S]{0,180}request\.method\s*===\s*[\"']DELETE[\"']/.test(router)}
    ];
    return {checks,pass:checks.every(x=>x.pass)};
  }
  databaseAudit(){
    const db=this.read("server/services/databaseService.js"),checks=[
      {id:"cloud-sync-detection",pass:db.includes("_isCloudSyncedPath()")},
      {id:"onedrive-aware",pass:/OneDrive/.test(db)},
      {id:"atomic-fallback",pass:db.includes("_replaceFromTemporary")&&db.includes("copyFile")},
      {id:"backup-before-copy",pass:db.includes("_refreshBackup()")&&db.indexOf("await this._refreshBackup();")<db.indexOf('await this._retry("copy fallback"')}
    ];return {checks,pass:checks.every(x=>x.pass)};
  }
  scaffoldingAudit(){
    const rels=["client/js/modules/operatorSurfaceRationalizationEngine.js","client/js/modules/operatorConsolidationEngine.js","client/js/modules/operatorConsolidationScorecardEngine.js","client/js/modules/deprecationManifestEngine.js","client/js/modules/retirementCertificationEngine.js","client/js/modules/repositoryImpactCertificationEngine.js","client/js/modules/retirementRehearsalEngine.js","client/js/modules/finalRetirementAuthorizationEngine.js","client/js/modules/retirementAssuranceEngine.js","client/js/modules/retirementCandidateSelectionEngine.js","client/js/modules/selectedCandidatePreviewEngine.js"];
    const app=this.read("client/js/app-v15.1.3.js"),html=this.read("client/index.html"),items=rels.map(rel=>{const base=path.basename(rel,".js"),present=this.exists(rel),referenced=app.includes(base)||html.includes(path.basename(rel));return {file:rel,present,referenced,status:present&&referenced?"retained-active":present?"review-unused":"missing"};});
    return {items,active:items.filter(x=>x.status==="retained-active").length,reviewUnused:items.filter(x=>x.status==="review-unused").length,pass:items.every(x=>x.status==="retained-active")};
  }
  retirementAudit(){return this.retirementAssuranceService.snapshot();}
  snapshot(){
    const packageVersion=JSON.parse(this.read("package.json")||"{}").version||"unknown",app=this.appAudit(),nav=this.navigationAudit(),scripts=this.scriptAudit(),preview=this.previewSafetyAudit(),database=this.databaseAudit(),scaffolding=this.scaffoldingAudit(),retirement=this.retirementAudit();
    const checks=[
      {id:"version",pass:packageVersion==="46.70.0",detail:packageVersion},
      {id:"app-module-integrity",pass:app.pass,detail:`${app.undefinedExports} undefined export(s)`},
      {id:"script-resolution",pass:scripts.pass,detail:`${scripts.missing.length} missing script(s)`},
      {id:"desktop-navigation",pass:nav.desktop.pass,detail:`${nav.desktop.entries} entries · ${nav.desktop.duplicates.length} duplicate(s)`},
      {id:"mobile-navigation",pass:nav.mobile.pass,detail:`${nav.mobile.entries} entries · ${nav.mobile.duplicates.length} duplicate(s)`},
      {id:"retirement-assurance",pass:retirement.trusted===true&&retirement.regressions===0,detail:`${retirement.assured}/${retirement.retirements} assured · ${retirement.regressions} regression(s)`},
      {id:"candidate-preview-safety",pass:preview.pass,detail:`${preview.checks.filter(x=>x.pass).length}/${preview.checks.length} safety checks`},
      {id:"database-resilience",pass:database.pass,detail:`${database.checks.filter(x=>x.pass).length}/${database.checks.length} resilience checks`},
      {id:"v46-scaffolding-review",pass:scaffolding.pass,detail:`${scaffolding.active} active · ${scaffolding.reviewUnused} review-unused`}
    ];
    const score=Math.round(checks.reduce((s,x)=>s+(x.pass?100:0),0)/checks.length),certified=checks.every(x=>x.pass),payload={version:"46.70.0",packageVersion,status:certified?"v46-release-certified":"v46-release-blocked",score,certified,checks,audits:{app,navigation:nav,scripts,retirement,preview,database,scaffolding},safety:{automaticDeletion:false,liveExecutionChanged:false,releaseCloseoutOnly:true},generatedAt:new Date().toISOString()};
    payload.digest=crypto.createHash("sha256").update(JSON.stringify({version:payload.version,status:payload.status,score:payload.score,checks:payload.checks})).digest("hex");return payload;
  }
}
module.exports=V46ReleaseCertificationService;
