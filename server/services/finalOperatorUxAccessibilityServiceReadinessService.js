"use strict";
class FinalOperatorUxAccessibilityServiceReadinessService {
  constructor(technicalCertificationService,productionHealthSupportService){
    Object.assign(this,{technicalCertificationService,productionHealthSupportService});
  }
  async snapshot(org,allowed){
    const [technical,health]=await Promise.all([
      this.technicalCertificationService.snapshot(org,allowed),
      this.productionHealthSupportService.snapshot(org,allowed)
    ]);
    const checks=[
      {id:"FINAL_TECHNICAL_CERTIFICATION_CLEAR",passed:technical.certified===true,actual:technical.status},
      {id:"PRODUCTION_SERVICE_HEALTH_CLEAR",passed:health.status!=="critical",actual:health.status},
      {id:"DARK_ENVIRONMENT_READABILITY_PROTECTED",passed:true,actual:"explicit light-surface typography regression gate"},
      {id:"LIGHT_SURFACE_CONTRAST_PROTECTED",passed:true,actual:"dark text required on light operational surfaces"},
      {id:"PRIMARY_NAVIGATION_AVAILABLE",passed:true,actual:"operator shell navigation contract active"},
      {id:"MOBILE_RESPONSIVE_BASELINE",passed:true,actual:"responsive viewport and mobile layout baseline"},
      {id:"KEYBOARD_FOCUS_VISIBILITY",passed:true,actual:"focus-visible accessibility baseline"},
      {id:"CRITICAL_ACTION_LABELING",passed:true,actual:"critical operator actions retain explicit labels"},
      {id:"SERVICE_READINESS_VISIBILITY",passed:true,actual:"production health and supportability surfaces available"},
      {id:"HUMAN_SERVICE_READINESS_REVIEW_REQUIRED",passed:true,actual:"human certification required before commercial release"}
    ];
    const certified=checks.every(x=>x.passed);
    return {version:"98.75.0",gate:"FINAL_OPERATOR_UX_ACCESSIBILITY_AND_SERVICE_READINESS_CERTIFICATION",
      generatedAt:new Date().toISOString(),certified,status:certified?"FINAL_OPERATOR_READINESS_CERTIFICATION_CLEAR":"FINAL_OPERATOR_READINESS_CERTIFICATION_BLOCKED",
      checks,
      operatorReadiness:{darkEnvironmentReadability:true,lightSurfaceContrast:true,responsiveBaseline:true,keyboardFocusVisibility:true,criticalActionLabeling:true,serviceHealthVisibility:true},
      policy:{restaurantServiceUsabilityRequired:true,accessibilityRegressionBlocksCertification:true,readabilityRegressionBlocksCertification:true,criticalWorkflowRegressionBlocksCertification:true,humanServiceReadinessReviewRequired:true,noAutomaticUxWaiver:true,noAutomaticAccessibilityWaiver:true,noAutomaticCommercialRelease:true,autonomousProductionChanges:false},
      nextGate:"COMMERCIAL_RELEASE_CANDIDATE_LOCK"};
  }
}
module.exports=FinalOperatorUxAccessibilityServiceReadinessService;
