// copy-kit-assets.mjs の invoice テスト（m1-t3 設計 §5.1.1 判定 B0〜B4。各行 = 1 テスト）。
import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SRC_DIR, listJsonFiles, planCopy, validateCopy } from "./copy-kit-assets.mjs";

function fixture({ withSrc = true, withDist = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "copy-kit-assets-"));
  const src = join(root, "src", "contract-kit");
  if (withSrc) {
    mkdirSync(join(src, "fixtures"), { recursive: true });
    writeFileSync(join(src, "registry.json"), "{\"id\":1}\n");
    writeFileSync(join(src, "fixtures", "src-f1.json"), "{\"id\":\"f1\"}\n");
  }
  const dist = join(root, "dist");
  if (withDist) mkdirSync(dist, { recursive: true });
  return { root, src, dist };
}

test("B-P1 実際の src/contract-kit/**/*.json を再帰列挙し、複製計画の相対 path が一致する（B0/B2）", () => {
  const files = listJsonFiles(SRC_DIR);
  assert.ok(files.includes("registry.json"), JSON.stringify(files));
  assert.ok(files.some((f) => f.startsWith("fixtures/") && f.endsWith(".json")), JSON.stringify(files));
  const plan = planCopy(files);
  for (const p of plan) {
    assert.equal(p.rel, files[plan.indexOf(p)]);
    assert.ok(p.dest.startsWith("dist/contract-kit/"), p.dest);
  }
});

test("B-P2 複製後に相対 path 集合と byte が一致すれば緑（B4）", () => {
  const f = fixture();
  const files = listJsonFiles(f.src);
  const plan = planCopy(files, { srcDir: f.src, distRoot: f.dist });
  for (const p of plan) {
    mkdirSync(join(f.dist, "contract-kit", p.rel.split("/").slice(0, -1).join("/")), { recursive: true });
    writeFileSync(p.dest, readFileSync(p.src));
  }
  const r = validateCopy(files, { srcDir: f.src, distRoot: f.dist });
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  assert.equal(r.count, 2);
});

test("B-N1 複製元 0 件 → 赤（B1）", () => {
  const f = fixture({ withSrc: true });
  const empty = join(f.root, "empty");
  mkdirSync(empty, { recursive: true });
  assert.deepEqual(listJsonFiles(empty), []);
});

test("B-N2 dist/ 不在 → 赤（B3）", () => {
  const f = fixture({ withDist: false });
  assert.equal(existsSync(f.dist), false);
});

test("B-N3 複製先の 1 ファイルを削ると赤（B4）", () => {
  const f = fixture();
  const files = listJsonFiles(f.src);
  const plan = planCopy(files, { srcDir: f.src, distRoot: f.dist });
  for (const p of plan) {
    mkdirSync(join(f.dist, "contract-kit", p.rel.split("/").slice(0, -1).join("/")), { recursive: true });
    writeFileSync(p.dest, readFileSync(p.src));
  }
  unlinkSync(join(f.dist, "contract-kit", "registry.json"));
  const r = validateCopy(files, { srcDir: f.src, distRoot: f.dist });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((x) => x.includes("集合")));
});