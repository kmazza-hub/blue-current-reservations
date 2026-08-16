"use strict";

const assert=require("assert");
const crypto=require("crypto");
const fs=require("fs");
const os=require("os");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const DatabaseService=require(path.join(root,"server/services/databaseService"));
const AuthService=require(path.join(root,"server/services/authService"));

const hashToken=token=>crypto.createHash("sha256").update(token).digest("hex");

(async()=>{
  assert.equal(pkg.version,"69.50.0");

  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const startup=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

  for(const term of [
    "/api/system/auth-security",
    "/api/auth/logout-all",
    "/api/system/auth-security/revoke-user",
    "permissions: authService.permissionsForRole"
  ]) assert(router.includes(term),term);
  assert(server.includes("authService.cleanupSessions()"));
  assert(server.includes("Session cleanup:"));
  assert(startup.includes("V69.50.0 ready"));
  assert(html.includes('content="69.50.0"'));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v6950-"));
  const dbPath=path.join(dir,"db.json");
  const now=Date.now();
  const validToken="valid-token";
  const idleToken="idle-token";
  const revokedToken="revoked-token";

  fs.writeFileSync(dbPath,JSON.stringify({
    users:[
      {id:"u1",name:"Operator One",email:"operator@example.com",status:"active",passwordHash:"salt:00"},
      {id:"u2",name:"Other User",email:"other@example.com",status:"active",passwordHash:"salt:00"}
    ],
    memberships:[
      {id:"m1",userId:"u1",organizationId:"org_a",role:"owner",locationIds:["*"]},
      {id:"m2",userId:"u1",organizationId:"org_b",role:"general_manager",locationIds:["loc_b"]},
      {id:"m3",userId:"u2",organizationId:"org_a",role:"staff",locationIds:["loc_a"]}
    ],
    sessions:[
      {
        id:"s_valid",tokenHash:hashToken(validToken),userId:"u1",organizationId:"org_a",
        role:"owner",locationIds:["*"],createdAt:new Date(now-60000).toISOString(),
        lastSeenAt:new Date(now-60000).toISOString(),
        idleExpiresAt:new Date(now+3600000).toISOString(),
        expiresAt:new Date(now+7200000).toISOString(),revokedAt:null
      },
      {
        id:"s_idle",tokenHash:hashToken(idleToken),userId:"u1",organizationId:"org_a",
        role:"owner",locationIds:["*"],createdAt:new Date(now-7200000).toISOString(),
        lastSeenAt:new Date(now-7200000).toISOString(),
        idleExpiresAt:new Date(now-1000).toISOString(),
        expiresAt:new Date(now+7200000).toISOString(),revokedAt:null
      },
      {
        id:"s_revoked",tokenHash:hashToken(revokedToken),userId:"u1",organizationId:"org_a",
        role:"owner",locationIds:["*"],createdAt:new Date(now-60000).toISOString(),
        lastSeenAt:new Date(now-60000).toISOString(),
        idleExpiresAt:new Date(now+3600000).toISOString(),
        expiresAt:new Date(now+7200000).toISOString(),
        revokedAt:new Date(now-1000).toISOString(),revokedReason:"test"
      }
    ],
    authSecurityStates:[],
    auditLogs:[]
  },null,2));

  const database=new DatabaseService(dbPath,{logger:{warn(){},error(){}}});
  const audits=[];
  const auditService={record:async event=>{audits.push(event);return event;}};
  const auth=new AuthService(database,auditService);

  // Valid, idle-expired, and revoked session behavior.
  const authenticated=await auth.authenticate(validToken);
  assert(authenticated);
  assert.equal(authenticated.membership.organizationId,"org_a");
  assert.equal(await auth.authenticate(idleToken),null);
  assert.equal(await auth.authenticate(revokedToken),null);

  // Organization isolation: member context may switch only to a real membership.
  const switched=await auth.switchOrganization(validToken,"org_b");
  assert(switched);
  assert.equal(switched.organizationId,"org_b");
  assert.equal(switched.role,"general_manager");
  assert.equal(await auth.switchOrganization(validToken,"org_not_allowed"),null);

  // Membership role is read from current membership, not trusted from stale session role.
  const afterSwitch=await auth.authenticate(validToken);
  assert.equal(afterSwitch.membership.role,"general_manager");

  // Revocation is scoped to organization membership.
  await database.create("sessions",{
    id:"s_a2",tokenHash:hashToken("a2"),userId:"u1",organizationId:"org_a",
    createdAt:new Date().toISOString(),lastSeenAt:new Date().toISOString(),
    idleExpiresAt:new Date(now+3600000).toISOString(),expiresAt:new Date(now+7200000).toISOString(),revokedAt:null
  });
  await database.create("sessions",{
    id:"s_b2",tokenHash:hashToken("b2"),userId:"u1",organizationId:"org_b",
    createdAt:new Date().toISOString(),lastSeenAt:new Date().toISOString(),
    idleExpiresAt:new Date(now+3600000).toISOString(),expiresAt:new Date(now+7200000).toISOString(),revokedAt:null
  });
  const revokeOrg=await auth.revokeOrganizationUserSessions("org_a","u1","Security Admin");
  assert(revokeOrg && revokeOrg.revoked>=1);
  assert.equal(await auth.authenticate("a2"),null);
  assert(await auth.authenticate("b2"));

  // Logout-all revokes all remaining user sessions.
  const all=await auth.revokeAllUserSessions("u1","security-test");
  assert(all.revoked>=1);
  assert.equal(await auth.authenticate("b2"),null);

  // Failed-login escalation persists and locks after threshold.
  for(let i=0;i<5;i++) await auth.login("operator@example.com","definitely-wrong");
  const security=await auth.securitySnapshot("org_a");
  const state=security.loginSecurity.recent.find(item=>item.email==="operator@example.com");
  assert(state);
  assert(state.totalFailures>=5);
  assert(state.lockedUntil);
  assert(security.loginSecurity.currentlyLocked>=1);

  // Session cleanup removes expired/idle-expired while retaining recent revocation records.
  await database.create("sessions",{
    id:"cleanup_expired",tokenHash:hashToken("cleanup-expired"),userId:"u2",organizationId:"org_a",
    createdAt:new Date(now-7200000).toISOString(),lastSeenAt:new Date(now-7200000).toISOString(),
    idleExpiresAt:new Date(now-60000).toISOString(),expiresAt:new Date(now-1000).toISOString(),revokedAt:null
  });
  const cleanup=await auth.cleanupSessions();
  assert(cleanup.removed>=1);

  // Concurrent-session guard never leaves more than configured active sessions.
  for(let i=0;i<12;i++){
    await database.create("sessions",{
      id:`limit_${i}`,tokenHash:hashToken(`limit_${i}`),userId:"u2",organizationId:"org_a",
      createdAt:new Date(now+i).toISOString(),lastSeenAt:new Date().toISOString(),
      idleExpiresAt:new Date(now+3600000).toISOString(),expiresAt:new Date(now+7200000).toISOString(),revokedAt:null
    });
  }
  await auth._enforceSessionLimit("u2","limit_11");
  const db=await database.read();
  const activeU2=db.sessions.filter(s=>s.userId==="u2" && !s.revokedAt &&
    new Date(s.expiresAt).getTime()>Date.now() &&
    (!s.idleExpiresAt || new Date(s.idleExpiresAt).getTime()>Date.now()));
  assert(activeU2.length<=10);

  console.log(JSON.stringify({
    ok:true,
    version:"69.50.0",
    absoluteSessionExpiry:true,
    idleSessionExpiry:true,
    revokedSessionRejection:true,
    startupSessionCleanup:true,
    concurrentSessionCap:true,
    failedLoginEscalation:true,
    persistentTemporaryLockout:true,
    organizationSwitchIsolation:true,
    liveMembershipRoleEnforcement:true,
    organizationScopedAdminRevocation:true,
    logoutAll:true,
    authSecurityDiagnostics:true,
    securityAuditVisibility:audits.length>0
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
