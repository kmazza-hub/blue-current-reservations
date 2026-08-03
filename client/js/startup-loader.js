(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const fullStartup = params.get("full") === "1";
  const requestedPacks = new Set((params.get("pack") || "").split(",").map(v => v.trim()).filter(Boolean));
  const appSource = `js/app-v15.1.3.js?v=37.23.0`;
  const deferred = [...document.querySelectorAll('script[type="text/bluecurrent-deferred"][data-src]')];
  const startedAt = performance.now();
  const storageKey = "bluecurrent:last-good-startup";
  const failureKey = "bluecurrent:startup-failures";

  const PACK_RULES = {
    operations: /(reservationYield|kitchenThroughput|guestRecovery|laborDeployment|serviceQuality|inventoryWaste|menuMix|dailyProfitPlan|vendorPurchase|demandPrepForecast|profitCloseout|supplierVariance|prepExecution|teamCollaboration|operationalKnowledge|shiftCloseout)/i,
    intelligence: /(digitalTwinVisualization|executiveMorningBrief|intelligenceGraph|predictiveOverlay|restaurantReplay|explainableDecision|profitScenario|smartAlertRouter|restaurantPerformance|outcomeIntelligence|marginIntelligence|costVariance|predictiveService|aiOrchestration|operationalDigitalTwin|portfolioIntelligence|performanceLearning)/i,
    enterprise: /(crossLocationPulse|enterpriseOperations|weeklyProfitReview|executiveBriefing|portfolioPerformance|pilotRelease|pilotOperations|pilotReview|deploymentReadiness|postLaunchValue|expansionBenchmark|performanceGovernance|enterpriseValuePlan|pilotOnboarding|pilotLaunch|pilotEvidence|accessReadiness|releaseCertification)/i,
    integrations: /(integrationControl|signalQuality|pilotTelemetry|dataContract|connectorSync|reconciliation)/i
  };

  function inferPack(src) {
    for (const [pack, pattern] of Object.entries(PACK_RULES)) if (pattern.test(src)) return pack;
    return "platform";
  }

  function centerIdFromSource(src) {
    const file = src.split("/").pop()?.split("?")[0] || "";
    return file.endsWith("Center.js") ? file.replace(/\.js$/, "") : null;
  }

  const manifest = {};
  deferred.forEach((placeholder) => {
    const src = placeholder.dataset.src;
    const pack = placeholder.dataset.pack || inferPack(src);
    placeholder.dataset.pack = pack;
    const centerId = placeholder.dataset.center || centerIdFromSource(src);
    if (centerId) placeholder.dataset.center = centerId;
    manifest[pack] ||= { pack, scripts: [], centers: [] };
    manifest[pack].scripts.push(src);
    if (centerId) manifest[pack].centers.push(centerId);
  });

  const mode = fullStartup ? "full" : requestedPacks.size ? "progressive" : "focused";
  document.documentElement.dataset.assetMode = mode;
  window.BlueCurrentAssetMode = mode;
  window.BlueCurrentRequestedPacks = [...requestedPacks];
  window.BlueCurrentFeaturePacks = manifest;
  window.BlueCurrentActivatedCenters = new Set(
    fullStartup
      ? Object.values(manifest).flatMap(group => group.centers)
      : [...requestedPacks].flatMap(pack => manifest[pack]?.centers || [])
  );

  const guard = {
    mode,
    requestedPacks: [...requestedPacks],
    startedAt: Date.now(),
    failures: Number(sessionStorage.getItem(failureKey) || 0),
    lastGood: localStorage.getItem(storageKey) || "focused",
    status: "starting"
  };
  window.BlueCurrentBootGuard = guard;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.body.appendChild(script);
    });
  }

  function showFailure(message) {
    if (document.querySelector(".startup-failure-banner")) return;
    const banner = document.createElement("div");
    banner.className = "startup-failure-banner";
    banner.setAttribute("role", "alert");
    banner.innerHTML = `<strong>Blue Current could not finish loading.</strong><span>${message}</span><button type="button" data-action="focused">Retry focused startup</button><button type="button" data-action="last">Use last good profile</button>`;
    banner.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      if (!action) return;
      const next = new URL(window.location.href);
      next.search = "";
      if (action === "last" && guard.lastGood !== "focused") {
        if (guard.lastGood === "full") next.searchParams.set("full", "1");
        else next.searchParams.set("pack", guard.lastGood.replace("progressive:", ""));
      }
      window.location.assign(next.toString());
    });
    document.body.prepend(banner);
  }

  const watchdog = window.setTimeout(() => {
    if (guard.status === "complete") return;
    guard.status = "timeout";
    guard.failures += 1;
    sessionStorage.setItem(failureKey, String(guard.failures));
    window.dispatchEvent(new CustomEvent("bluecurrent:boot-timeout", { detail: { ...guard } }));
    showFailure("Startup exceeded the 12-second performance budget.");
  }, 12000);

  async function boot() {
    try {
      const selected = fullStartup
        ? deferred
        : deferred.filter(item => requestedPacks.has(item.dataset.pack));
      for (const placeholder of selected) await loadScript(placeholder.dataset.src);
      await loadScript(appSource);

      window.clearTimeout(watchdog);
      const duration = Math.round(performance.now() - startedAt);
      guard.status = "complete";
      guard.durationMs = duration;
      guard.loadedDeferredScripts = selected.length;
      guard.totalDeferredScripts = deferred.length;
      const profile = fullStartup ? "full" : requestedPacks.size ? `progressive:${[...requestedPacks].sort().join(",")}` : "focused";
      localStorage.setItem(storageKey, profile);
      sessionStorage.setItem(failureKey, "0");
      document.documentElement.dataset.bootComplete = "true";
      window.dispatchEvent(new CustomEvent("bluecurrent:boot-complete", {
        detail: { mode, profile, durationMs: duration, loadedDeferredScripts: selected.length, deferredScripts: deferred.length, requestedPacks: [...requestedPacks] }
      }));
      console.info(`Blue Current ${mode} assets loaded in ${duration}ms; ${selected.length} secondary scripts activated, ${deferred.length - selected.length} deferred.`);
    } catch (error) {
      window.clearTimeout(watchdog);
      guard.status = "failed";
      guard.failures += 1;
      sessionStorage.setItem(failureKey, String(guard.failures));
      document.documentElement.dataset.bootFailed = "true";
      console.error("Blue Current startup loader failed", error);
      showFailure(error.message);
      window.dispatchEvent(new CustomEvent("bluecurrent:boot-failed", { detail: { message: error.message, ...guard } }));
    }
  }

  document.addEventListener("click", (event) => {
    const fullTrigger = event.target.closest("#unifiedCommandViewToggle, #roleExperienceShowAll, [data-workspace='full']");
    if (!fullTrigger || fullStartup) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = new URL(window.location.href);
    next.search = "";
    next.searchParams.set("full", "1");
    window.location.assign(next.toString());
  }, true);

  boot();
})();
