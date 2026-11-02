// デモ版を本物のブラウザ（Chromium）で操作して確かめる E2E テスト。
// 先に `npm run build:demo` で dist/ を作ってから `npm run e2e` で実行する。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, join } from "node:path";
import { after, before, test } from "node:test";
import { type Browser, chromium, type Page } from "playwright";

const DIST = new URL("../dist/", import.meta.url).pathname;
const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

let server: Server;
let browser: Browser;
let page: Page;
let baseUrl = "";
const errors: string[] = [];

before(async () => {
  server = createServer(async (req, res) => {
    const path = req.url === "/" ? "/index.html" : (req.url ?? "/");
    try {
      const body = await readFile(join(DIST, path));
      res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  baseUrl = `http://localhost:${typeof address === "object" && address ? address.port : 0}/`;
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  page.on("pageerror", (e) => errors.push(e.message));
});

after(async () => {
  await browser?.close();
  server?.close();
});

test("例の候補を判定すると、共通点・注意点と注意書きが出る", async () => {
  await page.goto(baseUrl);
  await page.getByRole("button", { name: "例2：ミスト化粧水" }).click();
  await page.getByRole("heading", { name: "判定結果" }).waitFor();

  const caution = page.getByRole("region", { name: "注意点" });
  assert.match((await caution.textContent()) ?? "", /エタノール.*合わなかった2個中2個/);
  const common = page.getByRole("region", { name: "共通点" });
  assert.match((await common.textContent()) ?? "", /BG.*合った4個中4個/);
  assert.ok(await page.getByRole("note").isVisible());
});

test("化粧品を登録して「合った」を記録すると、傾向に反映される", async () => {
  await page.getByRole("button", { name: "記録", exact: true }).click();
  await page.getByLabel("商品名").fill("テスト用の美容液");
  await page.getByLabel("全成分表示").fill("精製水、ナイアシンアミド、BG");
  await page.getByRole("button", { name: "登録する" }).click();

  const item = page.getByRole("listitem").filter({ hasText: "テスト用の美容液" });
  await item.getByText("未判断").waitFor();
  await item.getByRole("button", { name: "合った", exact: true }).click();
  await item.locator(".badge-good").waitFor();

  await page.getByRole("button", { name: "傾向" }).click();
  await page.getByText("合った 5 個・合わなかった 2 個").waitFor();
});

test("画面のエラーが起きていない", () => {
  assert.deepEqual(errors, []);
});
