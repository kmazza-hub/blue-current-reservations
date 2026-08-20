const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const product=read('client/js/product-experience-v59.50.js');
const operator=read('client/js/operator-experience-v60.0.js');
const css=read('client/styles.css');
const checks=[
 ['legacy advanced classifier explicitly exempts Hospitality OS shell', /child\.id==="blueCurrentCommand"\s*\|\|\s*child\.classList\.contains\("bc-os-shell"\)/.test(product)],
 ['operator experience classifies Hospitality OS shell as core', /const CORE=\[\s*\n\s*"blueCurrentCommand","command-center"/.test(operator)],
 ['legacy advanced surfaces are display-none by default', /\.bc-advanced-surface\{display:none\s*!important\}/.test(css)],
 ['legacy deep tools are display-none by default', /\.bc-deep-tool\{display:none\s*!important\}/.test(css)],
 ['Hospitality OS shell has explicit grid display contract', /\.bc-os-shell\{[^}]*display:grid/.test(css)],
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,repair:'V100.1.7 Command Shell Visibility Ownership Hotfix',baselineVersion:'100.0.0',checks:checks.map(([name])=>name),failed},null,2));
process.exitCode=failed.length?1:0;
