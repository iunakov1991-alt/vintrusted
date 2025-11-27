const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, "data", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "seo-cache.json");

let cache = null;

function loadCache() {
  if (cache) return cache;
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    if (!fs.existsSync(CACHE_FILE)) {
      cache = {};
      return cache;
    }
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    cache = {};
  }
  return cache;
}

function saveCache() {
  if (!cache) return;
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // молча
  }
}

/**
 * Универсальный helper:
 * withCache("key", () => computeHeavyStuff())
 */
async function withCache(key, computeFn) {
  loadCache();
  if (Object.prototype.hasOwnProperty.call(cache, key)) {
    return cache[key];
  }
  const result = await Promise.resolve(computeFn());
  cache[key] = result;
  saveCache();
  return result;
}

module.exports = { withCache, loadCache, saveCache };

