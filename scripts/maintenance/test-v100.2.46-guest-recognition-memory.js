const fs=require('fs');
const js=fs.readFileSync('client/js/floor-reservations-v62.0.js','utf8');
const css=fs.readFileSync('client/styles.css','utf8');
const checks=[
 ['recognition engine',js.includes('function guestRecognition(guest)')],
 ['repeat guest classification',js.includes('visitCount>=5?"Regular":repeat?"Returning":"First visit"')],
 ['occasion recognition',js.includes('/anniversary/')&&js.includes('/birthday/')],
 ['dietary recognition',js.includes('Dietary note')],
 ['accessibility recognition',js.includes('Accessibility')],
 ['child seating recognition',js.includes('Child seating')],
 ['profile recognition card',js.includes('bc-guest-profile-v246__recognition')],
 ['recognition tags',js.includes('bc-guest-profile-v246__tags')],
 ['guest list recognition',js.includes('r.repeat?r.recognition:guestStatusLabel(x)')],
 ['recognition styling',css.includes('.bc-guest-profile-v246__recognition')]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)passed++;}
console.log(`\n${passed}/${checks.length} checks passed`);if(passed!==checks.length)process.exit(1);
