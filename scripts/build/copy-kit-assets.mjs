// kit の JSON 資産を dist へ物として複製する（m1-t3 設計 §5.1.1）。
// vite build の lib entry は import された JSON をバンドルへ畳み込むだけで dist に置かず、m1 設計 §6.4 完了条件 (b)(d) が
// 「registry.json が pack に含まれる」「dist/contract-kit/fixtures/** が pack に含まれる」を求める ∴ JSON をファイルとして dist に置く。
// 判定 B0〜B4。純関数 listJsonFiles / planCopy / validateCopy と I/O を分離（copy-kit-assets.test.mjs が検査器自身を検査する）。
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const SRC_DIR = fileURLToPath(new URL("../../src/contract-kit", import.meta.url));
export const DIST_CONTRACT_KIT = "contract-kit";

/** B0: `src/contract-kit/` 配下の `.json` 全件を再帰で列挙する（列挙を手で持たない）。戻り値は相対 path の配列。 */
export function listJsonFiles(srcDir) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".json")) out.push(relative(srcDir, p));
    }
  };
  walk(srcDir);
  return out.sort();
}

/** B2: 複製計画。複製先は `dist/contract-kit/` に同じ相対 path。`srcDir` / `distRoot` を注入可能にして fixture で検査器自身を検査する。 */
export function planCopy(sourceFiles, { srcDir = SRC_DIR, distRoot = "dist" } = {}) {
  return sourceFiles.map((rel) => ({ rel, src: join(srcDir, rel), dest: join(distRoot, DIST_CONTRACT_KIT, rel) }));
}

/** B4: 複製後、相対 path 集合が一致し各ファイルの byte が一致することを確認する。 */
export function validateCopy(sourceFiles, { srcDir = SRC_DIR, distRoot = "dist" } = {}) {
  const failures = [];
  const actualRel = listJsonFiles(join(distRoot, DIST_CONTRACT_KIT));
  if (JSON.stringify([...sourceFiles].sort()) !== JSON.stringify(actualRel)) failures.push(`複製先の JSON 集合が複製元と一致しない`);
  for (const rel of sourceFiles) {
    const destPath = join(distRoot, DIST_CONTRACT_KIT, rel);
    if (!existsSync(destPath)) { failures.push(`複製先に無い: ${rel}`); continue; }
    const srcBytes = readFileSync(join(srcDir, rel));
    const destBytes = readFileSync(destPath);
    if (srcBytes.length !== destBytes.length || !srcBytes.equals(destBytes)) failures.push(`byte が一致しない: ${rel}`);
  }
  return { ok: failures.length === 0, failures, count: sourceFiles.length };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  if (!existsSync(join(root, "dist"))) { console.log("FAIL: dist/ が不在（build 未実行）"); process.exit(1); }
  const sourceFiles = listJsonFiles(SRC_DIR);
  if (sourceFiles.length === 0) { console.log("FAIL: 複製元の JSON が 0 件（0 件を緑にしない）"); process.exit(1); }
  for (const rel of sourceFiles) {
    const dest = join(root, "dist", DIST_CONTRACT_KIT, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(join(SRC_DIR, rel)));
  }
  const r = validateCopy(sourceFiles, { srcDir: SRC_DIR, distRoot: join(root, "dist") });
  if (!r.ok) { for (const f of r.failures) console.log(`FAIL: ${f}`); process.exit(1); }
  console.log(`copy-kit-assets: files=${r.count} dest=${relative(root, join("dist", DIST_CONTRACT_KIT))}`);
  console.log("copy-kit-assets: OK");
}