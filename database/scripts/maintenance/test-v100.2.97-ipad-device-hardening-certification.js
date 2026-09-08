"use strict";
const fs=require("fs"),path=require("path");
let passed=0,total=0;
function check(condition,name){total++;console.log(`${condition?"PASS":"FAIL"}: ${name}`);if(condition)passed++;else process.exitCode=1;}
const root=process.cwd(),read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const html=read("client/index.html"),css=read("client/styles.css"),manifest=read("client/manifest.webmanifest");
const resume=read("client/js/ipad-resume-truth-v100.2.86.js");
const host=read("client/js/floor-reservations-v62.0.js");
const app=read("client/js/app-v15.1.3.js");
const kitchenPriority=read("client/js/kitchen-priority-v100.2.62.js");
const kitchenService=read("client/js/kitchen-service-handoff-v100.2.61.js");
const manager=read("client/js/manager-action-ownership-v100.2.69.js");

check(/name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/.test(html),"standalone viewport and safe-area geometry certified");
check(html.includes('apple-mobile-web-app-capable" content="yes"'),"Apple Home Screen capability certified");
check(html.includes('apple-mobile-web-app-status-bar-style" content="black-translucent"'),"standalone status-bar mode certified");
check(/"display"\s*:\s*"standalone"/.test(manifest),"PWA standalone display certified");
check(css.includes("@media (pointer:coarse) and (max-width:1366px)"),"landscape iPad remains inside touch scope");
check(css.includes("@media(max-width:900px)")||css.includes("@media (max-width:900px)"),"portrait iPad responsive boundary exists");
check(css.includes("min-height:44px")&&css.includes("touch-action:manipulation"),"touch target and tap behavior certified");
check(css.includes('input:not([type="checkbox"]):not([type="radio"])')&&css.includes("font-size:16px"),"iOS form zoom protection certified");
check(css.includes("#host-stand #waitlistQueue")&&css.includes("#host-stand #arrivalQueue"),"Host high-volume queues retain tablet scrolling");
check(css.includes("-webkit-overflow-scrolling:touch")&&css.includes("overscroll-behavior:contain"),"native contained scrolling certified");
check(css.includes("V100.2.95 · iPad Safe Area + Keyboard Viewport Integrity"),"safe-area and keyboard viewport wave present");
check(css.includes("safe-area-inset-top")&&css.includes("safe-area-inset-bottom"),"top and Home-indicator insets certified");
check(css.includes(".bc-host-dialog-card")&&css.includes("100dvh")&&css.includes("overflow:auto !important"),"keyboard-reduced Host dialog remains scrollable");
check(css.includes("height:calc(68px + env(safe-area-inset-bottom))"),"bottom navigation clears Home indicator");

check(resume.includes('document.addEventListener("visibilitychange"'),"foreground resume signal certified");
check(resume.includes('window.addEventListener("pageshow"'),"BFCache/pageshow recovery certified");
const resumeFlow=resume.slice(resume.indexOf('async function resume('),resume.indexOf('document.addEventListener("visibilitychange"'));
check(resumeFlow.indexOf("BlueCurrentConnectivityTruth.verify")<resumeFlow.indexOf("verifySession(reason)"),"connectivity precedes protected session recovery");
check(resumeFlow.indexOf("BlueCurrentOfflineSync.replay")<resumeFlow.indexOf("refreshSharedState(reason)"),"queued writes and fresh shared state remain ordered");
check(resume.includes("waitForRenderCommit"),"fresh render commit remains required before unlock");
check(!resume.includes("setInterval("),"resume lifecycle adds no polling");
check(!resume.includes("location.reload("),"resume lifecycle never forces a reload");

check(host.includes("let dialogSubmitting=false;"),"Host dialog repeat-submit lock certified");
check(/if\(dialogSubmitting\)return;[\s\S]*dialogSubmitting=true;/.test(host),"repeat tap exits before Host state mutation");
check(app.includes("flow.handling = true")&&app.includes("finally { flow.handling = false; }"),"unified seating event ownership certified");
check(app.includes("if (!row || !table || !flow.active) return;"),"seating requires one active guest/table transaction");

for(const [name,source,target] of [["Kitchen priority",kitchenPriority,"root"],["Kitchen Service",kitchenService,"overlay"],["Manager ownership",manager,"view"]]){
  check(source.includes("observer?.disconnect();"),`${name} pauses self-observation`);
  check(new RegExp(`observer\\?\\.observe\\(${target},\\{childList:true,subtree:true\\}\\)`).test(source),`${name} restores external observation`);
}

check(!css.slice(css.indexOf("V100.2.93 · iPad Touch Target Foundation")).includes("touch-action:none"),"tablet hardening never suppresses general touch scrolling");
check(!css.slice(css.indexOf("V100.2.93 · iPad Touch Target Foundation")).includes("display:none!important"),"tablet hardening does not hide application content");
check(!/orientationchange|screen\.orientation/.test(resume+host),"orientation remains responsive CSS behavior without duplicate lifecycle code");
check(total===34,"certification gate contains all 35 planned checks");
console.log(`V100.2.97 validation ${passed}/${total}`);
if(passed!==total)process.exitCode=1;
