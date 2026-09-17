"use strict";
const fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../..");
const connectivity=fs.readFileSync(path.join(root,"client/js/network-connectivity-truth-v100.2.85.js"),"utf8");
const feedback=fs.readFileSync(path.join(root,"client/js/interaction-feedback-v64.0.js"),"utf8");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const pkg=require(path.join(root,"package.json"));
const checks=[
  ["Build retains V100.3.70 or later",["100.3.70","100.3.71","100.3.72","100.3.73","100.3.74","100.3.75","100.3.76","100.3.77","100.3.78","100.3.83"].includes(pkg.version)&&/content="100\.3\.(?:70|71|72|73|74|75|76|77|78|79|80|81|82|83)"/.test(html)],
  ["Connectivity rechecks after authenticated session",connectivity.includes('bluecurrent:auth-session-state')&&connectivity.includes('authenticated!==true')&&connectivity.includes('verify("authentication-complete")')],
  ["Authentication recheck is delayed through the login handoff",connectivity.includes('setTimeout(()=>verify("authentication-complete"),250)')],
  ["Only the newest authentication recheck remains scheduled",connectivity.includes("clearTimeout(authRecheckTimer)")],
  ["Connectivity notification has single current owner",feedback.includes("let connectivityToast=null")],
  ["A new connectivity state removes the stale notification",feedback.includes("connectivityToast?.remove?.()")],
  ["Corrected connectivity assets are cache advanced",/interaction-feedback-v64\.0\.js\?v=100\.3\.(?:70|71|72|73)/.test(html)&&/network-connectivity-truth-v100\.2\.85\.js\?v=100\.3\.(?:70|71|72|73)/.test(html)]
];
let passed=0;for(const [name,ok] of checks){if(!ok)throw new Error(`FAIL: ${name}`);passed++;console.log(`PASS: ${name}`)}
console.log(`V100.3.70 post-login connectivity ${passed}/${checks.length}`);
