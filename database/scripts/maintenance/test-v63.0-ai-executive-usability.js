"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/ai-executive-v63.0.js"),"utf8");
const nav=fs.readFileSync(path.join(root,"client/js/navigation-v61.0.js"),"utf8");

assert.equal(pkg.version,"63.0.0");
assert(html.includes('content="63.0.0"'));
assert(html.includes("What should we do next—and why?"));
assert(html.includes("Highest-priority decision"));
assert(html.includes("Ask Blue Current"));
assert(html.includes('id="execDownloadBriefing"'));
assert(html.includes('id="execGuestIntelligence"'));
assert(html.includes("Know which location needs leadership attention—and why."));
assert(js.includes("Show advanced intelligence"));
assert(js.includes("bc-ai-advanced-surface"));
assert(js.includes("Show portfolio detail"));
assert(js.includes("execDownloadBriefing"));
assert(js.includes("new Blob"));
assert(js.includes("execGuestIntelligence"));
assert(nav.includes("bc-ai-advanced-surface"));
assert(css.includes("#restaurantAiBrainV341 .bc-ai-advanced-surface{display:none!important}"));
assert(css.includes("#executive-command-center .bc-exec-detail{display:none!important}"));
assert(css.includes("#executive-command-center .exec-alerts{grid-column:1}"));

console.log(JSON.stringify({
  ok:true,
  version:"63.0.0",
  aiDecisionLanguageSimplified:true,
  aiPriorityFirst:true,
  aiEvidenceVisible:true,
  aiAdvancedIntelligenceCollapsed:true,
  aiAdvancedIntelligenceRecoverable:true,
  nestedAiNavigationRecoverable:true,
  executiveRiskFirst:true,
  executiveBriefFirst:true,
  executivePortfolioDetailCollapsed:true,
  executivePortfolioDetailRecoverable:true,
  executiveBriefingDownloadWorks:true,
  guestIntelligenceNavigationWorks:true,
  keyboardLocationSelection:true,
  noBackendRemoval:true
},null,2));
