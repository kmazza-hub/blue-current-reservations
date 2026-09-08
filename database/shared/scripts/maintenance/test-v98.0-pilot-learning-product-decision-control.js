"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));assert.equal(pkg.version,"98.0.0");
const s=fs.readFileSync(path.join(root,"server/services/pilotLearningProductDecisionControlService.js"),"utf8");
for(const id of["PILOT_VALUE_ACCEPTED","PRODUCT_DECISION_EVIDENCE_LINKED","DECISION_OWNERSHIP_ASSIGNED","PRIORITY_ASSIGNED","HIGH_RISK_DECISIONS_RESOLVED","HUMAN_PRODUCT_DECISION_PRESENT"])assert(s.includes(`id:"${id}"`),id);
for(const x of["FIX","SIMPLIFY","RETAIN","DEFER","EXPAND","P0","P1","P2","P3","LOW","MEDIUM","HIGH","CRITICAL"])assert(s.includes(`"${x}"`),x);
for(const x of["evidenceLinkRequired:true","humanOwnerRequired:true","humanPriorityRequired:true","expansionDecisionIsNotExpansionAuthorization:true","noAutomaticBacklogMutation:true","noAutomaticProductChange:true","noAutomaticExpansion:true","noAutomaticCommercialization:true","autonomousProductionChanges:false"])assert(s.includes(x),x);
const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");assert(router.includes("/api/pilot/product-decisions"));assert(router.includes("/close"));
console.log(JSON.stringify({ok:true,version:"98.0.0",decisionTypes:5,priorityLevels:4,riskLevels:4,decisionControlChecks:6,evidenceLinked:true,humanOwner:true,humanPriority:true,noAutomaticProductChange:true,noAutomaticExpansion:true,noAutomaticCommercialization:true,nextGate:"COMMERCIAL_PRODUCT_FREEZE_AND_FINAL_HARDENING"},null,2));
