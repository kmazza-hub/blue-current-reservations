BLUE CURRENT V34.3.0 — API ORCHESTRATOR & INTELLIGENT REQUEST PIPELINE

REPLACE
- client/index.html
- client/js/cloud/cloudApi.js
- client/js/modules/cloudFoundation.js
- client/js/modules/startupDiagnostics.js

ADD
- client/js/cloud/requestPipeline.js

IMPLEMENTED
- Central priority-based request queue
- Six-request concurrency control
- Automatic GET-request deduplication
- Cancellation API for obsolete requests
- Configurable request timeouts
- Exponential retry with jitter
- Retry budgets for transient failures
- Per-scope circuit breaker
- Memory and session request caches
- Configurable TTL policies
- Stale-while-revalidate behavior
- Automatic cache invalidation after writes and operating events
- Client-side batch request API
- Module registration and dependency graph
- Deterministic dependency resolution
- Measured startup phases
- Event-driven reservation and configuration updates
- Request latency, success, retry, cache, queue, and circuit metrics
- Startup Diagnostics integration
- Cloud Foundation pipeline controls and status API

TEST
1. Replace/add the five files.
2. Run npm run check.
3. Run npm start.
4. Sign in and refresh the application.
5. Confirm duplicate GET requests share one in-flight request.
6. Confirm Startup Diagnostics shows API latency, cache ratio, retries, and active requests.
7. Open multiple modules quickly and confirm queue depth remains controlled.
8. Trigger a reservation or configuration update and confirm related caches invalidate.
9. Stop and restart the server to observe retry and circuit-breaker behavior.
10. In the browser console, inspect:
   BlueCurrentRequestPipeline.metricsSnapshot()
11. Confirm dependency order includes Authentication → Bootstrap → Reservations/Floor/Staff → Executive/AI Brain → Autonomous Operations.
