"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const root=process.cwd();
const js=fs.readFileSync(path.join(root,"client","js","app-v15.1.3.js"),"utf8");
const css=fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks=[
  ["adaptive-label baseline preserved",js.includes("__bcHostAdaptiveLabelsV100_2_25")],
  ["wait quote API installed",js.includes("__bcHostWaitQuoteV100_2_26")],
  ["reserved table tools API installed",js.includes("__bcReservedTableToolsV100_2_26")],
  ["position-aware estimate present",js.includes("estimatedMinutesForPosition")],
  ["current wait quote surface present",js.includes("bcHostCurrentWaitQuoteV100_2_26")],
  ["reserved guest selector present",js.includes("bc-reserved-guest-select-v100-2-26")],
  ["reserved table can release",js.includes("Release table")],
  ["linked ready guest can seat",js.includes("seatLinkedReady")],
  ["reserved card styling present",css.includes("bc-reserved-table-tool-v100-2-26")],
  ["wait quote styling present",css.includes("bc-host-current-wait-quote-v100-2-26")]
];
let syntax=true;try{new vm.Script(js,{filename:"app-v15.1.3.js"});}catch(e){syntax=false;console.error(e.stack||e)}
checks.push(["JavaScript syntax valid",syntax]);
const failed=checks.filter(([,ok])=>!ok);
console.log(JSON.stringify({ok:failed.length===0,version:"100.2.26",checks:checks.map(([name,ok])=>({name,ok})),failed:failed.map(([name])=>name)},null,2));
if(failed.length)process.exit(1);
