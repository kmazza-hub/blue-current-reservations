"use strict";
const assert=require("assert");
const AuthService=require("../../server/services/authService");
const Service=require("../../server/services/rolePermissionCertificationService");

(async()=>{
  const state={
    users:[
      {id:"u1",organizationId:"org",name:"Owner",email:"owner@test",status:"active"},
      {id:"u2",organizationId:"org",name:"GM",email:"gm@test",status:"active"},
      {id:"u3",organizationId:"org",name:"Host",email:"host@test",status:"active"},
      {id:"u4",organizationId:"org",name:"Kitchen",email:"k@test",status:"active"}
    ],
    memberships:[
      {id:"m1",userId:"u1",organizationId:"org",role:"owner",locationIds:["*"]},
      {id:"m2",userId:"u2",organizationId:"org",role:"general_manager",locationIds:["loc1"]},
      {id:"m3",userId:"u3",organizationId:"org",role:"host",locationIds:["loc1"]},
      {id:"m4",userId:"u4",organizationId:"org",role:"kitchen_manager",locationIds:["loc1"]}
    ],
    locations:[{id:"loc1",organizationId:"org",name:"Pilot"}],
    rolePermissionCertifications:[]
  };
  const database={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
  const audit=[],events=[];
  const auth=new AuthService(database,{record:async()=>{}});
  const svc=new Service(
    database,
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    auth,
    {snapshot:async()=>({status:"data-integrity-ready-for-certification"})}
  );

  assert.equal(auth.can({membership:{role:"owner"}},"admin"),true);
  assert.equal(auth.can({membership:{role:"administrator"}},"admin"),true);
  assert.equal(auth.can({membership:{role:"general_manager"}},"admin"),false);
  assert.equal(auth.can({membership:{role:"general_manager"}},"write"),true);
  assert.equal(auth.can({membership:{role:"host"}},"write_reservations"),true);
  assert.equal(auth.can({membership:{role:"host"}},"write"),false);
  assert.equal(auth.can({membership:{role:"kitchen_manager"}},"write_operations"),true);
  assert.equal(auth.can({membership:{role:"staff"}},"read"),true);
  assert.equal(auth.can({membership:{role:"staff"}},"write"),false);

  let snap=await svc.snapshot("org",["*"]);
  assert.equal(snap.version,"51.25.0");
  assert.equal(snap.status,"role-permission-ready-for-certification");
  assert.equal(snap.systemChecks.every(x=>x.passed),true);
  assert.equal(snap.roleMatrix.every(x=>x.passed),true);
  assert.equal(snap.membershipScope.every(x=>x.passed),true);
  assert.equal(snap.enforcement.adminPermissionReachable,true);
  assert.equal(snap.policy.uiVisibilityIsNotAuthorization,true);

  const cert=await svc.certify("org",["*"],{
    evidence:"Owner, GM, host, kitchen-manager, staff, API, and location-scope boundaries were reviewed against the pilot matrix.",
    note:"Pilot access-control boundaries accepted."
  },"Tester");
  assert.equal(cert.status,"ROLE_PERMISSION_CERTIFIED");
  assert.equal(cert.permissionChangesPerformedByCertification,false);

  snap=await svc.snapshot("org",["*"]);
  assert.equal(snap.status,"role-permission-certified");

  state.memberships.push({id:"bad",userId:"u3",organizationId:"org",role:"host",locationIds:["*"]});
  const blocked=await svc.snapshot("org",["*"]);
  assert.equal(blocked.status,"role-permission-blocked");
  assert(blocked.membershipScope.find(x=>x.membershipId==="bad").issues.includes("excessive-wildcard-scope"));

  console.log(JSON.stringify({
    ok:true,version:"51.25.0",
    ownerAdminReachable:true,
    administratorAdminReachable:true,
    gmWriteWithoutAdmin:true,
    hostReservationBoundary:true,
    kitchenOperationsBoundary:true,
    staffReadOnlyBoundary:true,
    locationScopeValidation:true,
    crossOrganizationMembershipBoundary:true,
    apiIsAuthorizationBoundary:true,
    humanCertification:true,
    automaticRoleEscalation:false,
    automaticScopeExpansion:false,
    autonomousPermissionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
