// exports manifest 検査（m0-t2 設計 §5.3）の純関数 checkExports を fixture で検査する。
// 正例 1 ＋ 反例 4（key 欠落 / ファイル欠落 / 余分な key / types・import 条件の欠落 — MIN3-1 で §5.3 に追記）= 5 テスト。
import assert from "node:assert/strict";
import { test } from "node:test";
import { EXPECTED_KEYS, checkExports } from "./exports-manifest.mjs";

function goodPkg() {
  return {
    name: "@maplat/interface",
    exports: {
      ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
      "./core": { types: "./dist/core/index.d.ts", import: "./dist/core/index.js" },
      "./contract-kit": { types: "./dist/contract-kit/index.d.ts", import: "./dist/contract-kit/index.js" }
    }
  };
}
const allExist = () => true;

test("正例: key 集合が {., ./core, ./contract-kit} で 6 ファイルが実在すれば緑（keys=3 files=6）", () => {
  assert.deepEqual([...EXPECTED_KEYS].sort(), [".", "./contract-kit", "./core"]);
  const r = checkExports(goodPkg(), allExist);
  assert.deepEqual(r.failures, []);
  assert.equal(r.ok, true);
  assert.equal(r.keys, 3);
  assert.equal(r.files, 6);
});

test("反例: key 欠落（./core 無し）と exports 不在は赤", () => {
  const p = goodPkg();
  delete p.exports["./core"];
  const r = checkExports(p, allExist);
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes("./core")));
  const r2 = checkExports({ name: "@maplat/interface" }, allExist);
  assert.equal(r2.ok, false);
  assert.equal(r2.keys, 0);
});

test("反例: 指すファイルが dist に無ければ赤", () => {
  const r = checkExports(goodPkg(), (p) => p !== "./dist/core/index.js");
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes("./dist/core/index.js")));
  assert.equal(r.files, 5);
});

test("反例: 余分な key（./extra）は赤", () => {
  const p = goodPkg();
  p.exports["./extra"] = { types: "./dist/extra.d.ts", import: "./dist/extra.js" };
  const r = checkExports(p, allExist);
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes("./extra")));
});

test("反例: exports の値から types / import の条件が欠けていれば赤（MIN3-1）", () => {
  const p1 = goodPkg();
  delete p1.exports["./core"].types;
  const r1 = checkExports(p1, allExist);
  assert.equal(r1.ok, false);
  assert.ok(r1.failures.some((f) => f.includes("./core") && f.includes("types")));
  const p2 = goodPkg();
  delete p2.exports["."].import;
  const r2 = checkExports(p2, allExist);
  assert.equal(r2.ok, false);
  assert.ok(r2.failures.some((f) => f.includes('"."') && f.includes("import")));
  const p3 = goodPkg();
  p3.exports["."] = "./dist/index.js";
  assert.equal(checkExports(p3, allExist).ok, false);
});
