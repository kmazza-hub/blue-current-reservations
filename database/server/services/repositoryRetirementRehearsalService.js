"use strict";

const fs=require("fs");
const path=require("path");
const os=require("os");
const crypto=require("crypto");
const {spawnSync}=require("child_process");

class RepositoryRetirementRehearsalService{
  constructor(rootPath,impactService){this.rootPath=rootPath;this.impactService=impactService;}
  rel(p){return path.relative(this.rootPath,p).replace(/\\/g,"/");}
  excluded(name){return [".git","node_modules","coverage","dist","build"].includes(name);}
  copyTree(src,dst){
    fs.mkdirSync(dst,{recursive:true});
    for(const entry of fs.readdirSync(src,{withFileTypes:true})){
      if(this.excluded(entry.name))continue;
      const s=path.join(src,entry.name),d=path.join(dst,entry.name);
      if(entry.isDirectory())this.copyTree(s,d);else fs.copyFileSync(s,d);
    }
  }
  hashFile(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");}
  repositoryDigest(){const files=this.impactService.walk().sort(),hash=crypto.createHash("sha256");for(const file of files){hash.update(this.impactService.rel(file));hash.update("\0");hash.update(fs.readFileSync(file));hash.update("\0");}return {sha256:hash.digest("hex"),fileCount:files.length};}
  removeHtmlElementById(text,id){
    const esc=id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),startRe=new RegExp(`<section\\b[^>]*\\bid=["']${esc}["'][^>]*>`,"i"),m=startRe.exec(text);
    if(!m)return {text,removed:false};
    let depth=1,pos=m.index+m[0].length;
    const tagRe=/<\/?section\b[^>]*>/gi;tagRe.lastIndex=pos;let end=-1,x;
    while((x=tagRe.exec(text))){if(/^<\//.test(x[0]))depth--;else depth++;if(depth===0){end=x.index+x[0].length;break;}}
    if(end<0)return {text,removed:false};
    return {text:text.slice(0,m.index)+text.slice(end),removed:true};
  }
  cleanStartupFile(text,id){
    const esc=id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),moduleName=`${id}Module`;let out=text,removed=[];
    const registration=new RegExp(`(?:const\\s+\\w+\\s*=\\s*)?startupRegistry\\.register\\([\\s\\S]*?["']${esc}["'][\\s\\S]*?\\);\\s*`,`g`);
    out=out.replace(registration,m=>{if(!m.includes(id))return m;removed.push(m);return "";});
    const depQuoted=new RegExp(`,?\\s*["']${esc}["']\\s*,?`,`g`);
    out=out.replace(depQuoted,m=>m.includes(",")?", ":"");
    const exportLine=new RegExp(`^.*\\b${moduleName.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b.*(?:\\r?\\n|$)`,`gm`);
    out=out.replace(exportLine,m=>{if(/startupRegistry/.test(m))return m;removed.push(m);return "";});
    return {text:out,removed};
  }
  removeCenterScripts(text,id,ownedFiles=[]){
    const names=ownedFiles.filter(x=>x.startsWith("client/js/")).map(x=>path.basename(x)),removed=[];
    let out=text;
    const centerRe=new RegExp(`<script\\b[^>]*data-center=["']${id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}["'][^>]*>\\s*</script>\\s*`,"gi");
    out=out.replace(centerRe,m=>{removed.push(m);return "";});
    for(const name of names){const esc=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),re=new RegExp(`<script\\b[^>]*(?:src|data-src)=["'][^"']*${esc}(?:\\?[^"']*)?["'][^>]*>\\s*</script>\\s*`,"gi");out=out.replace(re,m=>{removed.push(m);return "";});}
    return {text:out,removed};
  }
  removeQuotedToken(text,id){const esc=id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");let out=text;out=out.replace(new RegExp(`,\\s*["']${esc}["']`,"g"),"");out=out.replace(new RegExp(`["']${esc}["']\\s*,`,"g"),"");out=out.replace(new RegExp(`["']${esc}["']`,"g"),"");return out;}
  snapshotFiles(files){const records=[];for(const rel of files){const full=path.join(this.rootPath,rel);if(!fs.existsSync(full)||!fs.statSync(full).isFile())continue;records.push({file:rel,sha256:this.hashFile(full),base64:fs.readFileSync(full).toString("base64")});}return records;}
  makeRollbackArchive(surfaceId,files,dir){const payload={format:"blue-current-rollback-v1",surfaceId,createdAt:new Date().toISOString(),authoritativeRootHash:null,files:this.snapshotFiles(files)};payload.digest=crypto.createHash("sha256").update(JSON.stringify(payload.files.map(x=>({file:x.file,sha256:x.sha256})))).digest("hex");const file=path.join(dir,`${surfaceId}-rollback.json`);fs.writeFileSync(file,JSON.stringify(payload,null,2));return {file:path.basename(file),path:file,digest:payload.digest,fileCount:payload.files.length,size:fs.statSync(file).size,format:payload.format};}
  textDiff(before,after,file){if(before===after)return "";const a=before.split(/\r?\n/),b=after.split(/\r?\n/);let first=0;while(first<a.length&&first<b.length&&a[first]===b[first])first++;let lastA=a.length-1,lastB=b.length-1;while(lastA>=first&&lastB>=first&&a[lastA]===b[lastB]){lastA--;lastB--;}return [`--- a/${file}`,`+++ b/${file}`,`@@ simulated removal @@`,...a.slice(Math.max(0,first-2),Math.min(a.length,lastA+3)).map(x=>`-${x}`),...b.slice(Math.max(0,first-2),Math.min(b.length,lastB+3)).map(x=>`+${x}`)].join("\n");}
  applySimulation(surfaceId,simRoot,impact){
    const changes=[],backups=new Set();
    const indexRel="client/index.html",indexFile=path.join(simRoot,indexRel);
    if(fs.existsSync(indexFile)){const before=fs.readFileSync(indexFile,"utf8");let after=this.removeHtmlElementById(before,surfaceId).text;after=this.removeCenterScripts(after,surfaceId,impact.graph.ownedFiles||[]).text;if(after!==before){fs.writeFileSync(indexFile,after);changes.push({file:indexRel,action:"modify",diff:this.textDiff(before,after,indexRel)});backups.add(indexRel);}}
    for(const rel of ["client/js/app-v15.1.3.js","client/app-v15.1.3.js","app-v15.1.3.js"]){
      const file=path.join(simRoot,rel);if(!fs.existsSync(file))continue;const before=fs.readFileSync(file,"utf8"),result=this.cleanStartupFile(before,surfaceId);if(result.text!==before){fs.writeFileSync(file,result.text);changes.push({file:rel,action:"modify",diff:this.textDiff(before,result.text,rel)});backups.add(rel);}
    }
    for(const rel of ["client/js/modules/operatorConsolidationEngine.js","client/js/modules/operatorSurfaceRationalizationEngine.js"]){
      const file=path.join(simRoot,rel);if(!fs.existsSync(file))continue;const before=fs.readFileSync(file,"utf8"),after=this.removeQuotedToken(before,surfaceId);if(after!==before){fs.writeFileSync(file,after);changes.push({file:rel,action:"modify",diff:this.textDiff(before,after,rel)});backups.add(rel);}
    }
    for(const rel of impact.graph.ownedFiles||[]){
      if(rel==="client/index.html"||/app-v15\.1\.3\.js$/.test(rel))continue;
      const file=path.join(simRoot,rel);if(fs.existsSync(file)&&fs.statSync(file).isFile()){fs.unlinkSync(file);changes.push({file:rel,action:"delete-in-simulation"});backups.add(rel);}
    }
    return {changes,backupFiles:[...backups].sort()};
  }
  validate(simRoot){
    const result=spawnSync(process.execPath,["scripts/validate.js"],{cwd:simRoot,encoding:"utf8",timeout:180000});
    const healthCheck=spawnSync(process.execPath,["--check","client/js/app-v15.1.3.js"],{cwd:simRoot,encoding:"utf8",timeout:30000});
    return {passed:result.status===0&&healthCheck.status===0,validator:{status:result.status,stdout:(result.stdout||"").slice(-4000),stderr:(result.stderr||"").slice(-4000)},startupSyntax:{status:healthCheck.status,stderr:(healthCheck.stderr||"").slice(-2000)}};
  }
  rehearse(surfaceId){
    const authoritativeBefore=this.repositoryDigest(),before=this.impactService.analyze(surfaceId),tempBase=fs.mkdtempSync(path.join(os.tmpdir(),"blue-current-retirement-")),simRoot=path.join(tempBase,"repo"),artifactDir=path.join(tempBase,"artifacts");
    fs.mkdirSync(artifactDir,{recursive:true});this.copyTree(this.rootPath,simRoot);
    const applied=this.applySimulation(surfaceId,simRoot,before);
    const rollback=this.makeRollbackArchive(surfaceId,applied.backupFiles,artifactDir);
    const simImpactService=new (this.impactService.constructor)(simRoot),after=simImpactService.analyze(surfaceId),validation=this.validate(simRoot);
    const changeSet={surfaceId,mode:"simulated-only",changes:applied.changes.map(x=>({file:x.file,action:x.action})),patchText:applied.changes.filter(x=>x.diff).map(x=>x.diff).join("\n\n"),authoritativeMutation:false,generatedAt:new Date().toISOString()};
    changeSet.digest=crypto.createHash("sha256").update(JSON.stringify({surfaceId:changeSet.surfaceId,changes:changeSet.changes,patchText:changeSet.patchText})).digest("hex");
    const changeSetPath=path.join(artifactDir,`${surfaceId}-simulated-change-set.json`);fs.writeFileSync(changeSetPath,JSON.stringify(changeSet,null,2));
    const authoritativeAfter=this.repositoryDigest(),authoritativeSafe=authoritativeBefore.sha256===authoritativeAfter.sha256&&authoritativeBefore.fileCount===authoritativeAfter.fileCount;
    const blockers=[];
    if(!validation.passed)blockers.push("Disposable-copy validation failed.");
    if((after.graph.startupDependencies||[]).length)blockers.push("Startup registry dependency remains after simulated removal.");
    if((after.graph.apiUsage||[]).length)blockers.push("API usage remains after simulated removal.");
    if((after.graph.inboundReferences||[]).some(x=>["reference","html-registration"].includes(x.type)))blockers.push("Operational inbound references remain after simulated removal.");
    return {surfaceId,version:"46.40.0",mode:"disposable-copy-rehearsal",before,after,validation,rollback:{...rollback,path:undefined,archiveGenerated:true},changeSet:{file:path.basename(changeSetPath),changeCount:changeSet.changes.length,patchCharacters:changeSet.patchText.length,digest:changeSet.digest,generated:true},readiness:{status:blockers.length?"rehearsal-blocked":"final-change-set-ready-for-human-review",blockers},safety:{authoritativeMutation:false,authoritativeSafe,authoritativeBefore,authoritativeAfter,codeDeletionAllowed:false,deletionExecuted:false,deleteEndpointPresent:false,tempCopyUsed:true},generatedAt:new Date().toISOString()};
  }
}
module.exports=RepositoryRetirementRehearsalService;
