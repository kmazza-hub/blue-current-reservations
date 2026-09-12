"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const LOCAL_CONFIG = path.join("config", "runtime-database.local.json");
const SEED_FILE = path.join("database", "seed", "seed.json");

function readLocalConfiguration(root) {
  const configurationPath = path.join(root, LOCAL_CONFIG);
  if (!fs.existsSync(configurationPath)) return null;

  const configuration = JSON.parse(fs.readFileSync(configurationPath, "utf8").replace(/^\uFEFF/, ""));
  if (!configuration.databasePath || !path.isAbsolute(configuration.databasePath)) {
    const error = new Error(`${LOCAL_CONFIG} must contain an absolute databasePath.`);
    error.code = "INVALID_RUNTIME_DATABASE_CONFIGURATION";
    throw error;
  }
  return { path: path.normalize(configuration.databasePath), source: "local-configuration" };
}

function defaultDatabasePath({ env = process.env, platform = process.platform, homeDirectory = os.homedir() } = {}) {
  if (platform === "win32") {
    const localApplicationData = env.LOCALAPPDATA;
    if (!localApplicationData) {
      const error = new Error("LOCALAPPDATA is required when BLUE_CURRENT_DB is not configured on Windows.");
      error.code = "RUNTIME_DATABASE_DIRECTORY_UNAVAILABLE";
      throw error;
    }
    return path.join(localApplicationData, "BlueCurrent", "data", "blue-current.json");
  }

  const dataRoot = env.XDG_DATA_HOME || path.join(homeDirectory, ".local", "share");
  return path.join(dataRoot, "blue-current", "blue-current.json");
}

function resolveRuntimeDatabase({ root, env = process.env, platform = process.platform, homeDirectory } = {}) {
  if (!root) throw new TypeError("A project root is required.");
  if (env.BLUE_CURRENT_DB) {
    return { path: path.normalize(env.BLUE_CURRENT_DB), source: "environment" };
  }

  const local = readLocalConfiguration(root);
  if (local) return local;

  return {
    path: defaultDatabasePath({ env, platform, homeDirectory }),
    source: "platform-default"
  };
}

function readAndValidateJson(filePath, label) {
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    JSON.parse(raw);
  } catch (error) {
    error.message = `${label} is not valid JSON: ${error.message}`;
    throw error;
  }
  return raw;
}

function ensureRuntimeDatabase({ root, runtime } = {}) {
  if (!root || !runtime || !runtime.path) throw new TypeError("Project root and runtime database are required.");
  if (fs.existsSync(runtime.path)) {
    readAndValidateJson(runtime.path, "Runtime database");
    return { ...runtime, initialized: false };
  }

  if (runtime.source === "environment") {
    const error = new Error(`Configured BLUE_CURRENT_DB does not exist: ${runtime.path}`);
    error.code = "CONFIGURED_RUNTIME_DATABASE_MISSING";
    throw error;
  }

  const seedPath = path.join(root, SEED_FILE);
  const seed = readAndValidateJson(seedPath, "Committed initialization seed");
  fs.mkdirSync(path.dirname(runtime.path), { recursive: true });
  const temporary = `${runtime.path}.initialize.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporary, seed, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, runtime.path);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return { ...runtime, initialized: true, seedPath };
}

function prepareRuntimeDatabase(options = {}) {
  return ensureRuntimeDatabase({
    root: options.root,
    runtime: resolveRuntimeDatabase(options)
  });
}

module.exports = {
  LOCAL_CONFIG,
  SEED_FILE,
  defaultDatabasePath,
  resolveRuntimeDatabase,
  ensureRuntimeDatabase,
  prepareRuntimeDatabase
};
