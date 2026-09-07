// run-groups.mjs の純関数 planGroups / runGroups を fixture で検査する（m1-t3 設計 §5.11.1 判定 G0〜G4）。
import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeGroup, planGroups, runGroups } from "./run-groups.mjs";

const REAL_TEST_FILES = [
  "scripts/verify/exports-manifest.test.mjs",
  "scripts/verify/pack-allowlist.test.mjs",
  "scripts/build/copy-kit-assets.test.mjs",
  "scripts/verify/run-groups.test.mjs",
];
const stubSpec = () => ({
  verify: [{ name: "exports-manifest", command: ["node", "scripts/verify/exports-manifest.mjs"] }],
  test: [
    { name: "vitest", command: ["node", "node_modules/vitest/vitest.mjs", "run"] },
    { name: "exports-manifest-test", file: "scripts/verify/exports-manifest.test.mjs" },
    { name: "pack-allowlist-test", file: "scripts/verify/pack-allowlist.test.mjs" },
    { name: "copy-kit-assets-test", file: "scripts/build/copy-kit-assets.test.mjs" },
    { name: "run-groups-test", file: "scripts/verify/run-groups.test.mjs" },
  ],
});

test("G-P1 test 群の明示列挙が実ファイルと一致すれば緑（normalizeGroup は file → node --test）", () => {
  const p = planGroups(stubSpec(), "test", { listTestFiles: () => REAL_TEST_FILES });
  assert.deepEqual(p.failures, []);
  assert.equal(p.groups.length, 5);
  const vitest = p.groups.find((g) => g.name === "exports-manifest-test");
  assert.deepEqual(vitest.command, ["node", "--test", "scripts/verify/exports-manifest.test.mjs"]);
});

test("B-N4a 群一覧に在って定義が無い（command/file 無し）→ 赤（G0）", () => {
  const spec = stubSpec();
  spec.test.push({ name: "orphan" });
  const p = planGroups(spec, "test", { listTestFiles: () => REAL_TEST_FILES });
  assert.ok(p.failures.some((f) => f.includes("orphan") && f.includes("定義")), JSON.stringify(p.failures));
});

test("B-N4b scripts/ に在って一覧に無い .test.mjs → 赤（G0/G1）", () => {
  const spec = stubSpec();
  spec.test = spec.test.filter((g) => g.name !== "copy-kit-assets-test");
  const p = planGroups(spec, "test", { listTestFiles: () => REAL_TEST_FILES });
  assert.ok(p.failures.some((f) => f.includes("copy-kit-assets.test.mjs") && f.includes("test 群に無い")), JSON.stringify(p.failures));
});

test("B-N5 明示列挙から実在する .test.mjs を 1 本外す / 一覧にだけ在る名を足す → それぞれ赤（G1）", () => {
  const s1 = stubSpec();
  s1.test = s1.test.filter((g) => g.name !== "run-groups-test");
  assert.ok(planGroups(s1, "test", { listTestFiles: () => REAL_TEST_FILES }).failures.some((f) => f.includes("run-groups.test.mjs")));
  const s2 = stubSpec();
  s2.test.push({ name: "phantom-test", file: "scripts/verify/phantom.test.mjs" });
  assert.ok(planGroups(s2, "test", { listTestFiles: () => REAL_TEST_FILES }).failures.some((f) => f.includes("phantom.test.mjs")));
});

test("B-N7 群一覧を空にする → 赤（G3）", () => {
  const p = planGroups({ test: [] }, "test", { listTestFiles: () => [] });
  assert.ok(p.failures.some((f) => f.includes("0 件")), JSON.stringify(p.failures));
});

test("B-N6 先頭群が必ず失敗しても後続群を実行し総合 exit 非 0（G2）", () => {
  // 実グループ群に依存しないよう、runGroups に最小 plan と「先頭だけ失敗する spawn」を注入
  const plan = { groups: [
    { name: "first", command: ["node", "-e", "process.exit(1)"] },
    { name: "second", command: ["node", "-e", "process.exit(0)"] },
    { name: "third", command: ["node", "-e", "process.exit(0)"] },
  ] };
  let spawnCalls = 0;
  const spawn = () => { spawnCalls++; return { status: spawnCalls === 1 ? 1 : 0, stdout: "", stderr: "" }; };
  const r = runGroups(plan, { spawn });
  assert.equal(r.results.length, 3);
  assert.equal(r.ok, false);
});

test("B-P3 2 群以上失敗で全群の結果行が在り失敗群が最後にまとまる（G4）", () => {
  const plan = { groups: [
    { name: "a", command: ["node", "-e", "process.exit(0)"] },
    { name: "b", command: ["node", "-e", "process.exit(1)"] },
    { name: "c", command: ["node", "-e", "process.exit(1)"] },
  ] };
  const codes = [0, 1, 1];
  let i = 0;
  const spawn = () => ({ status: codes[i++], stdout: "", stderr: "" });
  const r = runGroups(plan, { spawn });
  assert.equal(r.results.length, 3);
  const failed = r.results.filter((x) => !x.ok);
  assert.deepEqual(failed.map((x) => x.name), ["b", "c"]);
  assert.equal(r.ok, false);
});