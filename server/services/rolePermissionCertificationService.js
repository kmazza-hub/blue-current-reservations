"use strict";

class RolePermissionCertificationService {
  constructor(database,auditService,realtimeHub,authService,dataIntegrityRecoveryService){
    Object.assign(this,{database,auditService,realtimeHub,authService,dataIntegrityRecoveryService});
    this.roleExpectations={
      owner:{
        label:"Owner / Executive",
        permissions:["read","write","admin","write_operations","write_reservations","invite","switch_org","manage_users","manage_settings"],
        denied:[],
        uiProfile:"executive",
        scope:"portfolio"
      },
      administrator:{
        label:"Administrator",
        permissions:["read","write","admin","write_operations","write_reservations","invite","manage_users","manage_settings"],
        denied:["switch_org"],
        uiProfile:"technical",
        scope:"membership"
      },
      general_manager:{
        label:"General Manager",
        permissions:["read","write","write_operations","write_reservations","invite"],
        denied:["admin","switch_org","manage_users","manage_settings"],
        uiProfile:"manager",
        scope:"assigned-locations"
      },
      host:{
        label:"Host / Reservation Operator",
        permissions:["read","write_reservations"],
        denied:["write","admin","write_operations","invite","switch_org","manage_users","manage_settings"],
        uiProfile:"manager",
        scope:"assigned-locations"
      },
      kitchen_manager:{
        label:"Kitchen Manager",
        permissions:["read","write_operations"],
        denied:["write","admin","write_reservations","invite","switch_org","manage_users","manage_settings"],
        uiProfile:"manager",
        scope:"assigned-locations"
      },
      staff:{
        label:"Staff",
        permissions:["read"],
        denied:["write","admin","write_operations","write_reservations","invite","switch_org","manage_users","manage_settings"],
        uiProfile:"manager",
        scope:"assigned-locations"
      }
    };
  }
  now(){return new Date().toISOString();}
  async certifications(organizationId){
    const db=await this.database.read();
    return (db.rolePermissionCertifications||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  fakeAuth(role){return {membership:{role}};}
  roleCheck(role){
    const expected=this.roleExpectations[role];
    const actual=this.authService.permissionsForRole(role);
    const required=(expected?.permissions||[]).map(permission=>({permission,expected:"ALLOW",actual:this.authService.can(this.fakeAuth(role),permission)?"ALLOW":"DENY"}));
    const denied=(expected?.denied||[]).map(permission=>({permission,expected:"DENY",actual:this.authService.can(this.fakeAuth(role),permission)?"ALLOW":"DENY"}));
    const checks=[...required,...denied];
    return {
      role,label:expected?.label||role,
      uiProfile:expected?.uiProfile||"manager",scope:expected?.scope||"assigned-locations",
      actualPermissions:actual,
      checks,
      passed:checks.every(x=>x.expected===x.actual),
      mismatches:checks.filter(x=>x.expected!==x.actual)
    };
  }
  membershipCheck(db,organizationId){
    const memberships=(db.memberships||[]).filter(x=>x.organizationId===organizationId);
    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId);
    const locationIds=new Set(locations.map(x=>x.id));
    return memberships.map(m=>{
      const scopes=Array.isArray(m.locationIds)?m.locationIds:[];
      const unknown=scopes.filter(x=>x!=="*"&&!locationIds.has(x));
      const wildcard=scopes.includes("*");
      const role=this.roleExpectations[m.role]||null;
      const issues=[];
      if(!role)issues.push("unknown-role");
      if(!scopes.length)issues.push("no-location-scope");
      if(unknown.length)issues.push(`unknown-location:${unknown.join(",")}`);
      if(wildcard&&m.role!=="owner"&&m.role!=="administrator")issues.push("excessive-wildcard-scope");
      return {membershipId:m.id,userId:m.userId,role:m.role,locationIds:scopes,wildcard,unknownLocationIds:unknown,passed:issues.length===0,issues};
    });
  }
  crossOrgCheck(db){
    const byUser=new Map();
    for(const m of db.memberships||[]){
      if(!byUser.has(m.userId))byUser.set(m.userId,[]);
      byUser.get(m.userId).push(m);
    }
    return [...byUser.entries()].map(([userId,memberships])=>({
      userId,
      organizationCount:new Set(memberships.map(x=>x.organizationId)).size,
      organizations:memberships.map(x=>({organizationId:x.organizationId,role:x.role,locationIds:x.locationIds})),
      switchRequiresMembership:true,
      passed:memberships.every(x=>!!x.organizationId&&Array.isArray(x.locationIds))
    }));
  }
  async snapshot(organizationId,allowedLocationIds){
    const [db,integrity,certs]=await Promise.all([
      this.database.read(),
      this.dataIntegrityRecoveryService.snapshot(organizationId,allowedLocationIds),
      this.certifications(organizationId)
    ]);
    const roleMatrix=Object.keys(this.roleExpectations).map(role=>this.roleCheck(role));
    const membershipScope=this.membershipCheck(db,organizationId);
    const crossOrganization=this.crossOrgCheck(db);
    const activeUsers=(db.users||[]).filter(x=>x.status==="active");
    const organizationMemberships=(db.memberships||[]).filter(x=>x.organizationId===organizationId);
    const userIds=new Set(activeUsers.map(x=>x.id));
    const orphanMemberships=organizationMemberships.filter(x=>!userIds.has(x.userId));
    const activeCertification=certs[0]||null;

    const systemChecks=[
      {id:"role-matrix",label:"Expected role permission matrix matches AuthService",passed:roleMatrix.every(x=>x.passed),actual:`${roleMatrix.filter(x=>x.passed).length}/${roleMatrix.length} role profiles`},
      {id:"membership-scope",label:"Membership location scopes are valid and least-privilege compatible",passed:membershipScope.every(x=>x.passed),actual:`${membershipScope.filter(x=>x.passed).length}/${membershipScope.length} memberships`},
      {id:"identity-linkage",label:"Organization memberships link to active user identities",passed:orphanMemberships.length===0,actual:`${orphanMemberships.length} orphan membership(s)`},
      {id:"cross-org-isolation",label:"Organization switching remains membership-bound",passed:crossOrganization.every(x=>x.passed),actual:`${crossOrganization.length} user identity scope(s)`},
      {id:"integrity-prerequisite",label:"V51 data integrity model is ready",passed:integrity.status==="data-integrity-ready-for-certification"||integrity.status==="data-integrity-recovery-certified",actual:integrity.status}
    ];
    const passed=systemChecks.filter(x=>x.passed).length;
    return {
      version:"51.25.0",generatedAt:this.now(),
      status:systemChecks.every(x=>x.passed)?(activeCertification?.status==="ROLE_PERMISSION_CERTIFIED"?"role-permission-certified":"role-permission-ready-for-certification"):"role-permission-blocked",
      headline:`${passed}/${systemChecks.length} role/access certification gates pass for ${organizationMemberships.length} organization membership(s).`,
      systemChecks,roleMatrix,membershipScope,crossOrganization,
      certification:activeCertification,
      uiVisibilityPolicy:{
        executive:["portfolio","profitability","executive","production-certification"],
        manager:["restaurant-operations","reservations","floor","staff","kitchen","pilot-rehearsal"],
        technical:["runtime","integration","reliability","observability","certification"],
        note:"Role Experience controls presentation density/sections; API authorization remains the security boundary."
      },
      enforcement:{
        apiAuthenticationRequired:true,
        locationScopeRequired:true,
        adminPermissionReachable:this.authService.permissionsForRole("owner").includes("admin")&&this.authService.permissionsForRole("administrator").includes("admin"),
        ownerAdminPermission:true,
        administratorAdminPermission:true
      },
      policy:{
        apiIsAuthorizationBoundary:true,
        uiVisibilityIsNotAuthorization:true,
        leastPrivilegeRequired:true,
        crossLocationIsolationRequired:true,
        crossOrganizationMembershipRequired:true,
        humanCertificationRequired:true,
        automaticRoleEscalation:false,
        automaticScopeExpansion:false,
        autonomousPermissionChanges:false
      }
    };
  }
  async certify(organizationId,allowedLocationIds,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    if(!snap.systemChecks.every(x=>x.passed))throw new Error("Role and permission certification gates must all pass before certification.");
    const evidence=String(input.evidence||"").trim().slice(0,2600);
    const note=String(input.note||"").trim().slice(0,1800);
    if(!evidence)throw new Error("Human role-certification evidence is required.");
    if(!note)throw new Error("Human role-certification note is required.");
    const record={
      id:`rpc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,status:"ROLE_PERMISSION_CERTIFIED",
      certifiedAt:this.now(),certifiedBy:actor,evidence,note,
      systemCheckSnapshot:snap.systemChecks,
      roleMatrixSnapshot:snap.roleMatrix,
      membershipScopeSnapshot:snap.membershipScope,
      permissionChangesPerformedByCertification:false,
      automaticRoleEscalation:false,
      automaticScopeExpansion:false
    };
    await this.database.mutate(db=>{db.rolePermissionCertifications||=[];db.rolePermissionCertifications.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:"V51 role and permission boundaries certified for pilot",category:"pilot_access"});
    this.realtimeHub.publish("role-permission:certified",{organizationId,id:record.id,certifiedBy:actor});
    return record;
  }
}
module.exports=RolePermissionCertificationService;
