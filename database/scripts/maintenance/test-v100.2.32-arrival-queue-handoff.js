"use strict";
const fs=require('fs'); const path=require('path');
const app=fs.readFileSync(path.join(process.cwd(),'client','js','app-v15.1.3.js'),'utf8');
const checks=[
 ['V100.2.32 marker installed',app.includes('V100.2.32 — Authoritative Arrived -> Seating Queue Handoff')],
 ['uses authoritative V100.2.17 queue API',app.includes('window.__bcArrivalPriorityQueueV100_2_17')],
 ['captures both Mark arrived button generations',app.includes('.bc-mark-arrived-v100-2-17, .bc-arrival-action-v100-2-13')],
 ['prevents legacy status-only click path',app.includes('event.stopImmediatePropagation()')],
 ['removes matching arrival card',app.includes("arrivals.querySelectorAll('.queue-item.arrival')")],
 ['de-duplicates ready guest',app.includes('hasReadyGuest(name)')],
 ['refreshes wait quote',app.includes('window.__bcHostWaitQuoteV100_2_26?.refresh?.()')],
 ['exposes repair API',app.includes('window.__bcArrivalQueueHandoffV100_2_32')]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,version:'100.2.32',checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length) process.exit(1);
