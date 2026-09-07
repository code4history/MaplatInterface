// 集約 runner（m1-t3 設計 §5.11 / §5.11.1）。`verify` / `test` を 1 本へ結線し、`&&` 連鎖を廃す（設計レビュー MAJ-5）。
// 群一覧は `groups.json`（データ）が正本。件数・名前を code に literal で持たない。判定 G0〜G4 は純関数 planGroups / runGroups。
import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** 群 entry の正規化。`command`（argv）または `file`（node --test で走る .test.mjs）を持つ。 */
export function normalizeGroup(g) {
  const name = g && typeof g.name === "string" && g.name.length > 0 ? g.name : null;
  let command = null;
  let file = null;
  if (Array.isArray(g?.command) && g.command.length > 0) command = g.command;
  else if (typeof g?.file === "string" && g.file.length > 0) { file = g.file; command = ["node", "--test", g.file]; }
  return { name, command, file };
}

/** G0 / G1 / G3: 一覧と実体の乖離を検出する。`listTestFiles()` は実在する .test.mjs の相対 path を返す注入。 */
export function planGroups(spec, mode, { listTestFiles = () => [] } = {}) {
  const failures = [];
  const list = spec && Array.isArray(spec[mode]) ? spec[mode] : [];
  if (list.length === 0) failures.push(`群 ${mode} が 0 件（0 件を緑にしない）`);
  const groups = [];
  const seen = new Set();
  for (const g of list) {
    const n = normalizeGroup(g);
    if (!n.name) { failures.push("群エントリに name が無い"); continue; }
    if (!n.command) { failures.push(`群 ${n.name} に command / file の定義が無い`); continue; }
    if (seen.has(n.name)) failures.push(`群名が重複: ${n.name}`);
    seen.add(n.name);
    groups.push(n);
  }
  if (mode === "test" && failures.length === 0) {
    // G1: test 群の明示列挙（file を持つ群）と実ファイルの差集合が 0
    const listed = groups.filter((x) => x.file).map((x) => x.file).sort();
    const real = [...listTestFiles()].sort();
    const onlyListed = listed.filter((f) => !real.includes(f));
    const onlyReal = real.filter((f) => !listed.includes(f));
    if (onlyListed.length > 0) failures.push(`test 群に在るが実在しない .test.mjs: ${onlyListed.join(", ")}`);
    if (onlyReal.length > 0) failures.push(`実在するのに test 群に無い .test.mjs: ${onlyReal.join(", ")}`);
  }
  return { groups, failures };
}

/** G2 / G4: 全群を順に実行（先頭群が失敗しても後続を止めない）。戻り値に全群の結果を含む。 */
export function runGroups(plan, { spawn = spawnSync } = {}) {
  const results = [];
  for (const g of plan.groups) {
    const r = spawn(g.command[0], g.command.slice(1));
    results.push({ name: g.name, ok: r.status === 0, code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` });
  }
  return { results, ok: results.every((r) => r.ok) };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const mode = process.argv[2];
  if (mode !== "verify" && mode !== "test") { console.log("FAIL: mode は verify | test"); process.exit(2); }
  const spec = JSON.parse(readFileSync(join(root, "scripts/verify/groups.json"), "utf8"));
  const listTestFiles = () => ["verify", "build"].flatMap((d) =>
    readdirSync(join(root, "scripts", d)).filter((f) => f.endsWith(".test.mjs")).map((f) => `scripts/${d}/${f}`));
  const plan = planGroups(spec, mode, { listTestFiles });
  if (plan.failures.length > 0) { for (const f of plan.failures) console.log(`FAIL: ${f}`); process.exit(1); }
  const { results, ok } = runGroups(plan, { spawn: (cmd, args) => spawnSync(cmd, args, { cwd: root, stdio: "inherit" }) });
  // 全群の結果行 → 失敗群を最後にまとめる（G4）
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "[ok]" : "[fail]"} ${r.name}`);
  if (failed.length > 0) {
    console.log("--- failed groups ---");
    for (const r of failed) console.log(`FAILED: ${r.name} (exit ${r.code})`);
  }
  process.exit(ok ? 0 : 1);
}