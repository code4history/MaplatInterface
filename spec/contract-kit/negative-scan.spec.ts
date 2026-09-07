// negative/scan.ts の規則 T 移送（m1-t2 設計 §5.9 の F / MT / N / S / U 行）と、kit 新規の判定 K0〜K9（m1-t3 設計 §5.4）。
// 「同じ定義・同じ fixture・同じ期待値」（C-NEG-RULE (3)）。合成 needle は xx-yy。件数の literal は AC に書かない。
import { describe, expect, test } from "vitest";
import {
  compileNeedle, checkNeedleFile, scanArtifacts, scanDocs, tokens,
} from "../../src/contract-kit/index.js";
import { compileRuleT, VARIANTS, FIXTURES as RULE_T_FIXTURES } from "../../src/contract-kit/negative/rule-t.js";
import { parseGrammar, deriveTargetSet, splitNeedle } from "../../src/contract-kit/negative/rule-t-universal.js";

const NEEDLE_LIST = [{ key: "synth", value: "xx-yy", aliases: [] }];
const doc = (text: string, id = "d") => ({ id, name: id, text });
const colorOf = (text: string) => (scanDocs([doc(text)], NEEDLE_LIST).hits.length > 0 ? "red" : "green");

// ---- F: 規則 T の fixture（m1-t2 設計 §5.9。ID / text / 期待 / 族 / 性質。probe needle-rule-t-probe.out.txt が期待値の出所） ----
const F: [string, string, string, string, string][] = [
  ["F-01", "xx-yy", "red", "素の形", "P-01"],
  ["F-02", "xxYy", "red", "大小文字・camelCase・SNAKE", "P-02"],
  ["F-03", "XX_YY", "red", "大小文字・camelCase・SNAKE", "P-02"],
  ["F-04", "Xx-Yy", "red", "大小文字・camelCase・SNAKE", "P-02"],
  ["F-05", "xxyy", "red", "連結（区切り 0 文字）", "P-03"],
  ["F-06", "xx yy", "red", "区切り 1 文字（空白）", "P-04"],
  ["F-07", "xx__yy", "red", "区切り 2 文字以上", "P-04"],
  ["F-08", "xx - yy", "red", "区切り 2 文字以上", "P-04"],
  ["F-09", "xx_ yy", "red", "区切り 2 文字以上（混在）", "P-04"],
  ["F-10", "xx‑yy", "red", "Unicode ダッシュ（U+2011）", "P-05"],
  ["F-11", "xx—yy", "red", "Unicode ダッシュ（U+2014）", "P-05"],
  ["F-12", "xx​yy", "red", "ゼロ幅スペース（U+200B）", "P-05"],
  ["F-13", "xx　yy", "red", "全角空白（U+3000。\\p{Zs}）", "P-05"],
  ["F-14", "ｘｘ－ｙｙ", "red", "NFKC 互換文字", "P-06"],
  ["F-15", "xx-yys", "red", "複数形", "P-07"],
  ["F-16", "xx-yying", "red", "語尾変化", "P-07"],
  ["F-17", "xx_yyed", "red", "語尾変化", "P-07"],
  ["F-18", "xxyyz", "red", "後置埋め込み", "P-07"],
  ["F-19", "xx-yy2", "red", "数字後置", "P-07"],
  ["F-20", "xxYyMode", "red", "後続語（大文字始まり）", "P-07"],
  ["F-21", "getXxYyz", "red", "英字前置 + camelCase 境界", "P-08"],
  ["F-22", "isXxYyEnabled", "red", "camelCase 境界（前後）", "P-08"],
  ["F-23", "2XxYy", "red", "数字前置 + camelCase 境界", "P-08"],
  ["F-24", "_xxyy", "red", "前置区切り", "P-09"],
  ["F-25", "従来のxx-yy", "red", "非 ASCII の直後", "P-09"],
  ["F-26", "xx-yyを追加", "red", "非 ASCII の直前", "P-09"],
  ["F-27", "const xxyydict", "red", "空白後の後置埋め込み", "P-07"],
  ["F-28", "constxxyydict", "green", "小文字前置（境界無し）", "P-10"],
  ["F-29", "Zxxyy", "green", "大文字前置 + 小文字続き", "P-10"],
  ["F-30", "ZXXYY", "green", "全大文字語への埋め込み", "P-10"],
  ["F-31", "xx.yy", "green", "`.` 区切り", "P-11"],
  ["F-32", "xx/yy", "green", "`/` 区切り", "P-11"],
  ["F-33", "xx:yy", "green", "`:` 区切り", "P-11"],
  ["F-34", "xx-\nyy", "green", "行跨ぎ", "P-12"],
  ["F-35", "\"xx\" + \"-yy\"", "green", "文字列連結", "P-13"],
  ["F-36", "\\u0078x-yy", "green", "文字コード表記", "P-13"],
  ["F-37", "xxzyy", "green", "別語", "P-14"],
  ["F-38", "xx", "green", "token 不足", "P-14"],
  ["F-39", "yy-xx", "green", "token 順序違い", "P-14"],
  ["F-40", "xx‒yy", "red", "Unicode ダッシュ（U+2012 figure dash）", "P-05"],
  ["F-41", "xx‌yy", "red", "ゼロ幅非接合子（U+200C）", "P-05"],
  ["F-42", "xx yy", "red", "空白分離子（U+1680 ogham space mark）", "P-05"],
  ["F-43", "xx-yyable", "red", "語尾変化（-able）", "P-07"],
  ["F-44", "xx--yy", "red", "区切り記号 2 文字以上（`--`）", "P-04"],
];
for (const [id, text, expected, family, prop] of F) {
  test(`${id} ${JSON.stringify(text)} → ${expected}（${family}。${prop}）`, () => {
    expect(colorOf(text)).toBe(expected);
  });
}
test("F 行の入力・期待値は kit 内 rule-t の FIXTURES と一致し、compileNeedle の source は規則 T と一致する（実装が設計から drift していない）", () => {
  expect(F.length).toBe(RULE_T_FIXTURES.length);
  for (let i = 0; i < F.length; i++) {
    expect(F[i][0]).toBe(RULE_T_FIXTURES[i][0] as string);
    expect(F[i][1]).toBe(RULE_T_FIXTURES[i][1] as string);
    expect(F[i][2]).toBe(RULE_T_FIXTURES[i][2] as string);
    expect(F[i][4]).toBe(RULE_T_FIXTURES[i][4] as string);
  }
  for (const v of ["xx-yy", "aaBb", "aa bb cc", "従来 aa"]) {
    const c = compileRuleT(v);
    expect(compileNeedle(v).source).toBe((c as { source: string }).source);
    expect(compileNeedle(v).flags).toBe((c as { flags: string }).flags);
  }
});

// ---- MT: 規則 T の変異感度（m1-t2 設計 §5.7.1。変異は kit 内 rule-t の VARIANTS と同じ定義） ----
const MT: [string, string, string, string[]][] = [
  ["MT-01", "P-01", "tokens-reversed", ["F-01"]],
  ["MT-02", "P-02", "case-sensitive", ["F-02", "F-03", "F-04"]],
  ["MT-03", "P-03", "joiner-at-least-one", ["F-05"]],
  ["MT-04", "P-04", "joiner-at-most-one", ["F-07", "F-08", "F-09", "F-44"]],
  ["MT-05", "P-05", "joiner-drop-pd", ["F-10", "F-11", "F-40"]],
  ["MT-06", "P-05", "joiner-drop-space-classes", ["F-13", "F-42"]],
  ["MT-07", "P-05", "joiner-drop-zero-width", ["F-12", "F-41"]],
  ["MT-08", "P-05", "joiner-enumerated-only", ["F-40", "F-41"]],
  ["MT-09", "P-06", "no-nfkc", ["F-14"]],
  ["MT-10", "P-07", "tail-no-alnum", ["F-15", "F-16", "F-17", "F-18", "F-19", "F-27", "F-43"]],
  ["MT-11", "P-07", "tail-block-able", ["F-43"]],
  ["MT-12", "P-08", "lead-no-camel", ["F-21", "F-22", "F-23"]],
  ["MT-13", "P-09", "lead-whitespace-only", ["F-24", "F-25"]],
  ["MT-14", "P-10", "lead-none", ["F-28", "F-29", "F-30"]],
  ["MT-15", "P-11", "joiner-add-punct", ["F-31", "F-32", "F-33"]],
  ["MT-16", "P-12", "unit-document", ["F-34"]],
  ["MT-17", "P-13", "predecode-js-string", ["F-35", "F-36"]],
  ["MT-18", "P-14", "first-token-only", ["F-37", "F-38", "F-39"]],
];
const TARGET_SIDE = new Set(["no-nfkc", "unit-document", "predecode-js-string"]);
for (const [id, prop, key, ownRed] of MT) {
  test(`${id} ${key}（${prop} を偽にする変異）→ 担当 fixture 行 ${ownRed.join(" ")} が赤`, () => {
    const evaluate = TARGET_SIDE.has(key)
      ? (text: string) => (compileRuleT("xx-yy", key).hit(text) ? "red" : "green")
      : (text: string) => (scanDocs([doc(text)], NEEDLE_LIST, { compile: (v) => (compileRuleT(v, key) as { regex: RegExp }).regex }).hits.length > 0 ? "red" : "green");
    const red = F.filter(([, text, expected]) => evaluate(text) !== expected).map(([fid]) => fid);
    const ownRows = F.filter(([, , , , p]) => p === prop).map(([fid]) => fid);
    const ownRedActual = red.filter((fid) => ownRows.includes(fid));
    expect(ownRedActual).toEqual(ownRed);
    expect(ownRedActual.length).toBeGreaterThanOrEqual(1);
  });
}
test("MT 表は全性質 P-01〜P-14 に変異を持ち、無変異では F 行が全件期待どおり（対照）", () => {
  const props = new Set(MT.map((m) => m[1]));
  for (const p of new Set(F.map((f) => f[4]))) expect(props.has(p)).toBe(true);
  expect(F.filter(([, text, expected]) => colorOf(text) !== expected).map(([fid]) => fid)).toEqual([]);
});

// ---- N: needle 集合の検査（N0〜N4。合成針。実 needle 正本 + 実コーパス統合は outer driver 側） ----
const SYNTH = { schema_version: 1, needles: [{ key: "synth", value: "xx-yy", aliases: ["xxYy"] }], excluded: [], needle_keys_baseline: ["synth"] };
const needleFile = (mutate?: (j: Record<string, unknown>) => void) => {
  const j = JSON.parse(JSON.stringify(SYNTH)) as Record<string, unknown>;
  mutate?.(j);
  return j;
};
test("N-P2 合成 needle ファイル（xx-yy + alias xxYy、baseline [synth]）→ 緑（N0）", () => {
  const r = checkNeedleFile(needleFile());
  expect(r.ok).toBe(true);
  expect(r.warnings).toEqual([]);
});
test("N-P4 selfmatch が実測値（正例は true、退化した compile を注入すると selfmatch=false で赤 — MIN-5）", () => {
  const ok = checkNeedleFile(needleFile());
  expect(ok.needles[0]?.selfmatch).toBe(true);
  expect(ok.needles[0]?.tokens).toBe(tokens("xx-yy").length);
  const broken = checkNeedleFile(needleFile(), { compile: () => /^$/u });
  expect(broken.ok).toBe(false);
  expect(broken.failures.some((f) => f.includes("自己一致"))).toBe(true);
});
test("N-P3 baseline に無い key を足す → 緑 + WARN「baseline を更新」（N1）", () => {
  const r = checkNeedleFile(needleFile((j) => (j.needles as unknown[]).push({ key: "extra", value: "aa-bb", aliases: [] })));
  expect(r.ok).toBe(true);
  expect(r.warnings.some((w) => w.includes("baseline") && w.includes("extra"))).toBe(true);
});
const redNeedle = (name: string, mutate: (j: Record<string, unknown>) => void, phrase: string) => test(name, () => {
  const r = checkNeedleFile(needleFile(mutate));
  expect(r.ok).toBe(false);
  expect(r.failures.some((f) => f.includes(phrase))).toBe(true);
});
redNeedle("N-N1 needles: [] → 赤（N0）", (j) => { j.needles = []; (j as { needle_keys_baseline: string[] }).needle_keys_baseline = []; }, "needles");
redNeedle("N-N2 key 重複 → 赤（N0）", (j) => { (j.needles as unknown[]).push({ key: "synth", value: "aa-bb", aliases: [] }); }, "重複");
redNeedle("N-N2 value 空文字 → 赤（N0）", (j) => { ((j.needles as unknown[])[0] as { value: string }).value = ""; }, "value");
redNeedle("N-N2 alias に空文字 → 赤（N0）", (j) => { (((j.needles as unknown[])[0] as { aliases: string[] }).aliases).push(""); }, "alias");
redNeedle("N-N3 baseline の key を needles から消す → 赤（ラチェット）", (j) => { j.needles = [{ key: "other", value: "aa-bb", aliases: [] }]; }, "ラチェット");
redNeedle("N-N4 value が区切りだけ（--。token 0）→ 赤", (j) => { ((j.needles as unknown[])[0] as { value: string }).value = "--"; }, "token");
redNeedle("N-N8 excluded の key を needles/baseline にも置く → 赤（矛盾）", (j) => { (j.excluded as unknown[]).push({ key: "synth", value: "aa-bb", reason: "r" }); }, "矛盾");
test("N-N7 excluded entry の value をコーパスに無い語にする → 走査 0 件（呼び手が「再 admit 候補」で赤にする）", () => {
  const hits = scanDocs([doc("clean content")], [{ key: "ex", value: "xx-yy", aliases: [] }]).hits;
  expect(hits.length).toBe(0);
});

// ---- K + S（純関数面）: scanArtifacts の判定 K0〜K9（m1-t3 設計 §5.4） ----
const baseArtifacts = () => [
  { kind: "interface-repo-tracked-files", status: "present" as const, paths: ["a.ts", "b.ts"] },
  { kind: "interface-repo-history", status: "present" as const, paths: ["blob:abc", "commit:def"] },
  { kind: "pack-tarball", status: "present" as const, paths: ["name:package/package.json", "content:package/package.json"] },
  { kind: "app-settings-schema", status: "pending" as const, owner_milestone: "m5" },
  { kind: "api-docs", status: "pending" as const, owner_milestone: "m8" },
];
const cleanRead = (p: string) => ({ id: p, name: p, text: "clean content\n" });

test("K-P1 pending 種別（app-settings-schema / api-docs）を owner とともに報告し、present 種別の doc 総数 > 0", () => {
  const r = scanArtifacts({ artifacts: baseArtifacts(), needles: NEEDLE_LIST, allowedExposures: [], read: cleanRead });
  expect(r.hits.length).toBe(0);
  expect(r.counts["interface-repo-tracked-files"]).toBe(2);
  expect(r.counts["pack-tarball"]).toBe(2);
  expect(r.pending.map((p) => p.kind)).toContain("app-settings-schema");
  expect(r.pending.find((p) => p.kind === "app-settings-schema")?.owner).toBe("m5");
});

test("K-N1 検査器が要求する種別を一覧から落とす → 赤（種別欠落）", () => {
  const r = scanArtifacts({ artifacts: baseArtifacts().filter((a) => a.kind !== "interface-repo-history"), needles: NEEDLE_LIST, allowedExposures: [], read: cleanRead });
  expect(r.failures.some((f) => f.includes("種別欠落") && f.includes("interface-repo-history"))).toBe(true);
});

test("K-N1 未知の種別を足す → 赤（allowlist）", () => {
  const r = scanArtifacts({ artifacts: [...baseArtifacts(), { kind: "unknown-kind", status: "present" as const, paths: ["x"] }], needles: NEEDLE_LIST, allowedExposures: [], read: cleanRead });
  expect(r.failures.some((f) => f.includes("未知の artifact 種別"))).toBe(true);
});

test("S-N2/K-N2 present 種別で paths: [] → 赤（0 件を緑にしない）", () => {
  const artifacts = baseArtifacts().map((a) => (a.kind === "interface-repo-tracked-files" ? { ...a, paths: [] } : a));
  const r = scanArtifacts({ artifacts, needles: NEEDLE_LIST, allowedExposures: [], read: cleanRead });
  expect(r.failures.some((f) => f.includes("paths が 0"))).toBe(true);
});

test("S-N27 needles: [] → 赤（0 件検査に needles が入っている）", () => {
  const r = scanArtifacts({ artifacts: baseArtifacts(), needles: [], allowedExposures: [], read: cleanRead });
  expect(r.failures.some((f) => f.includes("needles が 0 件"))).toBe(true);
});

test("S-N3/K0 needle 一致 1 件以上 → HIT 行（doc-id / 行 / key）が hits に在り赤", () => {
  const read = (p: string) => (p === "a.ts" ? { id: "tracked#0", name: "a.ts", text: "xx-yy here\n" } : cleanRead(p));
  const r = scanArtifacts({ artifacts: baseArtifacts(), needles: NEEDLE_LIST, allowedExposures: [], read });
  expect(r.hits.length).toBeGreaterThanOrEqual(1);
  expect(r.hits[0]?.doc).toBe("tracked#0");
  expect(r.hits[0]?.line).toBe(1);
  expect(r.hits[0]?.key).toBe("synth");
  expect(r.failures.some((f) => f.includes("hits="))).toBe(true);
});

test("S-P1/K2 clean な artifact 一覧 + 合成 needle → hits=0・failures=0（OK の前提）", () => {
  const r = scanArtifacts({ artifacts: baseArtifacts(), needles: NEEDLE_LIST, allowedExposures: [], read: cleanRead });
  expect(r.hits.length).toBe(0);
  expect(r.failures).toEqual([]);
});

test("K-N6 read callback が例外を投げる → 赤（握り潰さない）", () => {
  const read = (p: string) => { if (p === "a.ts") throw new Error("unreadable"); return cleanRead(p); };
  const r = scanArtifacts({ artifacts: baseArtifacts(), needles: NEEDLE_LIST, allowedExposures: [], read });
  expect(r.failures.some((f) => f.includes("例外を投げた"))).toBe(true);
});

test("K-P2 active な locations に一致した needle は allowed として報告し hits に数えない（K6）", () => {
  const read = (p: string) => (p === "content:package/package.json" ? { id: p, name: p, text: "xx-yy\n" } : cleanRead(p));
  const r = scanArtifacts({
    artifacts: baseArtifacts(), needles: NEEDLE_LIST,
    allowedExposures: [{ id: "internal-subpath", needle_key: "synth", status: "active", locations: [{ kind: "pack-tarball", paths: ["content:package/package.json"] }] }],
    read,
  });
  expect(r.hits.length).toBe(0);
  expect(r.allowed).toContain("internal-subpath");
});

test("K-N3 locations 以外の artifact に同じ needle が現れる → 赤（allowed にしない）", () => {
  const read = (p: string) => (p === "a.ts" ? { id: p, name: p, text: "xx-yy\n" } : cleanRead(p));
  const r = scanArtifacts({
    artifacts: baseArtifacts(), needles: NEEDLE_LIST,
    allowedExposures: [{ id: "internal-subpath", needle_key: "synth", status: "active", locations: [{ kind: "pack-tarball", paths: ["content:package/package.json"] }] }],
    read,
  });
  expect(r.hits.length).toBeGreaterThanOrEqual(1);
  expect(r.allowed).toEqual([]);
});

test("K-N4 allowed_exposures の needle_key が needle 正本に無い → 赤（宙に浮いた除外指定）", () => {
  const r = scanArtifacts({
    artifacts: baseArtifacts(), needles: NEEDLE_LIST,
    allowedExposures: [{ id: "internal-subpath", needle_key: "ghost", status: "active", locations: [{ kind: "pack-tarball", paths: ["x"] }] }],
    read: cleanRead,
  });
  expect(r.failures.some((f) => f.includes("needle 正本に無い"))).toBe(true);
});

test("K-N5 status: pending の除外指定の owner が完了済み → 赤（K7）", () => {
  const r = scanArtifacts({
    artifacts: baseArtifacts(), needles: NEEDLE_LIST,
    allowedExposures: [{ id: "internal-subpath", needle_key: "synth", status: "pending", owner_milestone: "m1-t2", locations: [] }],
    read: cleanRead,
  });
  expect(r.failures.some((f) => f.includes("完了済みなのに pending"))).toBe(true);
});

test("K-N7 pack-tarball の entry 名にだけ needle → 赤（entry 名も公開テキスト）", () => {
  const read = (p: string) => (p === "name:package/xx-yy.js" ? { id: p, name: p, text: "package/xx-yy.js" } : cleanRead(p));
  const artifacts = baseArtifacts().map((a) => (a.kind === "pack-tarball" ? { ...a, paths: ["name:package/xx-yy.js", "content:package/xx-yy.js"] } : a));
  const r = scanArtifacts({ artifacts, needles: NEEDLE_LIST, allowedExposures: [], read });
  expect(r.hits.length).toBeGreaterThanOrEqual(1);
});

test("K-N8 pack-tarball の許可された entry 名の内容だけに needle → 赤（内容が本来の漏洩面）", () => {
  const read = (p: string) => (p === "content:package/dist/index.js" ? { id: p, name: p, text: "// xx-yy\n" } : cleanRead(p));
  const artifacts = baseArtifacts().map((a) => (a.kind === "pack-tarball" ? { ...a, paths: ["name:package/dist/index.js", "content:package/dist/index.js"] } : a));
  const r = scanArtifacts({ artifacts, needles: NEEDLE_LIST, allowedExposures: [], read });
  expect(r.hits.length).toBeGreaterThanOrEqual(1);
});

test("K-P3/K9 pack-tarball が present なら entry + 内容の走査 doc 数 > 0。0 件なら赤", () => {
  const good = scanArtifacts({ artifacts: baseArtifacts(), needles: NEEDLE_LIST, allowedExposures: [], read: cleanRead });
  expect((good.counts["pack-tarball"] ?? 0)).toBeGreaterThan(0);
  const artifacts = baseArtifacts().map((a) => (a.kind === "pack-tarball" ? { ...a, paths: [] } : a));
  const r = scanArtifacts({ artifacts, needles: NEEDLE_LIST, allowedExposures: [], read: cleanRead });
  expect(r.failures.some((f) => f.includes("pack-tarball"))).toBe(true);
});

// ---- U: 規則 T の全称主張（m1-t2 設計 §5.9 U 行。J* は設計 §5.7.2 から導出し、lead / splitSource は定義 4 / 5 の literal） ----
const DESIGN_INPUTS = {
  specs: [
    { id: "J-1", spec: "U+002D U+005F" },
    { id: "J-2", spec: "\\p{Pd}" },
    { id: "J-3", spec: "\\s" },
    { id: "J-4", spec: "\\p{Zs}" },
    { id: "J-5", spec: "U+200B〜U+200D U+2060 U+FEFF" },
  ],
  lead: "(?:(?<![A-Za-z0-9])|(?<=[a-z0-9])(?=[A-Z]))",
  splitSource: "\\r?\\n",
};
const MAX_CP = 0x10ffff;
const isSurrogate = (cp: number) => cp >= 0xd800 && cp <= 0xdfff;
const hex = (cp: number) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
type UniversalShape = { J: Set<number>; perComponent: Record<string, number>; lead: string; splitRe: RegExp };
let universal: UniversalShape | null = null;
const getUniversal = (): UniversalShape => {
  if (!universal) {
    const { set, perComponent } = deriveTargetSet(DESIGN_INPUTS.specs) as { set: Set<number>; perComponent: Record<string, number> };
    for (const n of Object.values(perComponent)) expect(n).toBeGreaterThanOrEqual(1);
    universal = { J: set, perComponent, lead: DESIGN_INPUTS.lead, splitRe: new RegExp(DESIGN_INPUTS.splitSource) };
  }
  return universal;
};
const redSet = (texts: [string, string][]) => {
  const red = new Set<string>();
  const CHUNK = 65536;
  for (let i = 0; i < texts.length; i += CHUNK) {
    const docs = texts.slice(i, i + CHUNK).map(([id, text]) => ({ id, name: id, text }));
    for (const h of scanDocs(docs, NEEDLE_LIST).hits) red.add(h.doc);
  }
  return red;
};
let observedTexts: [string, string][] = [];
test("U-01 class-positive: J* の各 cp について xx<cp>yy が red（行分割で 2 行になる cp は除外し件数を印字）", () => {
  const { J, splitRe } = getUniversal();
  const texts: [string, string][] = [];
  const excluded: number[] = [];
  for (const cp of J) { const t = `xx${String.fromCodePoint(cp)}yy`; if (t.split(splitRe).length > 1) { excluded.push(cp); continue; } texts.push([`U-01:${hex(cp)}`, t]); }
  const red = redSet(texts);
  const green = texts.filter(([id]) => !red.has(id)).map(([id]) => id);
  for (const t of texts) observedTexts.push(t);
  expect(green).toEqual([]);
  expect(red.size).toBeGreaterThanOrEqual(1);
});
test("U-02 class-complement: J* に無い全 cp について xx<cp>yy が green（NFKC で J* の字へ写る cp は判定から除外）", () => {
  const { J } = getUniversal();
  const needleChars = new Set(["x", "y", "X", "Y"]);
  const texts: [string, string][] = [];
  for (let cp = 0; cp <= MAX_CP; cp++) {
    if (isSurrogate(cp) || J.has(cp)) continue;
    const ch = String.fromCodePoint(cp);
    if ([...ch.normalize("NFKC")].some((c) => J.has(c.codePointAt(0) as number) || needleChars.has(c))) continue;
    texts.push([`U-02:${hex(cp)}`, `xx${ch}yy`]);
  }
  const red = redSet(texts);
  for (const t of texts) observedTexts.push(t);
  expect(red.size).toBe(0);
  expect(texts.length - red.size).toBeGreaterThanOrEqual(1);
});
test("U-03 grammar: compileNeedle('xx-yy').source が文法 L tok J tok に一致し、J クラスの受理集合 = J*（extra 0 / missing 0）", () => {
  const { J, lead } = getUniversal();
  const re = compileNeedle("xx-yy");
  expect(re.flags).toBe("u");
  const g = parseGrammar(re.source, { lead, tokens: splitNeedle("xx-yy") });
  expect(g.ok).toBe(true);
  const classRe = new RegExp(`^${(g as { joinerClass: string }).joinerClass.slice(0, -1)}$`, "u");
  let extra = 0, missing = 0;
  for (let cp = 0; cp <= MAX_CP; cp++) {
    if (isSurrogate(cp)) continue;
    const inClass = classRe.test(String.fromCodePoint(cp));
    if (inClass && !J.has(cp)) extra++;
    else if (!inClass && J.has(cp)) missing++;
  }
  expect(extra).toBe(0);
  expect(missing).toBe(0);
  const g3 = parseGrammar(compileNeedle("xx-yy-zz").source, { lead, tokens: splitNeedle("xx-yy-zz") });
  expect(g3.ok).toBe(true);
});
test("U-04 suffix-universal: 全 cp について xx-yy<cp> が red（NFKC で needle 末尾と合成する結合文字は除外）", () => {
  const texts: [string, string][] = [];
  for (let cp = 0; cp <= MAX_CP; cp++) {
    if (isSurrogate(cp)) continue;
    const t = `xx-yy${String.fromCodePoint(cp)}`;
    if (!t.normalize("NFKC").startsWith("xx-yy")) continue;
    texts.push([`U-04:${hex(cp)}`, t]);
  }
  const red = redSet(texts);
  const green = texts.filter(([id]) => !red.has(id)).map(([id]) => id);
  for (const t of texts) observedTexts.push(t);
  expect(green).toEqual([]);
  expect(red.size).toBeGreaterThanOrEqual(1);
});
test("U-05 hit-equals-regex: 生成コーパス全体で scanDocs の判定 ≡（行分割 → NFKC → regex.test）。mismatch 0", () => {
  const { splitRe } = getUniversal();
  const re = compileNeedle("xx-yy");
  const oracle = (text: string) => text.split(splitRe).some((l) => re.test(l.normalize("NFKC")));
  const red = redSet(observedTexts);
  let mismatch = 0;
  for (const [id, text] of observedTexts) if (oracle(text) !== red.has(id)) mismatch++;
  expect(mismatch).toBe(0);
  expect(observedTexts.length).toBeGreaterThan(1_000_000);
});