// 配布境界検査 pack-allowlist（C-DIST / HR-22 / m1-t3 設計 §5.7）: pnpm pack の tar entry 集合が allowlist ちょうどであることを検査する。
// MaplatCorePro/scripts/verify/pack-allowlist.mjs の adaptation。差分（§5.7）: (1) ALLOWED_EXACT に package/LICENSE を加える (2) argv に
// --config.verify-deps-before-run=false を加える (3) tarball の entry 一覧に加えて内容を返す extractPackDocs (4) ALLOWED_DIST_PREFIX は Pro と同じ。
// 依存 0 の ESM。判定は純関数 classifyPackEntries として export し、pack-allowlist.test.mjs が fixture で検査器自身を検査する。
//
// pnpm spawn の例外規定（m0-t2 設計 §5.4 / outer rule-0019）:
//  (1) cwd はモジュール位置から解決した package root で、package.json の存在と files 配列を assert する
//  (2) argv に --ignore-workspace を常に含める
//  (3) 実行前後で cwd から上位へ辿った pnpm-workspace.yaml を持つ全祖先の pnpm-lock.yaml md5 を測り、1 つでも変われば赤
//  (4) --pack-destination は os.tmpdir() 下の mkdtemp で、tarball をリポジトリ内に置かない（tmp dir は残置）
//  (5) 出力に cwd・argv・tarball path・ancestorWorkspaces 件数を含める
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED_EXACT = ["package/package.json", "package/README.md", "package/LICENSE"];
export const ALLOWED_DIST_PREFIX = "package/dist/";

/** 判定 A0〜A3 の純関数。 */
export function classifyPackEntries(entries) {
  const failures = [];
  const list = Array.isArray(entries) ? entries.filter((e) => typeof e === "string" && e.length > 0) : [];
  const distCount = list.filter((e) => e.startsWith(ALLOWED_DIST_PREFIX) && !e.endsWith("/")).length;
  if (list.length === 0) failures.push("entry が 0 件（pack 結果が空。0 件走査を緑にしない）");
  if (distCount === 0) failures.push(`${ALLOWED_DIST_PREFIX}** が 0 件（build 未実行）`);
  for (const must of ALLOWED_EXACT) {
    if (!list.includes(must)) failures.push(`${must} が無い`);
  }
  for (const e of list) {
    const allowed = ALLOWED_EXACT.includes(e) || e.startsWith(ALLOWED_DIST_PREFIX);
    if (!allowed) failures.push(`許可外の entry: ${e}`);
  }
  return { ok: failures.length === 0, failures, entryCount: list.length, distCount };
}

/** 判定 A6。tarball の各 entry の内容を `tar -xOf` で読み、`{ name, text, bytes }[]` を返す（決定 3 / 論点 D-2。負の検査の kind pack-tarball の入力）。 */
export function extractPackDocs(tarball, entries, { spawn = spawnSync } = {}) {
  const docs = [];
  for (const name of entries) {
    const r = spawn("tar", ["-xOf", tarball, name], { maxBuffer: 1 << 27 });
    const buf = Buffer.isBuffer(r.stdout) ? r.stdout : Buffer.from(r.stdout ?? "");
    docs.push({ name, text: buf.toString("utf8"), bytes: buf.length });
  }
  return docs;
}

function md5File(path) {
  return createHash("md5").update(readFileSync(path)).digest("hex");
}

/** dir の（dir 自身を除く）祖先のうち pnpm-workspace.yaml を持つものについて pnpm-lock.yaml の md5 を返す。 */
export function ancestorLockDigests(dir) {
  const out = [];
  let cur = resolve(dir);
  for (;;) {
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
    if (existsSync(join(cur, "pnpm-workspace.yaml"))) {
      const lock = join(cur, "pnpm-lock.yaml");
      out.push({ dir: cur, md5: existsSync(lock) ? md5File(lock) : null });
    }
  }
  return out;
}

function fail(message) {
  console.log(`FAIL: ${message}`);
  process.exit(1);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) fail(`cwd の assert に失敗: ${pkgPath} が無い`);
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (!Array.isArray(pkg.files)) fail("package.json の files が配列でない");
  if (!existsSync(join(root, "dist"))) fail("dist/ が不在（build 未実行）。pnpm pack を spawn しない");

  const before = ancestorLockDigests(root);
  const dest = mkdtempSync(join(tmpdir(), "maplat-pack-"));
  const argv = ["--ignore-workspace", "--config.verify-deps-before-run=false", "pack", "--pack-destination", dest];
  const pack = spawnSync("pnpm", argv, { cwd: root, encoding: "utf8" });
  const after = ancestorLockDigests(root);
  const drifted = before.filter((b, i) => !after[i] || after[i].dir !== b.dir || after[i].md5 !== b.md5);
  if (drifted.length > 0) fail(`祖先 workspace の pnpm-lock.yaml が変化した: ${drifted.map((d) => d.dir).join(", ")}`);
  if (pack.status !== 0) fail(`pnpm pack が exit ${pack.status}: ${pack.stderr}`);

  const tarballs = readdirSync(dest).filter((n) => n.endsWith(".tgz"));
  if (tarballs.length !== 1) fail(`tarball が 1 件でない: ${tarballs.join(", ")}`);
  const tarball = join(dest, tarballs[0]);
  const tar = spawnSync("tar", ["-tzf", tarball], { encoding: "utf8" });
  if (tar.status !== 0) fail(`tar -tzf が exit ${tar.status}: ${tar.stderr}`);
  const entries = tar.stdout.split("\n").filter(Boolean).sort();

  const docs = extractPackDocs(tarball, entries);
  const totalBytes = docs.reduce((n, d) => n + d.bytes, 0);
  if (docs.length !== entries.length || totalBytes === 0) fail(`tarball 内容の抽出が壊れている: entries=${entries.length} contents=${docs.length} bytes=${totalBytes}`);

  const r = classifyPackEntries(entries);
  console.log(`pack-allowlist: cwd=${root} argv=${JSON.stringify(["pnpm", ...argv])} tarball=${tarball} entries=${r.entryCount} contents=${docs.length} bytes=${totalBytes} dist=${r.distCount} ancestorWorkspaces=${before.length}`);
  for (const e of entries) console.log(`  ${e}`);
  if (r.ok) {
    console.log("pack-allowlist: OK");
    process.exit(0);
  }
  for (const f of r.failures) console.log(`FAIL: ${f}`);
  process.exit(1);
}