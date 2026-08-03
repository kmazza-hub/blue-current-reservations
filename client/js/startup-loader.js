(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const fullStartup = params.get("full") === "1";
  const appSource = `js/app-v15.1.3.js?v=37.2.0`;
  const deferred = [...document.querySelectorAll('script[type="text/bluecurrent-deferred"][data-src]')];
  const startedAt = performance.now();

  document.documentElement.dataset.assetMode = fullStartup ? "full" : "focused";
  window.BlueCurrentAssetMode = fullStartup ? "full" : "focused";

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

  async function boot() {
    try {
      if (fullStartup) {
        for (const placeholder of deferred) {
          await loadScript(placeholder.dataset.src);
        }
      }

      await loadScript(appSource);
      const duration = Math.round(performance.now() - startedAt);
      document.documentElement.dataset.bootComplete = "true";
      window.dispatchEvent(new CustomEvent("bluecurrent:boot-complete", {
        detail: { mode: window.BlueCurrentAssetMode, durationMs: duration, deferredScripts: deferred.length }
      }));
      console.info(`Blue Current ${window.BlueCurrentAssetMode} assets loaded in ${duration}ms; ${deferred.length} secondary scripts deferred.`);
    } catch (error) {
      document.documentElement.dataset.bootFailed = "true";
      console.error("Blue Current startup loader failed", error);
      const banner = document.createElement("div");
      banner.className = "startup-failure-banner";
      banner.setAttribute("role", "alert");
      banner.innerHTML = `<strong>Blue Current could not finish loading.</strong><span>${error.message}</span><button type="button">Retry focused startup</button>`;
      banner.querySelector("button").addEventListener("click", () => {
        window.location.href = `${window.location.pathname}?safe=1`;
      });
      document.body.prepend(banner);
    }
  }

  document.addEventListener("click", (event) => {
    const fullTrigger = event.target.closest("#unifiedCommandViewToggle, #roleExperienceShowAll, [data-workspace='full']");
    if (!fullTrigger || fullStartup) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = new URL(window.location.href);
    next.searchParams.set("full", "1");
    window.location.assign(next.toString());
  }, true);

  boot();
})();
