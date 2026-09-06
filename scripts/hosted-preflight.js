"use strict";
const path=require("path");
const ProductionConfigurationService=require("../server/services/productionConfigurationService");
const root=path.resolve(__dirname,"..");
const databasePath=process.env.BLUE_CURRENT_DB||"";
const reportService=new ProductionConfigurationService({root,databasePath,port:Number(process.env.PORT||8787),environment:process.env});
(async()=>{
  const report=await reportService.validate();
  const requiredFiles=["deploy/hosted-pilot/Dockerfile","deploy/hosted-pilot/environment.example",".dockerignore"];
  const fs=require("fs"),fileChecks=requiredFiles.map(file=>({file,ok:fs.existsSync(path.join(root,file))}));
  const output={release:require("../package.json").version,status:report.ready&&fileChecks.every(item=>item.ok)?"HOSTED_PREFLIGHT_READY":"HOSTED_PREFLIGHT_BLOCKED",publicUrl:report.publicUrl,databasePath:report.databasePath,persistenceDriver:report.persistenceDriver,singleWriterRequired:report.persistenceDriver==="json",errors:report.errors,warnings:report.warnings,fileChecks,checks:report.checks};
  console.log(JSON.stringify(output,null,2));
  if(output.status!=="HOSTED_PREFLIGHT_READY")process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
