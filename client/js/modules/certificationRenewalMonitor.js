(() => {
  "use strict";

  const CERTIFICATION_KEY = "blueCurrent.autonomyAssuranceCertification.v34.1.10";
  const OUTCOME_KEY = "blueCurrent.autonomyOutcomeVerifier.v34.1.4";
  const INCIDENT_KEY = "blueCurrent.autonomyIncidentResponseCenter.v34.1.8";
  const RECOVERY_KEY = "blueCurrent.autonomyRecoveryRequalification.v34.1.9";
  const STORAGE_KEY = "blueCurrent.certificationRenewalMonitor.v34.1.11";
  const byId = id => document.getElementById(id);

  const state = {
    decisions:[],
    history:[],
    selectedDomain:null
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.decisions = Array.isArray(stored.decisions) ? stored.decisions : [];
    state.history = Array.isArray(stored.history) ? stored.history : [];
    state.selectedDomain = stored.selectedDomain || null;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      decisions:state.decisions,
      history:state.history.slice(-100),
      selectedDomain:state.selectedDomain,
      updatedAt:new Date().toISOString()
    }));
  }

  function addHistory(action,detail) {
    state.history.push({
      id:`renewal_event_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      action,
      detail,
      createdAt:new Date().toISOString()
    });
  }

  function certificates() {
    const stored = read(CERTIFICATION_KEY);
    return Array.isArray(stored.certificates) ? stored.certificates : [];
  }

  function domainOutcomes(domain) {
    const stored = read(OUTCOME_KEY);
    const history = Array.isArray(stored.history) ? stored.history : [];
    const key = String(domain || "").toLowerCase();

    return history.filter(item => {
      const text = `${item.title || ""} ${item.note || ""}`.toLowerCase();
      if (key === "executive recovery") {
        return /recovery|commitment|accountability|overdue/.test(text);
      }
      return text.includes(key);
    });
  }

  function domainIncidents(domain) {
    const stored = read(INCIDENT_KEY);
    const incidents = Array.isArray(stored.incidents) ? stored.incidents : [];
    return incidents.filter(item =>
      String(item.domain || "").toLowerCase() === String(domain || "").toLowerCase()
    );
  }

  function domainRecovery(domain) {
    const stored = read(RECOVERY_KEY);
    const plans = Array.isArray(stored.plans) ? stored.plans : [];
    return plans.filter(item =>
      String(item.domain || "").toLowerCase() === String(domain || "").toLowerCase()
    );
  }

  function assessment(certificate) {
    const now = Date.now();
    const validThrough = new Date(certificate.validThrough || 0).getTime();
    const daysRemaining = Math.ceil((validThrough-now)/86400000);
    const outcomes = domainOutcomes(certificate.domain);
    const recent = outcomes.filter(item =>
      new Date(item.recordedAt || 0).getTime() >= new Date(certificate.issuedAt || 0).getTime()
    );
    const successful = recent.filter(item => item.classification === "successful").length;
    const underperformed = recent.filter(item => item.classification === "underperformed").length;
    const successRate = recent.length ? Math.round(successful/recent.length*100) : 0;

    const expected = recent.reduce((sum,item) => sum+Number(item.expectedValue || 0),0);
    const observed = recent.reduce((sum,item) => sum+Number(item.observedValue || 0),0);
    const valueDelivery = expected ? Math.round(observed/expected*100) : 0;

    const incidents = domainIncidents(certificate.domain);
    const activeIncidents = incidents.filter(item => ["open","contained"].includes(item.status));
    const recoveries = domainRecovery(certificate.domain);
    const activeRecovery = recoveries.some(item => ["active","failed"].includes(item.status));

    const currentEvidence = Math.round(
      Math.min(100,recent.length*15)*.35 +
      Math.min(100,successRate)*.4 +
      Math.min(100,valueDelivery)*.25
    );
    const currentControl = Math.round(
      (activeIncidents.length ? 45 : 100)*.45 +
      (activeRecovery ? 40 : 100)*.35 +
      (recent.length ? 100 : 50)*.2
    );

    const evidenceDelta = currentEvidence-Number(certificate.evidenceScore || 0);
    const controlDelta = currentControl-Number(certificate.controlScore || 0);

    const gates = [
      {
        title:"Certificate validity",
        detail:daysRemaining >= 0 ? `${daysRemaining} days remain.` : `${Math.abs(daysRemaining)} days expired.`,
        passed:daysRemaining >= 0
      },
      {
        title:"Current outcome evidence",
        detail:`${recent.length} post-certification outcomes; minimum 2 required.`,
        passed:recent.length >= 2
      },
      {
        title:"Success performance",
        detail:`${successRate}% success rate; minimum 80% required.`,
        passed:successRate >= 80
      },
      {
        title:"Value delivery",
        detail:`${valueDelivery}% observed versus expected; minimum 85% required.`,
        passed:valueDelivery >= 85
      },
      {
        title:"Incident-free posture",
        detail:activeIncidents.length ? `${activeIncidents.length} active incident(s).` : "No active incidents.",
        passed:activeIncidents.length === 0
      },
      {
        title:"Recovery status",
        detail:activeRecovery ? "Active or failed recovery plan exists." : "No blocking recovery plan.",
        passed:!activeRecovery
      },
      {
        title:"Evidence stability",
        detail:`Evidence changed ${evidenceDelta >= 0 ? "+" : ""}${evidenceDelta} points from issue baseline.`,
        passed:evidenceDelta >= -10
      },
      {
        title:"Control stability",
        detail:`Controls changed ${controlDelta >= 0 ? "+" : ""}${controlDelta} points from issue baseline.`,
        passed:controlDelta >= -10
      }
    ];

    const passed = gates.filter(gate => gate.passed).length;
    let renewalState = "current";

    if (certificate.status === "revoked") {
      renewalState = "suspended";
    } else if (daysRemaining < 0) {
      renewalState = "expired";
    } else if (evidenceDelta < -15 || controlDelta < -15 || underperformed >= 2) {
      renewalState = "drift";
    } else if (daysRemaining <= 30) {
      renewalState = "due";
    }

    let recommendation = "Maintain current certification";
    if (renewalState === "expired" || renewalState === "suspended") {
      recommendation = "Suspend bounded execution";
    } else if (passed === gates.length && currentEvidence >= 80 && currentControl >= 85) {
      recommendation = "Approve full renewal";
    } else if (passed >= 6 && currentEvidence >= 65 && currentControl >= 70) {
      recommendation = "Issue conditional renewal";
    } else if (renewalState === "drift") {
      recommendation = "Remediate before renewal";
    }

    const priorDecision = state.decisions.find(item => item.domain === certificate.domain);
    if (priorDecision?.state === "suspended") renewalState = "suspended";

    return {
      certificate,
      outcomes:recent,
      successRate,
      valueDelivery,
      activeIncidents,
      activeRecovery,
      currentEvidence,
      currentControl,
      evidenceDelta,
      controlDelta,
      daysRemaining,
      gates,
      passed,
      renewalState,
      recommendation
    };
  }

  function assessments() {
    return certificates().map(assessment);
  }

  function selectedAssessment() {
    return assessments().find(item => item.certificate.domain === state.selectedDomain) || null;
  }

  function renderQueue() {
    const root = byId("certificationRenewalQueueList");
    root.replaceChildren();
    const items = assessments();

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "certification-renewal-empty";
      empty.textContent = "No issued certificates are available for renewal monitoring.";
      root.append(empty);
      return;
    }

    items
      .slice()
      .sort((a,b) => a.daysRemaining-b.daysRemaining)
      .forEach((item,index) => {
        const card = document.createElement("article");
        card.className = "certification-renewal-item";
        card.dataset.state = item.renewalState;
        card.classList.toggle("is-selected",item.certificate.domain === state.selectedDomain);
        card.innerHTML =
          "<span class='certification-renewal-rank'></span>" +
          "<div class='certification-renewal-copy'><strong></strong><span></span></div>" +
          "<span class='certification-renewal-badge'></span>";

        card.querySelector(".certification-renewal-rank").textContent = String(index+1);
        card.querySelector(".certification-renewal-copy strong").textContent =
          `${item.certificate.domain} certification`;
        card.querySelector(".certification-renewal-copy span").textContent =
          `${item.daysRemaining} days remaining · ${item.currentEvidence}% evidence · ${item.currentControl}% controls`;
        card.querySelector(".certification-renewal-badge").textContent =
          item.renewalState.replace("-"," ");

        card.addEventListener("click",() => {
          state.selectedDomain = item.certificate.domain;
          save();
          render();
        });
        root.append(card);
      });
  }

  function renderInspector() {
    const result = selectedAssessment();
    const controls = [
      "certificationRenewalApprove",
      "certificationRenewalConditional",
      "certificationRenewalSuspend",
      "certificationRenewalOpenCertification"
    ];
    controls.forEach(id => byId(id).disabled = !result);

    if (!result) {
      byId("certificationRenewalSelectedTitle").textContent = "Choose a certificate";
      byId("certificationRenewalSelectedDetail").textContent =
        "Select a certificate to review expiry, evidence drift, compliance gaps, and its renewal recommendation.";
      return;
    }

    byId("certificationRenewalSelectedTitle").textContent =
      `${result.certificate.domain} certification`;
    byId("certificationRenewalSelectedDetail").textContent =
      `${result.passed} of ${result.gates.length} renewal gates are satisfied. Recommendation: ${result.recommendation}.`;
    byId("certificationRenewalSelectedState").textContent =
      result.renewalState.charAt(0).toUpperCase()+result.renewalState.slice(1);
    byId("certificationRenewalSelectedDays").textContent =
      String(result.daysRemaining);
    byId("certificationRenewalSelectedEvidenceDelta").textContent =
      `${result.evidenceDelta >= 0 ? "+" : ""}${result.evidenceDelta}`;
    byId("certificationRenewalSelectedControlDelta").textContent =
      `${result.controlDelta >= 0 ? "+" : ""}${result.controlDelta}`;

    byId("certificationRenewalApprove").disabled =
      result.recommendation !== "Approve full renewal";
    byId("certificationRenewalConditional").disabled =
      !["Issue conditional renewal","Remediate before renewal"].includes(result.recommendation);
  }

  function renderGates() {
    const root = byId("certificationRenewalGateList");
    root.replaceChildren();
    const result = selectedAssessment();

    if (!result) {
      const empty = document.createElement("div");
      empty.className = "certification-renewal-empty";
      empty.textContent = "Select a certificate to review renewal gates.";
      root.append(empty);
      byId("certificationRenewalGateCount").textContent = "0 gates";
      return;
    }

    result.gates.forEach((gate,index) => {
      const item = document.createElement("article");
      item.className = "certification-renewal-gate-item";
      item.innerHTML = "<b></b><div><strong></strong><span></span></div><em></em>";
      item.querySelector("b").textContent = String(index+1);
      item.querySelector("strong").textContent = gate.title;
      item.querySelector("span").textContent = gate.detail;
      item.querySelector("em").textContent = gate.passed ? "passed" : "open";
      root.append(item);
    });

    byId("certificationRenewalGateCount").textContent =
      `${result.gates.length} gates`;
  }

  function renderBrief() {
    const result = selectedAssessment();
    if (!result) {
      byId("certificationRenewalBriefTitle").textContent = "No renewal selected";
      byId("certificationRenewalBriefDetail").textContent =
        "Select a certificate to generate its renewal recommendation and corrective-action summary.";
      return;
    }

    const openGates = result.gates.filter(gate => !gate.passed);
    byId("certificationRenewalBriefTitle").textContent =
      `${result.certificate.domain}: ${result.recommendation}`;
    byId("certificationRenewalBriefDetail").textContent =
      openGates.length
        ? `${openGates.length} renewal gate${openGates.length === 1 ? "" : "s"} remain open: ${openGates.map(gate => gate.title).join(", ")}.`
        : "All renewal gates are satisfied and no compliance drift is visible.";
  }

  function upsertDecision(domain,stateValue,detail) {
    const existing = state.decisions.find(item => item.domain === domain);
    const decision = {
      domain,
      state:stateValue,
      detail,
      updatedAt:new Date().toISOString()
    };
    if (existing) Object.assign(existing,decision);
    else state.decisions.push(decision);
  }

  function renew(days,status) {
    const result = selectedAssessment();
    if (!result) return;

    const certification = read(CERTIFICATION_KEY);
    const certificates = Array.isArray(certification.certificates)
      ? certification.certificates
      : [];
    const target = certificates.find(item => item.domain === result.certificate.domain);
    if (!target) return;

    target.status = status;
    target.issuedAt = new Date().toISOString();
    target.validThrough = new Date(Date.now()+days*86400000).toISOString();
    target.evidenceScore = result.currentEvidence;
    target.controlScore = result.currentControl;
    target.revokedAt = null;

    localStorage.setItem(CERTIFICATION_KEY,JSON.stringify({
      ...certification,
      certificates,
      updatedAt:new Date().toISOString()
    }));

    upsertDecision(target.domain,status === "certified" ? "current" : "due",
      `${status} renewal issued for ${days} days.`);
    addHistory(
      status === "certified" ? "Full renewal approved" : "Conditional renewal issued",
      `${target.domain} renewed through ${new Date(target.validThrough).toLocaleDateString()}.`
    );
    save();
    render();
    byId("certificationRenewalStatus").textContent =
      status === "certified" ? "Full renewal approved." : "Conditional renewal issued.";

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-certification-renewed", {
      detail:{certificate:target}
    }));
  }

  function suspend() {
    const result = selectedAssessment();
    if (!result) return;

    upsertDecision(
      result.certificate.domain,
      "suspended",
      "Certificate suspended by continuous compliance monitoring."
    );
    addHistory(
      "Certificate suspended",
      `${result.certificate.domain} bounded execution was suspended.`
    );
    save();
    render();
    byId("certificationRenewalStatus").textContent =
      "Certificate suspended and bounded execution restricted.";

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-certificate-suspended", {
      detail:{domain:result.certificate.domain}
    }));
  }

  function renderKPIs() {
    const items = assessments();
    const current = items.filter(item => item.renewalState === "current");
    const due = items.filter(item => item.renewalState === "due");
    const expired = items.filter(item => item.renewalState === "expired");
    const drift = items.filter(item => item.renewalState === "drift");
    const coverage = items.length
      ? Math.round(items.reduce((sum,item) => sum+item.passed/item.gates.length*100,0)/items.length)
      : 0;
    const score = items.length
      ? Math.max(0,Math.min(100,coverage-due.length*4-expired.length*15-drift.length*10))
      : 0;

    byId("certificationRenewalCurrentCount").textContent = String(current.length);
    byId("certificationRenewalDueCount").textContent = String(due.length);
    byId("certificationRenewalExpiredCount").textContent = String(expired.length);
    byId("certificationRenewalDriftCount").textContent = String(drift.length);
    byId("certificationRenewalCoverage").textContent = `${coverage}%`;
    byId("certificationRenewalScore").textContent = String(score);
    byId("certificationRenewalLabel").textContent =
      score >= 85 ? "Continuous compliance healthy" :
      score >= 65 ? "Renewal attention required" :
      items.length ? "Certification risk detected" : "Awaiting certificates";
    byId("certificationRenewalScoreCard").dataset.tone =
      score >= 85 ? "stable" : score >= 65 ? "watch" : "risk";
  }

  function renderHistory() {
    const root = byId("certificationRenewalHistoryList");
    root.replaceChildren();

    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "certification-renewal-empty";
      empty.textContent = "Renewal and compliance activity will appear here.";
      root.append(empty);
      return;
    }

    state.history.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "certification-renewal-history-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent = entry.action;
      item.querySelector("span").textContent = entry.detail;
      item.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
      root.append(item);
    });
  }

  function copyBrief() {
    const result = selectedAssessment();
    if (!result) {
      byId("certificationRenewalStatus").textContent = "Select a certificate first.";
      return;
    }

    const text = [
      "Blue Current Certification Renewal & Compliance Brief",
      `Domain: ${result.certificate.domain}`,
      `Renewal state: ${result.renewalState}`,
      `Days remaining: ${result.daysRemaining}`,
      `Current evidence: ${result.currentEvidence}% (${result.evidenceDelta >= 0 ? "+" : ""}${result.evidenceDelta})`,
      `Current controls: ${result.currentControl}% (${result.controlDelta >= 0 ? "+" : ""}${result.controlDelta})`,
      `Recommendation: ${result.recommendation}`,
      "",
      ...result.gates.map((gate,index) =>
        `${index+1}. ${gate.title} — ${gate.passed ? "PASSED" : "OPEN"}: ${gate.detail}`
      )
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      byId("certificationRenewalStatus").textContent = "Compliance brief copied.";
    }).catch(() => {
      byId("certificationRenewalStatus").textContent = "Copy unavailable in this browser.";
    });
  }

  function render() {
    renderKPIs();
    renderQueue();
    renderInspector();
    renderGates();
    renderBrief();
    renderHistory();
    byId("certificationRenewalUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
  }

  function init() {
    if (!byId("certificationRenewalMonitor")) return;

    load();
    byId("certificationRenewalRefresh")?.addEventListener("click",render);
    byId("certificationRenewalApprove")?.addEventListener("click",() => renew(90,"certified"));
    byId("certificationRenewalConditional")?.addEventListener("click",() => renew(30,"conditional"));
    byId("certificationRenewalSuspend")?.addEventListener("click",suspend);
    byId("certificationRenewalCopyBrief")?.addEventListener("click",copyBrief);
    byId("certificationRenewalOpenCertification")?.addEventListener("click",() => {
      byId("autonomyAssuranceCertification")?.scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
    });
    byId("certificationRenewalClearHistory")?.addEventListener("click",() => {
      state.history = [];
      save();
      renderHistory();
    });

    [
      "bluecurrent:autonomy-certification-issued",
      "bluecurrent:autonomy-certification-revoked",
      "bluecurrent:autonomy-outcome-verified",
      "bluecurrent:autonomy-incident-contained",
      "bluecurrent:autonomy-incident-resolved",
      "bluecurrent:autonomy-reinstated"
    ].forEach(name => window.addEventListener(name,render));

    window.addEventListener("storage",event => {
      if ([CERTIFICATION_KEY,OUTCOME_KEY,INCIDENT_KEY,RECOVERY_KEY,STORAGE_KEY].includes(event.key)) {
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