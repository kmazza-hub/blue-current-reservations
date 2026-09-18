"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const pkg=require(path.join(root,"package.json"));
let passed=0;
function check(name,value){assert.ok(value,name);passed++;console.log(`PASS: ${name}`);}
const directCallLinks=html.match(/href="tel:\+18483090042"/g)||[];
const accessibleLabels=html.match(/aria-label="Call Keith at 848-309-0042"/g)||[];
check("Build advances to V100.3.84",pkg.version==="100.3.84"&&html.includes('content="100.3.84"'));
check("Both walkthrough CTAs are direct telephone links",directCallLinks.length===2);
check("Both direct-call links have explicit accessible names",accessibleLabels.length===2);
check("Telephone number is readable in both CTA labels",(html.match(/Call Keith · 848-309-0042/g)||[]).length===2);
check("Obsolete scheduling CTA is removed",!html.includes("Schedule a private walkthrough"));
check("Contact email remains available",html.includes('href="mailto:keith@bluecurrentco.com"'));
check("Pilot inquiry form remains available",html.includes('class="pilot-form"'));
console.log(`V100.3.84 direct-call CTA ${passed}/${passed}`);
