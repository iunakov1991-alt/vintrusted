// Примитивный dedupe-движок: следит за комбинациями title+meta+h1+summary
// В будущем можно заменить на что-то поумнее (n-gram / Jaccard).

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(ROOT, "data", "seo-dedupe-index.json");

let index = new Set();

function loadIndex() {
  try {
    if (fs.existsSync(INDEX_PATH)) {
      const raw = fs.readFileSync(INDEX_PATH, "utf8");
      const arr = JSON.parse(raw);
      index = new Set(arr);
    }
  } catch {
    index = new Set();
  }
}

function saveIndex() {
  try {
    fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
    fs.writeFileSync(INDEX_PATH, JSON.stringify(Array.from(index), null, 2), "utf8");
  } catch {
    // ignore
  }
}

function getHash(pageData) {
  const key = [
    pageData.lang || "en",
    pageData.title || "",
    pageData.metaDescription || "",
    pageData.h1 || "",
    pageData.summary || "",
    pageData.slugPath || ""
  ].join("||");

  return crypto.createHash("sha256").update(key).digest("hex");
}

function isDuplicate(pageData) {
  const h = getHash(pageData);
  return index.has(h);
}

function register(pageData) {
  const h = getHash(pageData);
  index.add(h);
}

loadIndex();

module.exports = {
  isDuplicate,
  register,
  saveIndex
};

