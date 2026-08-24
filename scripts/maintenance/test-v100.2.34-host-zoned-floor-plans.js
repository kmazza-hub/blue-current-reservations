"use strict";
const fs=require('fs'), path=require('path');
const root=process.cwd();
const js=fs.readFileSync(path.join(root,'client','js','app-v15.1.3.js'),'utf8');
const css=fs.readFileSync(path.join(root,'client','styles.css'),'utf8');
const html=fs.readFileSync(path.join(root,'client','index.html'),'utf8');
const checks=[
 ['V100.2.34 JS marker',js.includes('V100.2.34 — Zoned Host Floor Plans')],
 ['three host zone buttons exist',(html.match(/data-host-zone=/g)||[]).length>=3],
 ['main zone contract',js.includes("main: { label:'Main floor', tables:['2','4','6'] }")],
 ['waterfront zone contract',js.includes("waterfront: { label:'Waterfront', tables:['8','14','16'] }")],
 ['private zone contract',js.includes("private: { label:'Private dining', tables:['18','20','22'] }")],
 ['hidden tables removed from layout',css.includes('.host-table.bc-zone-hidden-v100-2-34') && css.includes('display:none !important')],
 ['room switch clears neutral detail',js.includes('closeNeutralDetail();')],
 ['public room helper installed',js.includes('window.__bcHostZonesV100_2_34')],
 ['zone-specific open count',js.includes('const openCount = (zone)')],
 ['V100.2.33 preserved',js.includes('V100.2.33 — Neutral Table Detail Dismiss')]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,version:'100.2.34',checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length) process.exit(1);
