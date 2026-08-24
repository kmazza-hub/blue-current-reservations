const fs=require('fs');
const js=fs.readFileSync('client/js/floor-reservations-v62.0.js','utf8');
const css=fs.readFileSync('client/styles.css','utf8');
const checks=[
 ['editable guest mode',js.includes('mode==="edit-guest"')],
 ['phone captured',js.includes('name="phone"')],
 ['email captured',js.includes('name="email"')],
 ['preference captured',js.includes('name="preference"')],
 ['hospitality notes captured',js.includes('name="guestNotes"')],
 ['profile updater persists',js.includes('function updateGuestProfile')&&js.includes('saveGuestRegistry(records)')],
 ['profile facts rendered',js.includes('bc-guest-profile-v245__facts')],
 ['edit action rendered',js.includes('data-guest-profile-edit')],
 ['profile styling present',css.includes('.bc-guest-profile-v245__facts')],
 ['edit styling present',css.includes('.bc-guest-edit-v245 textarea')]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)passed++;}
console.log(`\n${passed}/${checks.length} checks passed`);if(passed!==checks.length)process.exit(1);
