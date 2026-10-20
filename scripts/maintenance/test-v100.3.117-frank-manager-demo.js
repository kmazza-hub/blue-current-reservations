"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const AuthService = require("../../server/services/authService"), DatabaseService = require("../../server/services/databaseService"), AuditService = require("../../server/services/auditService");
const root = path.resolve(__dirname, "../.."), dir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-frank-demo-")), file = path.join(dir, "fictional.json");
fs.copyFileSync(path.join(root,"database/seed/seed.json"),file);
(async () => {
 try {
  const database = new DatabaseService(file), auth = new AuthService(database, new AuditService(database));
  const before = await database.read(), original = before.users.find(u => u.id === "usr_sarah");
  const login = await auth.login(" Frank@BlueCurrent.demo ","Manager23!");
  assert(login); assert.equal(login.user.name,"Frank Koch"); assert.equal(login.user.email,"frank@bluecurrent.demo");
  assert.equal(login.user.id,original.id); assert.equal(login.role,"general_manager");
  const legacy = await auth.login("sarah@bluecurrent.demo","Manager23!");
  assert(legacy); assert.deepEqual(legacy.locationIds,login.locationIds); assert.equal(legacy.user.name,"Frank Koch");
  const restored = await auth.authenticate(login.token); assert.equal(restored.user.name,"Frank Koch");
  assert.equal(auth.can(restored,"admin"),false); assert.equal(auth.can(restored,"switch_org"),false);
  assert.equal(await auth.login("frank@bluecurrent.demo","incorrect-fictional-password"),null);
  assert.equal(await auth.login("frank@bluecurrent.demo","Manager23!","org_blueharbor"),null);
  const after = await database.read(); assert.deepEqual(after.users,before.users); assert.deepEqual(after.memberships,before.memberships);
  assert(after.authSecurityStates.some(s=>s.id==="auth_sarah@bluecurrent.demo"));
  assert(!after.authSecurityStates.some(s=>s.id==="auth_frank@bluecurrent.demo"));
  for(const other of [{...original,id:"different"},{...original,organizationId:"other"},{...original,email:"real@example.com"}]) {
   assert.equal(auth.isMeetingDemoUser(other),false); assert.equal(auth.publicUser(other).name,other.name);
  }
  const owner = await auth.login("keith@bluecurrent.demo","BlueCurrent23!"); assert.equal(owner.user.name,"Keith Mazza");
  await auth.logout(login.token); assert.equal(await auth.authenticate(login.token),null);
  await auth.logout(legacy.token); await auth.logout(owner.token);
  for(let i=0;i<5;i++) await auth.login(i%2 ? "sarah@bluecurrent.demo" : "frank@bluecurrent.demo","incorrect-fictional-password");
  assert.equal(await auth.login("frank@bluecurrent.demo","Manager23!"),null);
  assert.equal(await auth.login("sarah@bluecurrent.demo","Manager23!"),null);
  await auth._clearFailedLogin("sarah@bluecurrent.demo");
  // The alias cannot bind a similarly named user outside the exact demo identity.
  await database.mutate(db=>{db.users.find(u=>u.id==="usr_sarah").id="different";return db;});
  assert.equal(await auth.login("frank@bluecurrent.demo","Manager23!"),null);
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8"),js=fs.readFileSync(path.join(root,"client/js/modules/authOrganizations.js"),"utf8");
  assert(html.includes("Load Frank Koch demo") && html.includes("Fictional manager"));
  assert(js.includes('$("authEmail").value = "frank@bluecurrent.demo"'));
  console.log("V100.3.117 Frank manager demo passed: alias, display name, unchanged credentials/scope/storage, restore, lockout identity, tenant denial, logout, owner access.");
 } finally { fs.rmSync(dir,{recursive:true,force:true}); }
})().catch(error=>{console.error(error);process.exitCode=1;});
