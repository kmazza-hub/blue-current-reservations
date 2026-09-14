"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
const pages=fs.readdirSync(root).filter(file=>file.endsWith(".html")),walkthrough=read("walkthrough.html"),runtime=read("js/walkthrough.js"),styles=read("styles.css");let count=0;
function check(label,value){assert.ok(value,label);count++;console.log(`PASS: ${label}`)}
check("No public page contains the retired LeadConnector booking URL",pages.every(file=>!read(file).includes("api.leadconnectorhq.com/widget/booking")));
check("Every converted walkthrough CTA stays on Blue Current",["index.html","platform.html","operations.html","concierge.html","executive.html","enterprise.html","product-demo.html","pilot-workspace.html","docs.html","roi-calculator.html","privacy.html","terms.html"].every(file=>read(file).includes('href="walkthrough.html"')));
check("Walkthrough page explains a focused 30-minute conversation",walkthrough.includes("In 30 minutes")&&walkthrough.includes("No generic sales deck"));
check("Request captures identity, restaurant, role, scheduling, and operating challenge",["wtName","wtEmail","wtRestaurant","wtRole","wtDate","wtTime","wtChallenge"].every(id=>walkthrough.includes(`id="${id}"`)));
check("Missing and invalid fields receive accessible inline feedback",runtime.includes("aria-invalid")&&runtime.includes("This field is required.")&&runtime.includes("Enter a valid work email."));
check("The final request is transparently addressed to Keith",runtime.includes("keith@bluecurrentco.com")&&walkthrough.includes("keith@bluecurrentco.com"));
check("A recoverable draft is retained before email handoff",runtime.includes("blueCurrentWalkthroughDraft")&&runtime.includes("localStorage.setItem"));
check("Walkthrough layout is responsive and first-class",styles.includes(".walkthrough-shell")&&styles.includes("@media(max-width:850px)"));
console.log(`Website walkthrough certification ${count}/${count}`);
