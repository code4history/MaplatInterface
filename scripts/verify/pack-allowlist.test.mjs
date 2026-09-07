// 配布境界検査 pack-allowlist（m1-t3 設計 §5.7 判定 A0〜A6）の純関数を fixture で検査する。
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ALLOWED_EXACT, ancestorLockDigests, classifyPackEntries, extractPackDocs } from "./pack-allowlist.mjs";

const GOOD = ["package/README.md", "package/LICENSE", "package/package.json", "package/dist/index.js", "package/dist/index.js.map", "package/dist/core/index.d.ts", "package/dist/contract-kit/index.js"];

test("A-P1 許可 entry ちょうどは緑（entry / dist を数える）", () => {
  const r = classifyPackEntries(GOOD);
  assert.deepEqual(r.failures, []);
  assert.equal(r.ok, true);
  assert.equal(r.entryCount, GOOD.length);
  assert.equal(r.distCount, 4);
});

test("A-N1 空一覧は赤（A0）", () => {
  const r = classifyPackEntries([]);
  assert.equal(r.ok, false);
  assert.equal(r.entryCount, 0);
  assert.ok(r.failures.some((f) => f.includes("0 件")));
});

test("A-N2 package/dist/** が 0 件は赤（A1）", () => {
  const r = classifyPackEntries(["package/README.md", "package/LICENSE", "package/package.json"]);
  assert.equal(r.ok, false);
  assert.equal(r.distCount, 0);
  assert.ok(r.failures.some((f) => f.includes("dist")));
});

test("A-N3 ALLOWED_EXACT を 1 つずつ落とす（3 変異）→ それぞれ赤（A2）", () => {
  for (const must of ALLOWED_EXACT) {
    const r = classifyPackEntries(GOOD.filter((e) => e !== must));
    assert.equal(r.ok, false, must);
    assert.ok(r.failures.some((f) => f.includes(`${must} が無い`)), must);
  }
});

test("A-N4 許可外 entry を 1 つずつ足す（9 変異）→ それぞれ赤（A3。entry 名を出力に明示）", () => {
  const forbidden = [
    "package/src/index.ts",
    "package/spec/skeleton.test.ts",
    "package/scripts/verify/exports-manifest.mjs",
    "package/.github/workflows/test.yml",
    "package/ci/pnpm-workspace.ci.yaml",
    "package/pnpm-lock.yaml",
    "package/tsconfig.json",
    "package/eula/EULA.txt",
    "package/PoC/x",
  ];
  for (const entry of forbidden) {
    const r = classifyPackEntries([...GOOD, entry]);
    assert.equal(r.ok, false, entry);
    assert.ok(r.failures.some((f) => f.includes(entry)), entry);
  }
});

test("A-N5 祖先 workspace の lock md5 を数える（A4 の前提。pnpm-workspace.yaml を持つ祖先だけ）", () => {
  const top = mkdtempSync(join(tmpdir(), "maplat-anc-"));
  const ws = join(top, "ws");
  const sub = join(ws, "pkg", "deeper");
  mkdirSync(sub, { recursive: true });
  writeFileSync(join(ws, "pnpm-workspace.yaml"), "packages:\n  - pkg\n");
  writeFileSync(join(ws, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  const digests = ancestorLockDigests(sub).filter((d) => d.dir.startsWith(top));
  assert.equal(digests.length, 1);
  assert.equal(digests[0].dir, ws);
  assert.match(digests[0].md5, /^[0-9a-f]{32}$/);
  assert.equal(ancestorLockDigests(top).filter((d) => d.dir.startsWith(top)).length, 0);
});

test("A-P2/A-N7 extractPackDocs: 正しく読めば entry 件数 = 内容 doc 件数・byte > 0、空へ壊すと byte = 0（A6）", () => {
  const entries = ["package/package.json", "package/dist/index.js"];
  const byName = { "package/package.json": "{\"name\":\"@maplat/interface\"}\n", "package/dist/index.js": "export {};\n" };
  const okDocs = extractPackDocs("/fake.tgz", entries, { spawn: (_cmd, args) => ({ status: 0, stdout: Buffer.from(byName[args[args.length - 1]] ?? "") }) });
  assert.equal(okDocs.length, entries.length);
  assert.ok(okDocs.every((d) => d.bytes > 0), JSON.stringify(okDocs.map((d) => d.bytes)));
  // 内容抽出を空配列へ壊す（tar が失敗 = 空/0 byte）
  const broken = extractPackDocs("/fake.tgz", entries, { spawn: () => ({ status: 1, stdout: Buffer.alloc(0) }) });
  const total = broken.reduce((n, d) => n + d.bytes, 0);
  assert.equal(broken.length, entries.length);
  assert.equal(total, 0);
});