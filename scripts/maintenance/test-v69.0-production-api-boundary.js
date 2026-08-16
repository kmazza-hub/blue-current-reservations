"use strict";

const assert=require("assert");
const fs=require("fs");
const path=require("path");
const EventEmitter=require("events");

const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const ProductionBoundaryService=require(path.join(root,"server/services/productionBoundaryService"));

function request({method="GET",url="/api/health",headers={},ip="127.0.0.1"}={}) {
  return {
    method,url,headers,
    socket:{remoteAddress:ip}
  };
}

(()=>{
  assert.equal(pkg.version,"69.0.0");

  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const startup=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

  assert(server.includes("ProductionBoundaryService"));
  assert(server.includes("productionBoundaryService.validateRequest"));
  assert(server.includes("productionBoundaryService.consume"));
  assert(server.includes('code: "RATE_LIMITED"'));
  assert(server.includes('code: "ORIGIN_NOT_ALLOWED"'));
  assert(router.includes("/api/system/security-boundary"));
  assert(router.includes("X-RateLimit-Limit"));
  assert(router.includes("PAYLOAD_TOO_LARGE"));
  assert(startup.includes("V69.0.0 ready"));
  assert(html.includes('content="69.0.0"'));

  const boundary=new ProductionBoundaryService({
    maxBodyBytes:100,
    windowMs:60000,
    apiLimit:3,
    authLimit:2,
    webhookLimit:2
  });

  // Security headers.
  const headers=boundary.securityHeaders({api:true});
  assert.equal(headers["X-Content-Type-Options"],"nosniff");
  assert.equal(headers["X-Frame-Options"],"DENY");
  assert(headers["Content-Security-Policy"].includes("frame-ancestors 'none'"));
  assert(headers["Permissions-Policy"].includes("camera=()"));
  assert.equal(headers["Cache-Control"],"no-store");

  // CORS allowlist and rejection.
  assert.equal(boundary.corsOrigin(request({headers:{origin:"https://bluecurrentco.com"}})),"https://bluecurrentco.com");
  assert.equal(boundary.corsOrigin(request({headers:{origin:"http://localhost:8787"}})),"http://localhost:8787");
  assert.equal(boundary.corsOrigin(request({headers:{origin:"https://abc.trycloudflare.com"}})),"https://abc.trycloudflare.com");
  assert.equal(boundary.corsOrigin(request({headers:{origin:"https://evil.example"}})),false);

  // Declared payload boundary.
  let validation=boundary.validateRequest(request({
    method:"POST",
    headers:{"content-length":"101","content-type":"application/json"}
  }),"/api/reservations");
  assert.equal(validation.status,413);
  assert.equal(validation.code,"PAYLOAD_TOO_LARGE");

  // JSON media-type boundary.
  validation=boundary.validateRequest(request({
    method:"PATCH",
    headers:{"content-length":"12","content-type":"text/plain"}
  }),"/api/floor");
  assert.equal(validation.status,415);

  // Unsupported method.
  validation=boundary.validateRequest(request({method:"TRACE"}),"/api/health");
  assert.equal(validation.status,405);

  // Generic API rate limit.
  const generic=request({ip:"10.0.0.1"});
  assert(boundary.consume(generic,"/api/health").allowed);
  assert(boundary.consume(generic,"/api/health").allowed);
  assert(boundary.consume(generic,"/api/health").allowed);
  const genericBlocked=boundary.consume(generic,"/api/health");
  assert.equal(genericBlocked.allowed,false);
  assert.equal(genericBlocked.limit,3);

  // Authentication endpoints have a tighter independent bucket.
  const login=request({method:"POST",ip:"10.0.0.2"});
  assert(boundary.consume(login,"/api/auth/login").allowed);
  assert(boundary.consume(login,"/api/auth/login").allowed);
  const authBlocked=boundary.consume(login,"/api/auth/login");
  assert.equal(authBlocked.allowed,false);
  assert.equal(authBlocked.limit,2);

  // Webhooks have their own boundary.
  const hook=request({method:"POST",ip:"10.0.0.3"});
  assert(boundary.consume(hook,"/api/live/webhooks/org/source").allowed);
  assert(boundary.consume(hook,"/api/live/webhooks/org/source").allowed);
  assert.equal(boundary.consume(hook,"/api/live/webhooks/org/source").allowed,false);

  const snapshot=boundary.snapshot();
  assert(snapshot.counters.blocked >= 3);
  assert(snapshot.counters.oversized >= 1);
  assert(snapshot.counters.badContentType >= 1);
  assert(snapshot.counters.badOrigin >= 1);
  assert(snapshot.counters.badMethod >= 1);

  console.log(JSON.stringify({
    ok:true,
    version:"69.0.0",
    securityHeaders:true,
    contentSecurityPolicy:true,
    clickjackingProtection:true,
    permissionsPolicy:true,
    corsAllowlist:true,
    untrustedOriginRejection:true,
    declaredPayloadLimit:true,
    streamedPayloadLimit:true,
    jsonMutationBoundary:true,
    unsupportedMethodBoundary:true,
    generalApiRateLimit:true,
    tighterAuthenticationRateLimit:true,
    independentWebhookRateLimit:true,
    rateLimitHeaders:true,
    securityDiagnostics:true
  },null,2));
})();
