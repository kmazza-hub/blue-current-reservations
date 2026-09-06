"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const clientRoot = path.join(root, "client");
const html = fs.readFileSync(path.join(clientRoot, "index.html"), "utf8");
const css = fs.readFileSync(path.join(clientRoot, "styles.css"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(clientRoot, "manifest.webmanifest"), "utf8"));
let passed = 0;
let total = 0;

function check(name, condition) {
  total += 1;
  if (condition) { passed += 1; console.log(`PASS ${total}: ${name}`); }
  else { console.error(`FAIL ${total}: ${name}`); process.exitCode = 1; }
}

function pngDimensions(relativePath) {
  const absolutePath = path.join(clientRoot, relativePath.replace(/^\//, ""));
  const bytes = fs.readFileSync(absolutePath);
  const signature = bytes.subarray(0, 8).toString("hex");
  return {
    exists: fs.existsSync(absolutePath),
    png: signature === "89504e470d0a1a0a",
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

check("Viewport uses device width and safe-area coverage", /name="viewport"[^>]+width=device-width[^>]+viewport-fit=cover/.test(html));
check("Viewport preserves operator pinch zoom", !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(html));
check("Safari standalone application mode is enabled", /apple-mobile-web-app-capable" content="yes"/.test(html));
check("Safari standalone title is Blue Current", /apple-mobile-web-app-title" content="Blue Current"/.test(html));
check("Apple touch icon is explicitly linked", /apple-touch-icon" sizes="180x180" href="\/assets\/blue-current-touch-180\.png\?v=100\.3\.40"/.test(html));
check("Manifest is versioned for the iPad readiness wave", /manifest\.webmanifest\?v=100\.3\.40/.test(html));
check("Manifest has a stable application identity", manifest.id === "/" && manifest.start_url === "/" && manifest.scope === "/");
check("Manifest launches in standalone mode", manifest.display === "standalone");
check("Manifest and browser chrome use the same theme color", manifest.theme_color === "#082632" && html.includes('name="theme-color" content="#082632"'));

const expectedIcons = new Map([["192x192", "/assets/blue-current-pwa-192.png"], ["512x512", "/assets/blue-current-pwa-512.png"]]);
check("Manifest declares both required PNG install sizes", expectedIcons.size === 2 && [...expectedIcons].every(([size, src]) => manifest.icons?.some(icon => icon.sizes === size && icon.src === src && icon.type === "image/png")));
for (const [size, src] of expectedIcons) {
  const dimensions = pngDimensions(src);
  const expected = Number(size.split("x")[0]);
  check(`${size} install icon is a valid PNG with exact dimensions`, dimensions.exists && dimensions.png && dimensions.width === expected && dimensions.height === expected);
}
const touchIcon = pngDimensions("/assets/blue-current-touch-180.png");
check("180x180 Apple touch icon is a valid PNG", touchIcon.exists && touchIcon.png && touchIcon.width === 180 && touchIcon.height === 180);

check("Coarse-pointer controls retain the 44px touch floor", /@media\s*\(pointer:coarse\)[\s\S]*?min-height:44px/.test(css));
check("Touch controls suppress delayed gesture handling", /touch-action:manipulation/.test(css));
check("Standalone layout accounts for iPad safe areas", /safe-area-inset-top/.test(css) && /safe-area-inset-bottom/.test(css));
check("Modal height follows the visible keyboard viewport", /max-height:calc\(100dvh/.test(css));
check("Scrollable operator queues retain momentum scrolling", /-webkit-overflow-scrolling:touch/.test(css));

const requiredRuntimeAssets = [
  "js/network-connectivity-truth-v100.2.85.js",
  "js/ipad-resume-truth-v100.2.86.js",
  "js/focused-operator-workspaces-v100.3.9.js",
  "js/fullscreen-floor-zone-controls-v100.3.10.3.js",
  "js/floor-lifecycle-certification-v100.3.11.js",
  "js/host-lifecycle-certification-v100.3.12.js"
];
check("Connectivity, resume, workspace, Floor, and Host safeguards load", requiredRuntimeAssets.every(asset => html.includes(asset) && fs.existsSync(path.join(clientRoot, asset))));
check("Kitchen and Staff focused workspaces remain lazy-loadable", html.includes('data-bc-runtime-group="kitchen"') && html.includes('data-bc-runtime-group="staff"'));
check("Release database is absent", !fs.existsSync(path.join(root, "database/data/V100.3.40.json")));

console.log(`V100.3.40 iPad pilot readiness certification ${passed}/${total}`);
if (passed !== total) process.exitCode = 1;
