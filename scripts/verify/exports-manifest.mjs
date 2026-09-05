// exports manifest 検査（m0-t2 設計 §5.3）: package.json の exports の key 集合が {".", "./core"} に等しく、
// 各 key の types / import が指すファイルが build 後の dist/ に実在することを検査する。
// 依存 0 の ESM。判定は純関数 checkExports として export し、exports-manifest.test.mjs が fixture で検査器自身を検査する。
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const EXPECTED_KEYS = [".", "./core"];
export const CONDITIONS = ["types", "import"];

/**
 * @param {object} pkg package.json の内容
 * @param {(relPath: string) => boolean} existsFn 相対パスの実在判定
 * @returns {{ ok: boolean, failures: string[], keys: number, files: number }}
 */
export function checkExports(pkg, existsFn) {
  const failures = [];
  const exportsField = pkg && typeof pkg.exports === "object" && pkg.exports !== null ? pkg.exports : null;
  if (!exportsField) {
    return { ok: false, failures: ["package.json に exports が無い（または object でない）"], keys: 0, files: 0 };
  }
  const keys = Object.keys(exportsField);
  for (const k of EXPECTED_KEYS) if (!keys.includes(k)) failures.push(`exports に key "${k}" が無い`);
  for (const k of keys) if (!EXPECTED_KEYS.includes(k)) failures.push(`exports に余分な key "${k}" がある`);

  let files = 0;
  for (const k of keys) {
    const value = exportsField[k];
    if (!value || typeof value !== "object") {
      failures.push(`exports["${k}"] が条件 object（types / import）でない`);
      continue;
    }
    for (const cond of CONDITIONS) {
      if (typeof value[cond] !== "string") {
        failures.push(`exports["${k}"] に条件 "${cond}" が無い`);
        continue;
      }
      if (existsFn(value[cond])) files += 1;
      else failures.push(`exports["${k}"].${cond} が指す ${value[cond]} が dist に無い`);
    }
  }
  return { ok: failures.length === 0, failures, keys: keys.length, files };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  if (!existsSync(join(root, "dist"))) {
    console.log("FAIL: dist/ が不在（build 未実行）");
    process.exit(1);
  }
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const r = checkExports(pkg, (rel) => existsSync(join(root, rel)));
  console.log(`exports-manifest: keys=${r.keys} files=${r.files}`);
  if (r.ok) {
    console.log("exports-manifest: OK");
    process.exit(0);
  }
  for (const f of r.failures) console.log(`FAIL: ${f}`);
  process.exit(1);
}
