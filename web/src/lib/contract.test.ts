// contract/cases.json の共通ケース。Python 側（analyzer/tests/test_contract.py）も同じファイルで確かめる。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { normalize } from "./ingredients.ts";
import { judge, type UsageResult } from "./judge.ts";

const cases = JSON.parse(readFileSync(new URL("../../../contract/cases.json", import.meta.url), "utf-8"));

for (const c of cases.normalize) {
  test(`normalize: ${c.name}`, () => {
    assert.deepEqual(normalize(c.input), c.expected);
  });
}

for (const c of cases.judge) {
  test(`judge: ${c.name}`, () => {
    assert.deepEqual(judge(c.candidate, c.records as UsageResult[]), c.expected);
  });
}
