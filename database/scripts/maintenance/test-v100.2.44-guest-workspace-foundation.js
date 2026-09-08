const fs=require('fs');let pass=0;const checks=[];const js=fs.readFileSync('client/js/floor-reservations-v62.0.js','utf8'),css=fs.readFileSync('client/styles.css','utf8');
function check(name,ok){checks.push([name,!!ok]);if(ok)pass++;else process.exitCode=1;}
check('registry preserves visit history',js.includes('const visits=Array.isArray(previous.visits)'));
check('guest search spans operational context',js.includes('function guestSearchText(guest)'));
check('recent guests sorted by last seen',js.includes('sort((a,b)=>(b.lastSeenAt||0)-(a.lastSeenAt||0))'));
check('guest status is explicit',js.includes('function guestStatusLabel(guest)'));
check('guest detail shows visit history',js.includes('Visit history'));
check('history capped for host-speed profile',js.includes('slice().reverse().slice(0,6)'));
check('guest cards have dedicated styling',css.includes('.bc-guest-result-v244'));
check('profile history has dedicated styling',css.includes('.bc-guest-profile-v244__history'));
console.log(checks.map(([n,o])=>`${o?'PASS':'FAIL'} ${n}`).join('\n'));console.log(`\n${pass}/${checks.length} checks passed`);
