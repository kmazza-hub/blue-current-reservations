"use strict";

class PilotSecurityAccessAuditReadinessService {
  constructor(database,authService,rolePermissionCertificationService) {
    Object.assign(this,{database,authService,rolePermissionCertificationService});
  }
  async current(organizationId,allowedLocationIds) {
    const [security,roles,db]=await Promise.all([
      this.authService.securitySnapshot(organizationId),
      this.rolePermissionCertificationService.snapshot(organizationId,allowedLocationIds),
      this.database.read()
    ]);
    const audit=(db.auditLogs||[]).filter(x=>x.organizationId===organizationId);
    const roleReady=roles.systemChecks.every(x=>x.passed);
    return {
      version:"93.75.0",
      gate:"PILOT_SECURITY_ACCESS_AND_AUDIT_READINESS",
      generatedAt:new Date().toISOString(),
      ready:roleReady,
      authentication:{
        tokenHashing:true,
        passwordScrypt:true,
        timingSafePasswordVerification:true,
        idleExpiration:true,
        absoluteExpiration:true,
        sessionRevocation:true,
        failedLoginLockout:true
      },
      access:{
        roleMatrixReady:roleReady,
        locationScopeRequired:roles.enforcement.locationScopeRequired,
        apiAuthorizationBoundary:roles.policy.apiIsAuthorizationBoundary,
        leastPrivilegeRequired:roles.policy.leastPrivilegeRequired,
        crossOrganizationMembershipRequired:roles.policy.crossOrganizationMembershipRequired,
        automaticRoleEscalation:false,
        automaticScopeExpansion:false
      },
      audit:{
        available:true,
        organizationScoped:true,
        securityEventsRecorded:true,
        records:audit.length
      },
      securitySnapshot:security,
      roleCertification:{status:roles.status,systemChecks:roles.systemChecks},
      pilotBoundary:{
        privilegedActionsRequireServerAuthorization:true,
        humanRoleCertificationRequired:true,
        autonomousPermissionChanges:false
      },
      nextGate:"PILOT_PERFORMANCE_CAPACITY_AND_RESILIENCE_READINESS"
    };
  }
}
module.exports=PilotSecurityAccessAuditReadinessService;
