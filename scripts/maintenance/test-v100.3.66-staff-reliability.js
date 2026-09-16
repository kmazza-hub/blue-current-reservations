"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8"),runtime=read("client/js/staff-reliability-runtime-v100.3.66.js"),workforce=read("client/js/modules/workforceFoundation.js"),clock=read("client/js/timeclock-truth-v100.2.76.js"),service=read("server/services/workforceFoundationService.js"),index=read("client/index.html"),pkg=require(path.join(root,"package.json"));
const checks=[];function check(name,condition){assert.ok(condition,name);checks.push(name);console.log(`PASS: ${name}`)}
check("Birthday is collected during employee setup",runtime.includes('addField("wffBirthday","Birthday","date"'));
check("Birthday creates an editable DDMM clock PIN",runtime.includes('`${match[2]}${match[1]}`')&&runtime.includes('pin.type="text"'));
check("Birthday persists with the employee record",service.includes('birthday: String(input.birthday')&&service.includes('"birthday","pin"'));
check("Duplicate PIN errors are shown beside the PIN field",runtime.includes('/PIN/i.test(error.message||"")?error.message'));
check("PTO requires employee, dates, and reason before submission",runtime.includes('Add the ${missing.join(", ")} before requesting PTO.'));
check("PTO submissions have an explicit busy state and result",runtime.includes('"Requesting PTO…"')&&runtime.includes('PTO request added to the manager queue.'));
check("Shift templates validate before reaching the API",runtime.includes("Complete the template name, role, department, start time, and end time."));
check("Employee termination uses an in-app manager dialog",runtime.includes('End employment for ${name}?')&&!runtime.includes("window.prompt"));
check("Timecard correction uses an in-app manager dialog",runtime.includes('title:"Correct this timecard"')&&!runtime.includes("window.prompt"));
check("Clock PIN changes use an in-app validated dialog",runtime.includes('id="bcChangePinDialogV100366"')&&runtime.includes('target.matches("[data-reset-pin]")'));
check("Staff write actions disable duplicate clicks",runtime.includes('button.setAttribute("aria-busy","true")')&&runtime.includes('if(button.disabled)return null'));
check("Timecards display date and time",clock.includes('month:"short",day:"numeric",hour:"numeric",minute:"2-digit"'));
check("V100.3.66 runtime is cache advanced",["100.3.66","100.3.67","100.3.68","100.3.69","100.3.70","100.3.71","100.3.72","100.3.73","100.3.74","100.3.75","100.3.76"].includes(pkg.version)&&/content="100\.3\.(?:66|67|68|69|70|71|72|73|74|75|76)"/.test(index)&&/staff-reliability-runtime-v100\.3\.66\.js\?v=100\.3\.(?:66|67|68|69|70|71|72|73|74|75|76)/.test(index));
check("Existing workforce and time-clock API boundaries remain intact",workforce.includes("createWorkforceEmployee")&&clock.includes("correctTimecard"));
console.log(`V100.3.66 staff reliability ${checks.length}/${checks.length}`);
