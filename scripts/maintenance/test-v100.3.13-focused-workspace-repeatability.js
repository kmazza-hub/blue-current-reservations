const fs=require("fs");
const js=fs.readFileSync("client/js/focused-operator-workspaces-v100.3.9.js","utf8");
const html=fs.readFileSync("client/index.html","utf8");
const checks=[
  ["certification version declared",js.includes('VERSION="100.3.13"')],
  ["all four focused jobs retained",["guests","service","kitchen","staff"].every(key=>js.includes(`${key}:{title:`))],
  ["single live target is portaled",js.includes("stage.replaceChildren(target)")],
  ["same-target reentry stays idempotent",js.includes("currentJob===key&&currentTarget===target&&stage.contains(target)")],
  ["original placement remains guarded",js.includes("currentPlacement?.target===target")&&js.includes("placeholder.parentNode.insertBefore")],
  ["target guard remains local",js.includes('targetGuard.observe(target')&&!js.includes('observe(document.body')],
  ["slow iPad acquisition window is six seconds",js.includes("attempt<120")&&js.includes("attempt+1),50")],
  ["unavailable lifecycle is explicit",js.includes("bc:operator-workspace-unavailable")],
  ["opened lifecycle is explicit",js.includes("bc:operator-workspace-opened")],
  ["closed lifecycle is explicit",js.includes("bc:operator-workspace-closed")],
  ["health snapshot is exposed",js.includes("snapshot:workspaceSnapshot")&&js.includes("stageContainsTarget")],
  ["Back restores Host home",js.includes("returnToHostHome")&&js.includes("#host-stand")],
  ["Kitchen refresh remains targeted",js.includes('if(key==="kitchen")')&&js.includes("#ktRefresh")],
  ["Floor focus remains separate",js.includes("focusFloor")&&js.includes("bc-ipad-floor-focus")],
  ["no broad application observer added",!js.includes("observer.observe(document.body")&&!js.includes("observer.observe(document.documentElement")],
  ["new browser cache key",html.includes('focused-operator-workspaces-v100.3.9.js?v=100.3.13')]
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}: ${name}`);if(ok)passed++;else process.exitCode=1;}
console.log(`V100.3.13 Focused workspace repeatability gate: ${passed}/${checks.length}`);
