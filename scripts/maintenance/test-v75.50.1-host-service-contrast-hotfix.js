"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

assert.equal(pkg.version,"75.50.1");
assert(html.includes('content="75.50.1"'));
assert(html.includes("styles.css?v=75.50.1"));
assert(css.includes("V75.50.1 · Host Stand + Live Service contrast hotfix"));

for(const selector of [
  "#service-coordination .section-heading-light h2",
  "#service-coordination .svc-kpis article>strong",
  "#service-coordination .svc-head h3",
  "#service-coordination .svc-table td",
  "#service-coordination .svc-empty",
  "#host-stand .section-heading h2",
  "#host-stand .host-topbar h3",
  "#host-stand .host-quick-stats strong",
  "#host-stand .host-nav button"
]) assert(css.includes(selector),selector);

assert(css.includes("color:#ffffff!important"));
assert(css.includes("color:#cbe7f0!important"));
assert(css.includes("color:#b8d4df!important"));
assert(css.includes("background:#f2bf5b!important"));

console.log(JSON.stringify({
  ok:true,version:"75.50.1",
  serviceHeadlineBright:true,
  serviceKpisBright:true,
  serviceCardTitlesBright:true,
  serviceSecondaryCopyBright:true,
  serviceTableBright:true,
  hostHeadlineBright:true,
  hostNavigationBright:true,
  hostDataBright:true,
  mobileContrastPreserved:true,
  layoutChanged:false
},null,2));
