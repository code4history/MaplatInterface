// 負の検査の純関数面（m1-t3 設計 §5.4。）
// m1-t2 の暫定検査器 `scripts/maplatcore-pro-launch/verify-public-surface.mjs` の純関数を「同じ定義・同じ fixture・同じ期待値」で
// 移送し（狭めない — C-NEG-RULE (3)）、その上に kit 新規の判定 K0〜K9 を `scanArtifacts` として置く。
// runtime 依存 0・test runner 非依存。I/O は持たない（`read(path)` は driver が供給する）。

import type { AllowedExposure, NeedleEntry, ScanArtifact, ScanDoc } from "../types.js";

export const SCHEMA_VERSION = 1;
/** 連結子 J（m1-t2 設計 §5.7 定義 3。u フラグ） */
export const JOINER = "[-_\\s\\p{Pd}\\p{Zs}\\u200B-\\u200D\\u2060\\uFEFF]*";
/** 先頭境界 L（m1-t2 設計 §5.7 定義 4。末尾境界なし） */
export const LEAD = "(?:(?<![A-Za-z0-9])|(?<=[a-z0-9])(?=[A-Z]))";

const escapeRegExp = (ch: string): string => ch.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** m1-t2 設計 §5.7 定義 1: needle の token 列（NFKC → [-_\s]+ 分割 → camelCase 境界分割 → 非空） */
export function tokens(value: string): string[] {
  return String(value).normalize("NFKC").split(/[-_\s]+/).flatMap((w) => w.split(/(?<=[a-z0-9])(?=[A-Z])/)).filter(Boolean);
}
/** m1-t2 設計 §5.7 定義 2: token の各字 — ASCII 英字は大小文字クラス、それ以外は regex escape */
const tokenPattern = (tok: string): string => [...tok].map((ch) => (/[a-z]/i.test(ch) ? `[${ch.toLowerCase()}${ch.toUpperCase()}]` : escapeRegExp(ch))).join("");

/** m1-t2 設計 §5.7 定義 1〜4（採用規則 T）。token 数 0 は例外（checkNeedleFile が登録時に赤にする） */
export function compileNeedle(value: string): RegExp {
  const toks = tokens(value);
  if (toks.length === 0) throw new Error(`token 数 0 の needle（区切りだけの値は正規表現が先頭境界だけに退化する）`);
  return new RegExp(`${LEAD}${toks.map(tokenPattern).join(JOINER)}`, "u");
}

/**
 * m1-t2 設計 §5.7 定義 5〜6: docs を行走査する。走査対象側の正規化は NFKC のみ。
 * @returns hits（doc / name / line / key / match）と走査 doc 数
 */
export function scanDocs(docs: ScanDoc[], needles: NeedleEntry[], opts: { compile?: (v: string) => RegExp } = {}): { hits: { doc: string; name: string; line: number; key: string; match: string }[]; docs: number } {
  const compile = opts.compile ?? compileNeedle;
  const compiled = needles.map((n) => ({ key: n.key, regexes: [n.value, ...(n.aliases ?? [])].map((v) => compile(v)) }));
  const hits: { doc: string; name: string; line: number; key: string; match: string }[] = [];
  for (const d of docs) {
    const lines = d.text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].normalize("NFKC");
      for (const n of compiled) {
        const re = n.regexes.find((r) => r.test(line));
        if (re) hits.push({ doc: d.id, name: d.name, line: i + 1, key: n.key, match: re.exec(line)?.[0] ?? "" });
      }
    }
  }
  return { hits, docs: docs.length };
}

/** checkNeedleFile の戻り値（m1-t2 §5.6 N0/N1/N2/N4 + selfmatch の実測値。MIN-5 の是正） */
export interface NeedleFileCheck {
  ok: boolean;
  failures: string[];
  warnings: string[];
  /** needle ごとの実測値（tokens / aliases / selfmatch）。selfmatch は value それ自身が規則 T で自分に当たるか。 */
  needles: { key: string; tokens: number; aliases: number; selfmatch: boolean }[];
}

/** needle 正本の形の検査（N0/N1/N2/N4）。selfmatch は実測値（N-P4 / K5）。コーパス走査の実測は呼び手が scanDocs で行う。 */
export function checkNeedleFile(json: unknown, opts: { compile?: (v: string) => RegExp } = {}): NeedleFileCheck {
  const compile = opts.compile ?? compileNeedle;
  const f: string[] = [];
  const w: string[] = [];
  const j = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  if (j.schema_version !== SCHEMA_VERSION) f.push(`schema_version が ${SCHEMA_VERSION} でない: ${JSON.stringify(j.schema_version)}`);
  const needles = (Array.isArray(j.needles) ? j.needles : []) as Record<string, unknown>[];
  if (needles.length === 0) f.push("needles が 1 件も無い（0 件を緑にしない）");
  const keys = new Set<string>();
  const measured: NeedleFileCheck["needles"] = [];
  const checkTokens = (label: string, v: string): number => {
    let n = 0;
    try { n = tokens(v).length; } catch { n = 0; }
    if (n < 1) f.push(`${label} の token 数が 0（区切りだけの値。正規表現の退化を塞ぐ）`);
    return n;
  };
  for (const n of needles) {
    const key = String(n?.key ?? "");
    if (!/^[a-z0-9_]+$/.test(key)) f.push(`needle の key が /^[a-z0-9_]+$/ でない: ${JSON.stringify(n?.key)}`);
    if (keys.has(key)) f.push(`needle の key が重複: ${key}`);
    keys.add(key);
    if (typeof n?.value !== "string" || n.value.length === 0) { f.push(`needle ${key} の value が非空文字列でない`); continue; }
    if (!Array.isArray(n.aliases)) { f.push(`needle ${key} の aliases が配列でない`); continue; }
    if (n.aliases.some((a) => typeof a !== "string" || a.length === 0)) f.push(`needle ${key} の alias に空文字列（または非文字列）が在る`);
    const vals = [n.value as string, ...(n.aliases as string[]).filter((a) => typeof a === "string" && a.length > 0)];
    let valueSelfmatch = false;
    for (let i = 0; i < vals.length; i++) {
      const label = i === 0 ? `needle ${key} の value` : `needle ${key} の alias${i}`;
      if (checkTokens(label, vals[i]) < 1) continue;
      // N2: 正例の自己一致
      let self = false;
      try { self = scanDocs([{ id: "self", name: "self", text: vals[i] }], [{ key, value: vals[i], aliases: [] }], { compile }).hits.length === 1; } catch { self = false; }
      if (!self) f.push(`${label} が規則 T で自分に当たらない（正例の自己一致が破れた）`);
      if (i === 0) valueSelfmatch = self;
    }
    measured.push({ key, tokens: tokens(n.value as string).length, aliases: (n.aliases as string[]).length, selfmatch: valueSelfmatch });
  }
  // N1: ラチェット
  const baseline = (Array.isArray(j.needle_keys_baseline) ? j.needle_keys_baseline : []) as string[];
  if (!Array.isArray(j.needle_keys_baseline)) f.push("needle_keys_baseline が配列でない");
  for (const b of baseline) if (!keys.has(b)) f.push(`ラチェット: baseline の key ${b} が needles に無い（key を消すには baseline の明示更新が要る）`);
  for (const k of keys) if (!baseline.includes(k)) w.push(`baseline を更新せよ: needles の key ${k} が needle_keys_baseline に無い`);
  // N4: excluded の形
  const excluded = (Array.isArray(j.excluded) ? j.excluded : []) as Record<string, unknown>[];
  if (j.excluded !== undefined && !Array.isArray(j.excluded)) f.push("excluded が配列でない");
  for (const e of excluded) {
    const key = String(e?.key ?? "");
    if (!/^[a-z0-9_]+$/.test(key)) f.push(`excluded の key が /^[a-z0-9_]+$/ でない: ${JSON.stringify(e?.key)}`);
    if (keys.has(key) || baseline.includes(key)) f.push(`excluded の key ${key} が needles / needle_keys_baseline にも在る（矛盾）`);
    if (typeof e?.value !== "string" || e.value.length === 0) f.push(`excluded ${key} の value が非空文字列でない`);
    if (typeof e?.reason !== "string" || e.reason.trim().length === 0) f.push(`excluded ${key} の reason が空`);
  }
  return { ok: f.length === 0, failures: f, warnings: w, needles: measured };
}

// ---- kit 新規: scanArtifacts（K0〜K9） ----

/** 検査器が要求する種別（K3。一覧の allowlist）。欠落は赤、未知は赤。 */
export const KNOWN_KINDS = [
  "interface-repo-tracked-files",
  "interface-repo-history",
  "public-samples-and-type-tests",
  "root-export-and-browser-global",
  "public-declaration",
  "pack-tarball",
  "app-settings-schema",
  "api-docs",
] as const;

/** 走査が必ず在ることを要求する `present` 種別（K3。これが 1 つでも欠ければ種別欠落 = 赤）。 */
export const REQUIRED_KINDS = ["interface-repo-tracked-files", "interface-repo-history", "pack-tarball"] as const;

export interface ScanReport {
  hits: { doc: string; name: string; line: number; key: string; match: string }[];
  /** 種別ごとの走査 doc 件数（present 種別のみ）。 */
  counts: Record<string, number>;
  failures: string[];
  warnings: string[];
  /** `pending` 種別（`{ kind, owner }`）。 */
  pending: { kind: string; owner: string }[];
  /** `allowed` として報告した除外指定の id。 */
  allowed: string[];
  needles: { key: string; tokens: number; aliases: number; selfmatch: boolean }[];
}

const KNOWN_STATUS = ["present", "pending"] as const;

/** owner_milestone の「完了済み」判定（K-N5）。milestone が欠落しているものは完了とみなさない（判別不能は赤にしない）。 */
const OWNER_COMPLETED = /^(m0|m1|m2)-/;

/**
 * kit の負の検査（m1-t3 設計 §5.4 K0〜K9）。I/O を持たない。`read(path)` は driver 供給。
 * `artifacts`: outer の public-surface-artifacts.json。`allowedExposures`: 除外指定（active の locations に一致した needle を allowed にする）。
 */
export function scanArtifacts(input: { artifacts: ScanArtifact[]; needles: NeedleEntry[]; allowedExposures: AllowedExposure[]; read: (path: string) => ScanDoc }): ScanReport {
  const { artifacts, needles, allowedExposures, read } = input;
  const failures: string[] = [];
  const warnings: string[] = [];
  const pending: { kind: string; owner: string }[] = [];
  const allowed: string[] = [];
  const counts: Record<string, number> = {};
  const hits: { doc: string; name: string; line: number; key: string; match: string }[] = [];

  // K1: needles 0 件 → 赤
  if (needles.length === 0) failures.push("needles が 0 件（0 件を緑にしない）");

  // K3: 種別の allowlist（未知 kind → 赤／required 欠落 → 赤）
  const kinds = new Set(artifacts.map((a) => a.kind));
  for (const a of artifacts) {
    if (!(KNOWN_KINDS as readonly string[]).includes(a.kind)) failures.push(`未知の artifact 種別: ${a.kind}`);
    if (!KNOWN_STATUS.includes(a.status)) failures.push(`artifact ${a.kind} の status が present|pending でない: ${JSON.stringify(a.status)}`);
  }
  for (const rk of REQUIRED_KINDS) if (!kinds.has(rk)) failures.push(`種別欠落: ${rk} が artifact 一覧に無い`);

  // allowed_exposures の needle_key が needle 正本に在るか（K-N4）
  const needleKeys = new Set(needles.map((n) => n.key));
  // active な除外指定の locations を (kind, path) 集合へ展開
  const activeLocations = new Map<string, Set<string>>(); // needle_key -> Set(kind + "\u0000" + path)
  for (const ex of allowedExposures) {
    if (ex.status === "active") {
      if (!needleKeys.has(ex.needle_key)) failures.push(`除外指定 ${ex.id} の needle_key ${ex.needle_key} が needle 正本に無い（宙に浮いた除外指定）`);
      const loc = activeLocations.get(ex.needle_key) ?? new Set<string>();
      for (const l of ex.locations ?? []) for (const p of l.paths ?? []) loc.add(`${l.kind}\u0000${p}`);
      activeLocations.set(ex.needle_key, loc);
    } else {
      // K7: pending な除外指定は owner とともに報告。owner 完了済みなら赤。
      if (ex.owner_milestone && OWNER_COMPLETED.test(ex.owner_milestone)) failures.push(`除外指定 ${ex.id} の owner_milestone ${ex.owner_milestone} が完了済みなのに pending のまま`);
      pending.push({ kind: `allowed_exposure:${ex.id}`, owner: ex.owner_milestone ?? "(owner 未指定)" });
    }
  }

  // present 種別の走査
  let presentDocCount = 0;
  for (const a of artifacts) {
    if (a.status !== "present") {
      if (a.status === "pending") pending.push({ kind: a.kind, owner: a.owner_milestone ?? "(owner 未指定)" });
      continue;
    }
    const aPaths = a.paths ?? [];
    if (aPaths.length === 0) { failures.push(`present 種別 ${a.kind} の paths が 0（0 件を緑にしない）`); continue; }
    // pack-tarball 走査は entry 名 + 内容の 2 面（K9）。内容 doc = 各 entry の `name + "\n" + 内容` を同じ rule で読む driver 側が供給する経路。
    // ここでは driver が paths（entry 名）と内容 path（entry.index / entry.constent 等）の両方を供給してよい。内容 doc 0 → 赤。
    const docs: { path: string; kind: string; doc: ScanDoc }[] = [];
    for (const p of aPaths) {
      let doc: ScanDoc;
      try { doc = read(p); } catch (e) { failures.push(`read(${a.kind}:${p}) が例外を投げた（握り潰さない）: ${(e as Error).message}`); continue; }
      if (doc && typeof doc.text === "string") { if (doc.text.length === 0) warnings.push(`doc が空: ${a.kind}:${p}`); docs.push({ path: p, kind: a.kind, doc }); }
    }
    // K9: pack-tarball の内容面（driver が内容 doc を paths に含めて供給する）— 内容 doc は `entries` と `entry-contents` の 2 群で供給される前提
    counts[a.kind] = (counts[a.kind] ?? 0) + docs.length;
    presentDocCount += docs.length;
    for (const d of docs) {
      const sub = scanDocs([d.doc], needles);
      for (const h of sub.hits) {
        const locKey = `${d.kind}\u0000${d.path}`;
        const loc = activeLocations.get(h.key);
        if (loc && loc.has(locKey)) {
          const ex = allowedExposures.find((e) => e.needle_key === h.key);
          allowed.push(ex?.id ?? h.key);
          continue;
        }
        hits.push(h);
      }
    }
  }

  // K1: present 種別の走査 doc 総数 0 → 赤
  if (presentDocCount === 0) failures.push("present 種別の走査 doc 総数が 0（0 件を緑にしない）");
  // K9: pack-tarball の内容面が entry 面と同じ件数であることを呼び手は validate。ここでは present だが doc 0 の pack-tarball を赤に。
  const packArtifact = artifacts.find((a) => a.kind === "pack-tarball");
  if (packArtifact && packArtifact.status === "present" && (counts["pack-tarball"] ?? 0) === 0) failures.push("pack-tarball の走査 doc が 0（tarball の entry 名と内容を走査する。0 件を緑にしない）");

  // K0: needle 一致 → 赤（ここでは failures に集約せず hits を返す。判定は driver / 呼び手）
  if (hits.length > 0) failures.push(`hits=${hits.length}（needle 一致。push しない）`);

  const needleMeasured = needles.map((n) => {
    let self = true;
    try { self = scanDocs([{ id: "self", name: "self", text: n.value }], [{ key: n.key, value: n.value, aliases: [] }]).hits.length === 1; } catch { self = false; }
    return { key: n.key, tokens: tokens(n.value).length, aliases: n.aliases.length, selfmatch: self };
  });

  return { hits, counts, failures, warnings, pending, allowed, needles: needleMeasured };
}