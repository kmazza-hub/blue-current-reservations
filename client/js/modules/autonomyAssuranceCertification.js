(() => {
  "use strict";

  const OUTCOME_KEY = "blueCurrent.autonomyOutcomeVerifier.v34.1.4";
  const ROLLOUT_KEY = "blueCurrent.autonomyRolloutManager.v34.1.6";
  const INCIDENT_KEY = "blueCurrent.autonomyIncidentResponseCenter.v34.1.8";
  const RECOVERY_KEY = "blueCurrent.autonomyRecoveryRequalification.v34.1.9";
  const GOVERNOR_KEY = "blueCurrent.autonomyPerformanceGovernor.v34.1.5";
  const GUARDRAIL_KEY = "blueCurrent.aiBrainAutonomyGuardrails.v34.1.3";
  const STORAGE_KEY = "blueCurrent.autonomyAssuranceCertification.v34.1.10";
  const byId = id => document.getElementById(id);

  const DOMAINS = [
    {id:"kitchen",label:"Kitchen",source:"kitchenExpoCommand"},
    {id:"staffing",label:"Staffing",source:"workforceFoundation"},
    {id:"floor",label:"Floor",source:"liveFloorOperationsV2"},
    {id:"demand",label:"Demand",source:"domainForecastingCenter"},
    {id:"recovery",label:"Executive recovery",source:"executiveAccountabilityCenter"}
  ];

  const state = {
    certificates:[],
    history:[],
    selectedDomain:null
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.certificates = Array.isArray(stored.certificates) ? stored.certificates : [];
    state.history = Array.isArray(stored.history) ? stored.history : [];
    state.selectedDomain = stored.selectedDomain || null;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      certificates:state.certificates,
      history:state.history.slice(-100),
      selectedDomain:state.selectedDomain,
      updatedAt:new Date().toISOString()
    }));
  }

  function addHistory(action,detail) {
    state.history.push({
      id:`assurance_event_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      action,
      detail,
      createdAt:new Date().toISOString()
    });
  }

  function domainText(item) {
    return `${item.title || ""} ${item.note || ""} ${item.detail || ""}`.toLowerCase();
  }

  function domainEvidence(domain) {
    const outcomes = Array.isArray(read(OUTCOME_KEY).history) ? read(OUTCOME_KEY).history : [];
    const rollouts = Array.isArray(read(ROLLOUT_KEY).rollouts) ? read(ROLLOUT_KEY).rollouts : [];
    const incidents = Array.isArray(read(INCIDENT_KEY).incidents) ? read(INCIDENT_KEY).incidents : [];
    const recoveryPlans = Array.isArray(read(RECOVERY_KEY).plans) ? read(RECOVERY_KEY).plans : [];
    const governor = read(GOVERNOR_KEY);

    const key = domain.label.toLowerCase();
    const matches = item => {
      const text = domainText(item);
      if (key === "executive recovery") return /recovery|commitment|accountability|overdue/.test(text);
      return text.includes(key);
    };

    const domainOutcomes = outcomes.filter(matches);
    const successful = domainOutcomes.filter(item => item.classification === "successful");
    const underperformed = domainOutcomes.filter(item => item.classification === "underperformed");
    const expected = domainOutcomes.reduce((sum,item) => sum+Number(item.expectedValue || 0),0);
    const observed = domainOutcomes.reduce((sum,item) => sum+Number(item.observedValue || 0),0);
    const valueDelivery = expected ? Math.round(observed/expected*100) : 0;

    const domainRollouts = rollouts.filter(item => String(item.domain || "").toLowerCase() === key);
    const activeRollout = domainRollouts.some(item => ["pilot","promoted"].includes(item.status));
    const fullRollout = domainRollouts.some(item => item.status === "promoted" || Number(item.exposure || 0) >= 100);

    const domainIncidents = incidents.filter(item => String(item.domain || "").toLowerCase() === key);
    const openIncidents = domainIncidents.filter(item => ["open","contained"].includes(item.status));
    const resolvedIncidents = domainIncidents.filter(item => item.status === "resolved");

    const plans = recoveryPlans.filter(item => String(item.domain || "").toLowerCase() === key);
    const activeRecovery = plans.some(item => ["active","failed"].includes(item.status));
    const reinstated = plans.some(item => item.status === "reinstated");

    const emergencyStop = Boolean(governor.emergencyStop);
    const suspendedDomains = Array.isArray(governor.suspendedDomains) ? governor.suspendedDomains : [];
    const governorAllows = !emergencyStop && !suspendedDomains.includes(domain.label);

    const successRate = domainOutcomes.length
      ? Math.round(successful.length/domainOutcomes.length*100)
      : 0;

    const gates = [
      {
        title:"Verified outcome evidence",
        detail:`${domainOutcomes.length} verified outcomes; minimum 3 required.`,
        passed:domainOutcomes.length >= 3
      },
      {
        title:"Outcome quality",
        detail:`${successRate}% successful outcomes; minimum 80% required.`,
        passed:successRate >= 80
      },
      {
        title:"Value delivery",
        detail:`${valueDelivery}% observed versus expected value; minimum 85% required.`,
        passed:valueDelivery >= 85
      },
      {
        title:"Controlled rollout",
        detail:activeRollout ? "Active rollout plan is present." : "No active rollout plan.",
        passed:activeRollout
      },
      {
        title:"Incident posture",
        detail:openIncidents.length ? `${openIncidents.length} active incident(s).` : "No active incidents.",
        passed:openIncidents.length === 0
      },
      {
        title:"Recovery readiness",
        detail:activeRecovery ? "Domain remains in recovery." : resolvedIncidents.length && !reinstated ? "Resolved incident lacks reinstatement evidence." : "Recovery controls satisfied.",
        passed:!activeRecovery && (!resolvedIncidents.length || reinstated)
      },
      {
        title:"Governor authorization",
        detail:governorAllows ? "Governor allows domain operation." : "Governor suspension or emergency stop is active.",
        passed:governorAllows
      },
      {
        title:"Audit continuity",
        detail:`${domainIncidents.length + plans.length + domainRollouts.length} governance records available.`,
        passed:(domainIncidents.length + plans.length + domainRollouts.length) >= 1
      }
    ];

    const passed = gates.filter(gate => gate.passed).length;
    const evidenceScore = Math.round(
      Math.min(100,domainOutcomes.length*12) * .4 +
      Math.min(100,successRate) * .35 +
      Math.min(100,valueDelivery) * .25
    );
    const controlScore = Math.round(passed/gates.length*100);

    let assessedStatus = "not-certified";
    if (passed === gates.length && evidenceScore >= 80 && controlScore >= 90) {
      assessedStatus = "certified";
    } else if (passed >= 6 && evidenceScore >= 65 && controlScore >= 70) {
      assessedStatus = "conditional";
    }

    const certificate = state.certificates.find(item => item.domain === domain.label);
    const currentStatus = certificate?.status === "revoked"
      ? "not-certified"
      : certificate?.status || assessedStatus;

    return {
      domain,
      outcomes:domainOutcomes,
      successRate,
      valueDelivery,
      activeRollout,
      fullRollout,
      openIncidents,
      resolvedIncidents,
      activeRecovery,
      reinstated,
      governorAllows,
      gates,
      passed,
      evidenceScore,
      controlScore,
      assessedStatus,
      currentStatus,
      certificate
    };
  }

  function selectedAssessment() {
    const domain = DOMAINS.find(item => item.label === state.selectedDomain);
    return domain ? domainEvidence(domain) : null;
  }

  function statusLabel(status) {
    return status === "certified" ? "Certified" :
      status === "conditional" ? "Conditional" : "Not certified";
  }

  function renderDomains() {
    const root = byId("autonomyAssuranceDomainList");
    root.replaceChildren();

    DOMAINS.forEach((domain,index) => {
      const result = domainEvidence(domain);
      const card = document.createElement("article");
      card.className = "autonomy-assurance-domain-item";
      card.dataset.status = result.currentStatus;
      card.classList.toggle("is-selected",domain.label === state.selectedDomain);
      card.innerHTML =
        "<span class='autonomy-assurance-rank'></span>" +
        "<div class='autonomy-assurance-copy'><strong></strong><span></span></div>" +
        "<span class='autonomy-assurance-badge'></span>";

      card.querySelector(".autonomy-assurance-rank").textContent = String(index+1);
      card.querySelector(".autonomy-assurance-copy strong").textContent = domain.label;
      card.querySelector(".autonomy-assurance-copy span").textContent =
        `${result.passed}/${result.gates.length} gates · ${result.evidenceScore} evidence · ${result.controlScore} controls`;
      card.querySelector(".autonomy-assurance-badge").textContent = statusLabel(result.currentStatus);

      card.addEventListener("click",() => {
        state.selectedDomain = domain.label;
        save();
        render();
      });

      root.append(card);
    });
  }

  function renderInspector() {
    const result = selectedAssessment();
    const issue = byId("autonomyAssuranceIssue");
    const revoke = byId("autonomyAssuranceRevoke");
    const open = byId("autonomyAssuranceOpenSource");
    const apply = byId("autonomyAssuranceApplyPolicy");

    [issue,revoke,open,apply].forEach(button => button.disabled = !result);

    if (!result) {
      byId("autonomyAssuranceSelectedTitle").textContent = "Choose a domain";
      byId("autonomyAssuranceSelectedDetail").textContent =
        "Select a domain to review its assurance gates, current certification status, and required corrective actions.";
      return;
    }

    const validThrough = result.certificate?.validThrough
      ? new Date(result.certificate.validThrough).toLocaleDateString()
      : "Not issued";

    byId("autonomyAssuranceSelectedTitle").textContent =
      `${result.domain.label} autonomy`;
    byId("autonomyAssuranceSelectedDetail").textContent =
      `${result.domain.label} currently meets ${result.passed} of ${result.gates.length} certification gates with ${result.evidenceScore}% evidence quality and ${result.controlScore}% control coverage.`;
    byId("autonomyAssuranceSelectedStatus").textContent =
      statusLabel(result.currentStatus);
    byId("autonomyAssuranceSelectedEvidence").textContent =
      `${result.evidenceScore}%`;
    byId("autonomyAssuranceSelectedControl").textContent =
      `${result.controlScore}%`;
    byId("autonomyAssuranceSelectedExpiry").textContent = validThrough;

    issue.disabled = !["certified","conditional"].includes(result.assessedStatus);
    revoke.disabled = !result.certificate || result.certificate.status === "revoked";
  }

  function renderGates() {
    const root = byId("autonomyAssuranceGateList");
    root.replaceChildren();
    const result = selectedAssessment();

    if (!result) {
      const empty = document.createElement("div");
      empty.className = "autonomy-assurance-empty";
      empty.textContent = "Select a domain to review certification gates.";
      root.append(empty);
      byId("autonomyAssuranceGateCount").textContent = "0 gates";
      return;
    }

    result.gates.forEach((gate,index) => {
      const item = document.createElement("article");
      item.className = "autonomy-assurance-gate-item";
      item.innerHTML = "<b></b><div><strong></strong><span></span></div><em></em>";
      item.querySelector("b").textContent = String(index+1);
      item.querySelector("strong").textContent = gate.title;
      item.querySelector("span").textContent = gate.detail;
      item.querySelector("em").textContent = gate.passed ? "passed" : "open";
      root.append(item);
    });

    byId("autonomyAssuranceGateCount").textContent =
      `${result.gates.length} gates`;
  }

  function renderReport() {
    const result = selectedAssessment();
    if (!result) {
      byId("autonomyAssuranceReportTitle").textContent =
        "No certification selected";
      byId("autonomyAssuranceReportDetail").textContent =
        "Select a domain to generate a certification summary and corrective-action report.";
      return;
    }

    const openGates = result.gates.filter(gate => !gate.passed);
    byId("autonomyAssuranceReportTitle").textContent =
      `${result.domain.label}: ${statusLabel(result.currentStatus)}`;
    byId("autonomyAssuranceReportDetail").textContent =
      openGates.length
        ? `${openGates.length} certification requirement${openGates.length === 1 ? "" : "s"} remain open: ${openGates.map(gate => gate.title).join(", ")}.`
        : `All certification gates are satisfied. ${result.domain.label} is eligible for bounded autonomy subject to its current certificate validity period.`;
  }

  function issueCertification() {
    const result = selectedAssessment();
    if (!result || !["certified","conditional"].includes(result.assessedStatus)) return;

    const existing = state.certificates.find(item => item.domain === result.domain.label);
    const issuedAt = new Date();
    const days = result.assessedStatus === "certified" ? 90 : 30;
    const validThrough = new Date(issuedAt.getTime()+days*86400000);

    const certificate = {
      id:existing?.id || `certificate_${Date.now()}`,
      domain:result.domain.label,
      status:result.assessedStatus,
      evidenceScore:result.evidenceScore,
      controlScore:result.controlScore,
      issuedAt:issuedAt.toISOString(),
      validThrough:validThrough.toISOString(),
      revokedAt:null
    };

    if (existing) Object.assign(existing,certificate);
    else state.certificates.push(certificate);

    addHistory(
      "Certification issued",
      `${result.domain.label}: ${statusLabel(certificate.status)} through ${validThrough.toLocaleDateString()}.`
    );
    save();
    render();
    byId("autonomyAssuranceStatus").textContent =
      `${result.domain.label} certification issued.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-certification-issued", {
      detail:{certificate}
    }));
  }

  function revokeCertification() {
    const result = selectedAssessment();
    if (!result?.certificate) return;

    result.certificate.status = "revoked";
    result.certificate.revokedAt = new Date().toISOString();

    addHistory(
      "Certification revoked",
      `${result.domain.label} autonomy certification was revoked.`
    );
    save();
    render();
    byId("autonomyAssuranceStatus").textContent =
      `${result.domain.label} certification revoked.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-certification-revoked", {
      detail:{certificate:result.certificate}
    }));
  }

  function applyPolicy() {
    const result = selectedAssessment();
    if (!result) return;

    const guardrails = read(GUARDRAIL_KEY);
    const policy = {
      ...(guardrails.policy || {}),
      mode:result.currentStatus === "certified" ? "bounded" : "supervised",
      minConfidence:result.currentStatus === "certified" ? 85 : 92,
      maxValue:result.currentStatus === "certified" ? 750 : 350
    };

    localStorage.setItem(GUARDRAIL_KEY,JSON.stringify({
      ...guardrails,
      policy,
      updatedAt:new Date().toISOString()
    }));

    addHistory(
      "Certification policy applied",
      `${result.domain.label}: ${policy.mode} mode · ${policy.minConfidence}% confidence · $${policy.maxValue} maximum value.`
    );
    save();
    renderHistory();
    byId("autonomyAssuranceStatus").textContent =
      "Certification-aligned guardrail policy applied.";

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-certification-policy-applied", {
      detail:{domain:result.domain.label,policy}
    }));
  }

  function renderKPIs() {
    const assessments = DOMAINS.map(domain => domainEvidence(domain));
    const certified = assessments.filter(item => item.currentStatus === "certified");
    const conditional = assessments.filter(item => item.currentStatus === "conditional");
    const failed = assessments.filter(item => item.currentStatus === "not-certified");
    const expiring = state.certificates.filter(item =>
      item.status !== "revoked" &&
      new Date(item.validThrough).getTime()-Date.now() <= 14*86400000 &&
      new Date(item.validThrough).getTime() > Date.now()
    );
    const auditCoverage = Math.round(
      assessments.reduce((sum,item) => sum+item.controlScore,0)/assessments.length
    );
    const assuranceScore = Math.round(
      assessments.reduce((sum,item) => sum+(item.evidenceScore+item.controlScore)/2,0) /
      assessments.length
    );

    byId("autonomyAssuranceCertifiedCount").textContent = String(certified.length);
    byId("autonomyAssuranceConditionalCount").textContent = String(conditional.length);
    byId("autonomyAssuranceFailedCount").textContent = String(failed.length);
    byId("autonomyAssuranceExpiringCount").textContent = String(expiring.length);
    byId("autonomyAssuranceAuditCoverage").textContent = `${auditCoverage}%`;
    byId("autonomyAssuranceScore").textContent = String(assuranceScore);
    byId("autonomyAssuranceLabel").textContent =
      assuranceScore >= 85 ? "Strong assurance posture" :
      assuranceScore >= 65 ? "Conditional assurance" :
      "Certification gaps remain";
    byId("autonomyAssuranceScoreCard").dataset.tone =
      assuranceScore >= 85 ? "stable" :
      assuranceScore >= 65 ? "watch" : "risk";
  }

  function renderHistory() {
    const root = byId("autonomyAssuranceHistoryList");
    root.replaceChildren();

    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-assurance-empty";
      empty.textContent = "Certification activity will appear here.";
      root.append(empty);
      return;
    }

    state.history.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "autonomy-assurance-history-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent = entry.action;
      item.querySelector("span").textContent = entry.detail;
      item.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {
          hour:"numeric",
          minute:"2-digit"
        });
      root.append(item);
    });
  }

  function copyReport() {
    const result = selectedAssessment();
    if (!result) {
      byId("autonomyAssuranceStatus").textContent = "Select a domain first.";
      return;
    }

    const text = [
      "Blue Current Autonomy Assurance Report",
      `Domain: ${result.domain.label}`,
      `Status: ${statusLabel(result.currentStatus)}`,
      `Evidence score: ${result.evidenceScore}%`,
      `Control score: ${result.controlScore}%`,
      `Passed gates: ${result.passed}/${result.gates.length}`,
      "",
      ...result.gates.map((gate,index) =>
        `${index+1}. ${gate.title} — ${gate.passed ? "PASSED" : "OPEN"}: ${gate.detail}`
      )
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      byId("autonomyAssuranceStatus").textContent = "Assurance report copied.";
    }).catch(() => {
      byId("autonomyAssuranceStatus").textContent =
        "Copy unavailable in this browser.";
    });
  }

  function render() {
    renderKPIs();
    renderDomains();
    renderInspector();
    renderGates();
    renderReport();
    renderHistory();
    byId("autonomyAssuranceUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{
        hour:"numeric",
        minute:"2-digit"
      }).format(new Date())}.`;
  }

  function init() {
    if (!byId("autonomyAssuranceCertification")) return;

    load();
    byId("autonomyAssuranceRefresh")?.addEventListener("click",render);
    byId("autonomyAssuranceIssue")?.addEventListener("click",issueCertification);
    byId("autonomyAssuranceRevoke")?.addEventListener("click",revokeCertification);
    byId("autonomyAssuranceOpenSource")?.addEventListener("click",() => {
      const result = selectedAssessment();
      byId(result?.domain.source)?.scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
    });
    byId("autonomyAssuranceCopyReport")?.addEventListener("click",copyReport);
    byId("autonomyAssuranceApplyPolicy")?.addEventListener("click",applyPolicy);
    byId("autonomyAssuranceClearHistory")?.addEventListener("click",() => {
      state.history = [];
      save();
      renderHistory();
    });

    [
      "bluecurrent:autonomy-outcome-verified",
      "bluecurrent:autonomy-rollout-created",
      "bluecurrent:autonomy-rollout-promoted",
      "bluecurrent:autonomy-rollout-rolled-back",
      "bluecurrent:autonomy-incident-contained",
      "bluecurrent:autonomy-incident-resolved",
      "bluecurrent:autonomy-reinstated",
      "bluecurrent:autonomy-recovery-learning-applied",
      "bluecurrent:autonomy-governor-policy-applied"
    ].forEach(name => window.addEventListener(name,render));

    window.addEventListener("storage",event => {
      if ([
        OUTCOME_KEY,ROLLOUT_KEY,INCIDENT_KEY,RECOVERY_KEY,
        GOVERNOR_KEY,GUARDRAIL_KEY,STORAGE_KEY
      ].includes(event.key)) {
        load();
        render();
      }
    });

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();