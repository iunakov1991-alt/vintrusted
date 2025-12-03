import test from "node:test";
import assert from "node:assert/strict";

import { withCache, loadCache } from "../scripts/seo-cache.js";

test("withCache stores and returns values", async () => {
  const key = "unit-test-key";
  const v1 = await withCache(key, async () => "value-1");
  const v2 = await withCache(key, async () => "value-2");
  assert.equal(v1, "value-1");
  assert.equal(v2, "value-1");
  const cache = loadCache();
  assert.equal(cache[key], "value-1");
});






