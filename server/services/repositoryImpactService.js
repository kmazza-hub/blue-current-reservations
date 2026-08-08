"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class RepositoryImpactService {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.allowedExtensions = new Set([".js",".html",".css",".md",".json"]);
    this.excluded = new Set(["node_modules",".git","database","coverage","dist","build"]);
  }
  walk(dir=this.rootPath, out=[]) {
    for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      if (this.excluded.has(entry.name)) continue;
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()) this.walk(full,out);
      else if(this.allowedExtensions.has(path.extname(entry.name).toLowerCase())) out.push(full);
    }
    return out;
  }
  rel(file){return path.relative(this.rootPath,file).replace(/\\/g,"/");}
  content(file){try{return fs.readFileSync(file,"utf8");}catch{return "";}}
  references(surfaceId) {
    const files=this.walk(), exact=[], api=[], tests=[], startup=[], htmlOwnership=[], scriptOwnership=[];
    const id=String(surfaceId||"").trim();
    if(!id) throw new Error("surfaceId is required.");
    for(const file of files){
      const rel=this.rel(file), text=this.content(file);
      const count=(text.match(new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"))||[]).length;
      if(count) exact.push({file:rel,count});
      if(rel==="client/js/app-v15.1.3.js"&&count) startup.push({file:rel,count});
      if(rel==="client/index.html"&&count){
        htmlOwnership.push({file:rel,count,sectionOwned:new RegExp(`<section[^>]+id=["']${id}["']`,"i").test(text)});
        const scriptRe=new RegExp(`<script[^>]+data-center=["']${id}["'][^>]+data-src=["']([^"']+)["']`,"gi");let m;
        while((m=scriptRe.exec(text)))scriptOwnership.push({file:m[1].replace(/^\/+/,""),declaredIn:rel});
      }
      if(rel.startsWith("scripts/")&&count)tests.push({file:rel,count});
      const apiMatches=[...text.matchAll(/["'`](\/api\/[^"'`\s?]+)/g)].map(m=>m[1]);
      if(count&&apiMatches.length)api.push(...[...new Set(apiMatches)].map(endpoint=>({file:rel,endpoint})));
    }
    return {surfaceId:id,exact,startup,htmlOwnership,scriptOwnership:[...new Map(scriptOwnership.map(x=>[x.file,x])).values()],tests,api:[...new Map(api.map(x=>[`${x.file}|${x.endpoint}`,x])).values()]};
  }
  ownership(surfaceId,refs){
    const owned=new Set();
    for(const x of refs.scriptOwnership)owned.add(x.file);
    if(refs.htmlOwnership.some(x=>x.sectionOwned))owned.add("client/index.html");
    const guessed=surfaceId.replace(/Center$/,"");
    for(const suffix of ["Engine.js","Center.js",".js"]){
      const candidate=`client/js/modules/${guessed}${suffix}`;
      if(fs.existsSync(path.join(this.rootPath,candidate)))owned.add(candidate);
    }
    return [...owned].sort();
  }
  dependencyGraph(surfaceId){
    const refs=this.references(surfaceId),owned=this.ownership(surfaceId,refs),ownedSet=new Set(owned);
    const inbound=refs.exact.filter(x=>!ownedSet.has(x.file)).map(x=>({...x,type:x.file==="client/js/app-v15.1.3.js"?"startup-registry":x.file==="client/index.html"?"html-registration":x.file.startsWith("scripts/")?"test":"reference"}));
    return {surfaceId,ownedFiles:owned,inboundReferences:inbound,referenceCount:refs.exact.reduce((s,x)=>s+x.count,0),startupDependencies:refs.startup,apiUsage:refs.api,testCoverage:refs.tests,htmlOwnership:refs.htmlOwnership,scriptOwnership:refs.scriptOwnership};
  }
  rollbackPlan(surfaceId,graph){
    const files=[...new Set([...graph.ownedFiles,...graph.inboundReferences.map(x=>x.file)])].sort();
    const digest=crypto.createHash("sha256").update(JSON.stringify({surfaceId,files})).digest("hex");
    return {surfaceId,mode:"plan-only",filesToBackup:files,restoreStrategy:"restore-exact-files-from-pre-deletion-tag-or-rollback-archive",validation:["npm run check","focused surface retirement test","server health check","operator workflow coverage check"],digest,archiveGenerated:false,codeDeletionAllowed:false};
  }
  analyze(surfaceId){
    const graph=this.dependencyGraph(surfaceId),rollback=this.rollbackPlan(surfaceId,graph);
    const blockers=[];
    if(graph.startupDependencies.length)blockers.push("Startup registry references remain.");
    if(graph.apiUsage.length)blockers.push("API usage references require review.");
    if(graph.inboundReferences.some(x=>x.type==="reference"))blockers.push("Non-owned inbound references require review.");
    if(graph.testCoverage.length===0)blockers.push("No direct retirement-candidate test coverage found.");
    return {surfaceId,version:"46.35.0",graph,rollback,impact:{ownedFiles:graph.ownedFiles.length,inboundReferences:graph.inboundReferences.length,startupDependencies:graph.startupDependencies.length,apiReferences:graph.apiUsage.length,testReferences:graph.testCoverage.length},status:blockers.length?"impact-review-required":"impact-clear-for-deletion-plan",blockers,deletionExecuted:false,deleteEndpointPresent:false,generatedAt:new Date().toISOString()};
  }
}
module.exports=RepositoryImpactService;
