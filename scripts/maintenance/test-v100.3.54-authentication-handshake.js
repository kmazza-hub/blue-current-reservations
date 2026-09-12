const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const auth = fs.readFileSync(path.join(root, "client/js/modules/authOrganizations.js"), "utf8");
const html = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
const pkg = require(path.join(root, "package.json"));

const checks = [
  ["Runtime identifies V100.3.54 or later", /^100\.3\.(?:5[4-9]|[6-9]\d|\d{3,})$/.test(pkg.version) && html.includes(`content="${pkg.version}"`)],
  ["Login validates the returned token", auth.includes("!session?.token || !session?.user || !session?.organizationId")],
  ["Session token is stored before API token verification", auth.indexOf("api.setToken(session.token)") < auth.indexOf('if (!api.token)')],
  ["Authentication module cache is advanced", /authOrganizations\.js\?v=100\.3\.(?:5[4-9]|[6-9]\d|\d{3,})/.test(html)]
];

let passed = 0;
for (const [name, ok] of checks) {
  if (!ok) throw new Error(`FAIL: ${name}`);
  passed += 1;
  console.log(`PASS: ${name}`);
}
console.log(`V100.3.54 authentication handshake ${passed}/${checks.length}`);
