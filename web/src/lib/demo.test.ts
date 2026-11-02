import assert from "node:assert/strict";
import { test } from "node:test";
import { DEMO_CANDIDATES, DemoApi } from "./demo.ts";

test("デモの例1は、合った物との共通点と未経験の成分が出る", async () => {
  const api = new DemoApi();
  const { candidate, judgement } = await api.judge(DEMO_CANDIDATES[0].text);
  assert.equal(candidate.length, 6);
  assert.equal(judgement.goodTotal, 4);
  assert.equal(judgement.badTotal, 2);
  assert.equal(judgement.lowData, false);
  assert.deepEqual(
    judgement.common.map((f) => f.ingredient),
    ["水", "グリセリン", "BG", "セラミドNP", "フェノキシエタノール"],
  );
  assert.deepEqual(
    judgement.unknown.map((f) => f.ingredient),
    ["ナイアシンアミド"],
  );
});

test("デモの例2は、別名を統一したうえで注意点が出る", async () => {
  const api = new DemoApi();
  const { candidate, judgement } = await api.judge(DEMO_CANDIDATES[1].text);
  assert.deepEqual(candidate, ["水", "エタノール", "ヒアルロン酸Na", "香料", "BG"]);
  assert.deepEqual(
    judgement.caution.map((f) => f.ingredient),
    ["エタノール", "香料"],
  );
  assert.deepEqual(
    judgement.mixed.map((f) => f.ingredient),
    ["ヒアルロン酸Na"],
  );
});

test("結果を記録すると判定に使われ、まだ判断していない物は使われない", async () => {
  const api = new DemoApi();
  const before = await api.insights();
  const uv = (await api.listProducts()).find((p) => p.name === "UVミルク")!;
  assert.equal(uv.latestResult, undefined);

  await api.addUsage(uv.id, { startedOn: "2026-10-30", result: "bad" });
  const after = await api.insights();
  assert.equal(after.badTotal, before.badTotal + 1);
  assert.ok(after.caution.some((f) => f.ingredient === "メトキシケイヒ酸エチルヘキシル"));
});

test("やめた日が使い始めより前だとエラー", async () => {
  const api = new DemoApi();
  const [p] = await api.listProducts();
  await assert.rejects(api.addUsage(p.id, { startedOn: "2026-10-10", endedOn: "2026-10-01" }));
});

test("登録・削除ができ、成分を読み取れない登録はエラー", async () => {
  const api = new DemoApi();
  const created = await api.createProduct({ name: "新しい化粧水", category: "toner", ingredientsText: "精製水、BG" });
  assert.deepEqual(created.ingredients, ["水", "BG"]);
  await api.deleteProduct(created.id);
  assert.ok(!(await api.listProducts()).some((p) => p.id === created.id));
  await assert.rejects(api.createProduct({ name: "空", category: "toner", ingredientsText: " 、 " }));
});
