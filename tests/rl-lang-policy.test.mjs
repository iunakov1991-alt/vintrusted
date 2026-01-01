import test from "node:test";
import assert from "node:assert/strict";

import { loadLangPolicy, chooseLang } from "../scripts/seo-lang-policy.js";

test("loadLangPolicy returns sane defaults", () => {
  const p = loadLangPolicy();
  assert.ok(p.en > 0 && p.es > 0);
  assert.ok(Math.abs(p.en + p.es - 1) < 1e-6);
});

test("chooseLang returns en or es", () => {
  const seen = new Set();
  for (let i = 0; i < 100; i++) {
    seen.add(chooseLang());
  }
  assert.ok(seen.has("en") || seen.has("es"));
});























