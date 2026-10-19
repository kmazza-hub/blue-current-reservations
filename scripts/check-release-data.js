"use strict";

const fs = require("fs");
const path = require("path");

function findRuntimeArtifacts(root) {
  const found = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if ([".git", "node_modules"].includes(entry.name)) continue;
      const full = path.join(directory, entry.name);
      const relative = path.relative(root, full).split(path.sep).join("/");
      const runtime = /(^|\/)database\/data(?:\/|$)/.test(relative) ||
        /^(?:blue-current\.json(?:\..*)?|blue-current-runtime-.*\.json(?:\..*)?|runtime-(?:database|backup)\.local\.json)$/.test(entry.name) ||
        (/^\.env(?:\.|$)/.test(entry.name) && entry.name !== ".env.example");
      if (runtime) found.push(relative);
      else if (entry.isDirectory()) walk(full);
      else if (entry.isSymbolicLink()) found.push(relative + " (symlink requires review)");
    }
  }
  walk(root);
  return found;
}

if (require.main === module) {
  const found = findRuntimeArtifacts(path.resolve(__dirname, ".."));
  if (found.length) {
    console.error("Release contains runtime data or local authority:\n" + found.join("\n"));
    process.exitCode = 1;
  } else console.log("Recursive release-data check passed; no runtime database, backup, or local authority files.");
}
module.exports = { findRuntimeArtifacts };
