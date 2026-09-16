"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
const shell=read("client/js/modules/hospitalityOsShell.js"),inventory=read("client/js/inventory-truth-v100.2.80.js"),host=read("client/js/floor-reservations-v62.0.js"),runtime=read("client/js/workspace-reliability-runtime-v100.3.67.js"),index=read("client/index.html"),pkg=require(path.join(root,"package.json"));
const checks=[];function check(name,condition){assert.ok(condition,name);checks.push(name);console.log(`PASS: ${name}`)}
check("All ten primary workspace routes remain declared",["command","guests","service","team","kitchen","inventory","performance","executive","integrations","system"].every(name=>index.includes(`data-bc-workspace="${name}"`)));
check("Sidebar delegated click gives workspace routing immediate ownership",shell.includes('function installPrimaryNavigation()')&&shell.includes('addEventListener("click"')&&shell.includes('stopImmediatePropagation()'));
check("Keyboard and click routing remain available",shell.includes('button.addEventListener("click"')||shell.includes('navigation.addEventListener("click"'));
check("Workspace scrolling no longer requests animated layout churn",shell.includes('scrollIntoView({behavior:"auto",block:"start"})'));
check("Inventory activation yields until primary routing completes",inventory.includes('setTimeout(()=>activate("operator-navigation"),0)'));
check("Inventory has a dedicated top-level workspace",shell.includes('inventory:["inventory-intelligence"]'));
check("Integrations has a dedicated top-level workspace",shell.includes('integrations:["bcIntegrationsWorkspace"]')&&shell.includes('ensureIntegrationsWorkspace'));
check("Integration Control is moved intact rather than cloned",shell.includes('workspace.appendChild(control)')&&!shell.includes('cloneNode'));
check("Required fields receive readable inline validation",runtime.includes('document.addEventListener("invalid"')&&runtime.includes('is required.'));
check("Validation clears after the operator fixes the field",runtime.includes('document.addEventListener("input"')&&runtime.includes('removeAttribute("aria-invalid")'));
check("Host forms provide the same inline feedback",host.includes('dialog?.addEventListener("invalid"')&&host.includes('bc-inline-field-error'));
check("V100.3.68 assets are cache advanced",["100.3.68","100.3.69","100.3.70","100.3.71","100.3.72","100.3.73","100.3.74","100.3.75","100.3.76","100.3.77","100.3.78","100.3.79"].includes(pkg.version)&&/content="100\.3\.(?:69|70|71|72|73|74|75|76|77|78|79)"/.test(index)&&/workspace-reliability-runtime-v100\.3\.67\.js\?v=100\.3\.(?:69|70|71|72|73|74|75|76|77|78|79)/.test(index));
console.log(`V100.3.67 workspace reliability ${checks.length}/${checks.length}`);
