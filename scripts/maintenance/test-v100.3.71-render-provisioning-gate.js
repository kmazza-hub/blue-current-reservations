"use strict";
const assert=require("assert"),fs=require("fs"),http=require("http"),os=require("os"),path=require("path"),{spawn,spawnSync}=require("child_process");
const root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8"),checks=[];
const check=(label,value)=>{assert.ok(value,label);checks.push(label);console.log(`PASS: ${label}`)};
const blueprint=read("render.yaml"),docker=read("deploy/hosted-pilot/Dockerfile"),start=read("scripts/hosted-start.js"),pkg=require(path.join(root,"package.json"));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(port,url){return new Promise((resolve,reject)=>{const req=http.get({hostname:"127.0.0.1",port,path:url},response=>{let raw="";response.on("data",chunk=>raw+=chunk);response.on("end",()=>resolve({status:response.statusCode,body:raw}))});req.on("error",reject)});}
(async()=>{
 check("Build retains V100.3.71 or later",["100.3.71","100.3.72","100.3.73"].includes(pkg.version));
 check("Render uses the certified Git branch and Docker build",blueprint.includes("branch: live-service-timeline")&&blueprint.includes("runtime: docker")&&blueprint.includes("dockerfilePath: ./deploy/hosted-pilot/Dockerfile"));
 check("Render is pinned to one manually deployed instance",blueprint.includes("numInstances: 1")&&blueprint.includes("autoDeployTrigger: off"));
 check("Render mounts one persistent pilot disk",blueprint.includes("mountPath: /var/lib/blue-current")&&blueprint.includes("sizeGB: 1"));
 check("Render health remains explicit without the disk-incompatible shutdown setting",blueprint.includes("healthCheckPath: /api/health")&&!blueprint.includes("maxShutdownDelaySeconds"));
 check("Production database path is on the mounted disk",blueprint.includes("value: /var/lib/blue-current/blue-current.json"));
 check("Initial provisioning mode requires a human-supplied value",/key: BLUE_CURRENT_PROVISIONING_MODE\s+sync: false/.test(blueprint));
 check("Docker starts through the hosted safety gate",docker.includes('CMD ["node","scripts/hosted-start.js"]'));
 check("Hosted gate refuses multi-instance JSON operation",start.includes("instanceCount!==1")&&start.includes("BLUE_CURRENT_INSTANCE_COUNT=1"));
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"bc-render-gate-")),missing=path.join(temp,"blue-current.json"),port=24000+Math.floor(Math.random()*1000);
 const env={...process.env,BLUE_CURRENT_ENV:"production",NODE_ENV:"production",BLUE_CURRENT_DB:missing,BLUE_CURRENT_INSTANCE_COUNT:"1",BLUE_CURRENT_PROVISIONING_MODE:"true",PORT:String(port)};
 const child=spawn(process.execPath,[path.join(root,"scripts/hosted-start.js")],{cwd:root,env,stdio:"ignore"});
 let health=null;for(let i=0;i<50;i++){try{health=await request(port,"/api/health");break}catch{await pause(50)}}
 check("Empty disk exposes only provisioning health",health?.status===200&&JSON.parse(health.body).status==="PROVISIONING_REQUIRED"&&JSON.parse(health.body).applicationExposed===false);
 const app=await request(port,"/");check("Application routes remain locked before provisioning",app.status===503&&JSON.parse(app.body).status==="PROVISIONING_REQUIRED");
 child.kill("SIGTERM");await Promise.race([new Promise(resolve=>child.once("exit",resolve)),pause(3000)]);
 const strict=spawnSync(process.execPath,[path.join(root,"scripts/hosted-start.js")],{cwd:root,env:{...env,BLUE_CURRENT_PROVISIONING_MODE:"false",PORT:String(port+1)},encoding:"utf8",timeout:5000});
 check("Missing production data fails closed outside provisioning mode",strict.status!==0&&strict.stderr.includes("Configured database does not exist"));
 const scaled=spawnSync(process.execPath,[path.join(root,"scripts/hosted-start.js")],{cwd:root,env:{...env,BLUE_CURRENT_INSTANCE_COUNT:"2",PORT:String(port+2)},encoding:"utf8",timeout:5000});
 check("Multiple JSON writers fail before startup",scaled.status!==0&&scaled.stderr.includes("BLUE_CURRENT_INSTANCE_COUNT=1"));
 fs.rmSync(temp,{recursive:true,force:true});
 console.log(`V100.3.71 Render provisioning gate ${checks.length}/${checks.length}`);
})().catch(error=>{console.error(error);process.exit(1)});
