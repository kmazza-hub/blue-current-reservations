"use strict";

const os=require("os");
const path=require("path");
const {spawn}=require("child_process");

const root=path.resolve(__dirname,"..");
const port=Number(process.env.PORT||8787);

function privateIpv4(address){
  const octets=String(address||"").split(".").map(Number);
  return octets.length===4&&octets.every(value=>Number.isInteger(value)&&value>=0&&value<=255)&&(
    octets[0]===10||(octets[0]===192&&octets[1]===168)||(octets[0]===172&&octets[1]>=16&&octets[1]<=31)
  );
}

function addresses(){
  return Object.values(os.networkInterfaces()).flat().filter(item=>
    item&&!item.internal&&item.family==="IPv4"&&privateIpv4(item.address)
  ).map(item=>item.address).sort();
}

const urls=addresses().map(address=>`http://${address}:${port}`);
if(process.argv.includes("--list")){
  console.log(JSON.stringify({port,urls},null,2));
  process.exit(0);
}

console.log("Blue Current physical iPad LAN test");
console.log("Keep this PowerShell window open during the test.");
if(urls.length){
  console.log("\nOpen one of these addresses in Safari on an iPad using the same Wi-Fi:");
  urls.forEach(url=>console.log(`  ${url}`));
}else{
  console.log("\nNo private Wi-Fi/Ethernet address was detected. Connect the computer to the same network as the iPad and try again.");
  process.exit(1);
}
console.log("\nPress Ctrl+C to stop Blue Current after the walkthrough.\n");

const child=spawn(process.execPath,[path.join(root,"server/server.js")],{
  cwd:root,
  env:{...process.env,BLUE_CURRENT_ENV:"development",PORT:String(port)},
  stdio:"inherit"
});
const stop=signal=>{if(child.exitCode===null)child.kill(signal);};
process.on("SIGINT",()=>stop("SIGINT"));
process.on("SIGTERM",()=>stop("SIGTERM"));
child.on("exit",code=>process.exit(code??0));
