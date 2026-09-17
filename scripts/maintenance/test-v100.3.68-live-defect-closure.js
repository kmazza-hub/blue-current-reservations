"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
const runtime=read("client/js/live-defect-closure-v100.3.68.js"),index=read("client/index.html"),pkg=require(path.join(root,"package.json"));
const checks=[];function check(name,condition){assert.ok(condition,name);checks.push(name);console.log(`PASS: ${name}`)}
check("Integration Control is forced visible in its dedicated workspace",runtime.includes("#bcIntegrationsWorkspace #integrationControlCenter")&&runtime.includes("display:block!important"));
check("Add Employee validation takes first capture ownership",runtime.includes('window.addEventListener("click"')&&runtime.includes("stopImmediatePropagation"));
check("All employee setup fields receive inline validation",["wffName","wffRole","wffDepartment","wffRate","wffPreferredHours","wffBirthday","wffPin"].every(id=>runtime.includes(id)));
check("Employee validation gives a readable summary",runtime.includes("Complete the highlighted fields."));
check("Invalid fields are focused and marked accessibly",runtime.includes('aria-invalid')&&runtime.includes("first.focus()"));
check("V100.3.68 assets are cache advanced",["100.3.68","100.3.69","100.3.70","100.3.71","100.3.72","100.3.73","100.3.74","100.3.75","100.3.76","100.3.77","100.3.78","100.3.83"].includes(pkg.version)&&/content="100\.3\.(?:69|70|71|72|73|74|75|76|77|78|79|80|81|82|83)"/.test(index)&&/live-defect-closure-v100\.3\.68\.js\?v=100\.3\.(?:69|70|71|72|73|74|75|76|77|78|79|80|81|82|83)/.test(index));
console.log(`V100.3.68 live defect closure ${checks.length}/${checks.length}`);
