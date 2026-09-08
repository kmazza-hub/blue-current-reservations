"use strict";
const crypto=require("crypto"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"..");
const value=name=>{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:null;};
const verifyOnly=process.argv.includes("--verify"),source=value("--source"),target=path.resolve(value("--target")||process.env.BLUE_CURRENT_DB||"");
const hash=raw=>crypto.createHash("sha256").update(raw).digest("hex");
const fail=message=>{throw new Error(message);};
function inspect(raw){
  let data;try{data=JSON.parse(raw);}catch{fail("Source must be valid JSON.");}
  if(!data||typeof data!=="object"||Array.isArray(data))fail("Source must contain one database object.");
  for(const collection of ["organizations","locations","users","tables"]){if(!Array.isArray(data[collection]))fail(`Source collection ${collection} is required.`);}
  const plaintext=[];const walk=(entry,trail="")=>{if(!entry||typeof entry!=="object")return;for(const [key,child]of Object.entries(entry)){const next=trail?`${trail}.${key}`:key;if(/^(?:password|secret|apiKey|accessToken|refreshToken)$/i.test(key)&&typeof child==="string"&&child)plaintext.push(next);if(child&&typeof child==="object")walk(child,next);}};walk(data);
  if(plaintext.length)fail(`Source contains prohibited plaintext credentials: ${plaintext.slice(0,5).join(", ")}`);
  return {data,counts:{organizations:data.organizations.length,locations:data.locations.length,users:data.users.length,tables:data.tables.length}};
}
(async()=>{
  if(!target||!path.isAbsolute(target))fail("An absolute --target or BLUE_CURRENT_DB path is required.");
  const relative=path.relative(root,target);if(relative&&!relative.startsWith("..")&&!path.isAbsolute(relative))fail("Hosted database target must be outside the application repository.");
  const manifestPath=`${target}.provision.meta.json`;
  if(verifyOnly){
    const raw=await fs.promises.readFile(target,"utf8"),manifest=JSON.parse(await fs.promises.readFile(manifestPath,"utf8")),inspection=inspect(raw),actual=hash(raw);
    if(actual!==manifest.sha256)fail("Provisioned database checksum does not match its manifest.");
    console.log(JSON.stringify({status:"HOSTED_DATA_VERIFIED",target,sha256:actual,bytes:Buffer.byteLength(raw),counts:inspection.counts,provisionedAt:manifest.provisionedAt},null,2));return;
  }
  if(!source)fail("--source is required for first-time hosted provisioning.");
  const sourcePath=path.resolve(source);if(sourcePath===target)fail("Source and target must be different files.");
  if(fs.existsSync(target)||fs.existsSync(manifestPath))fail("Hosted target or provisioning manifest already exists; overwrite is forbidden.");
  const raw=await fs.promises.readFile(sourcePath,"utf8"),inspection=inspect(raw),sha256=hash(raw),directory=path.dirname(target),temporary=`${target}.provision.${process.pid}.tmp`;
  await fs.promises.mkdir(directory,{recursive:true});
  try{
    await fs.promises.writeFile(temporary,raw,{encoding:"utf8",mode:0o600,flag:"wx"});
    const staged=await fs.promises.readFile(temporary,"utf8");if(hash(staged)!==sha256)fail("Staged database checksum mismatch.");
    await fs.promises.rename(temporary,target);
    const manifest={version:1,sourceFile:path.basename(sourcePath),targetFile:path.basename(target),sha256,bytes:Buffer.byteLength(raw),counts:inspection.counts,provisionedAt:new Date().toISOString(),overwriteAllowed:false};
    await fs.promises.writeFile(manifestPath,JSON.stringify(manifest,null,2),{encoding:"utf8",mode:0o600,flag:"wx"});
    console.log(JSON.stringify({status:"HOSTED_DATA_PROVISIONED",target,manifestPath,...manifest},null,2));
  }finally{await fs.promises.unlink(temporary).catch(()=>undefined);}
})().catch(error=>{console.error(`Hosted provisioning blocked: ${error.message}`);process.exitCode=1;});
