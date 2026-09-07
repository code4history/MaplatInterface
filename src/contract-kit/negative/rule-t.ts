/* eslint-disable */
// @ts-nocheck — m1-t2 design evidence rule-t.mjs の忠実な移植（m1-t3 設計 §5.4「同じ定義・同じ fixture・同じ期待値」）。
// 型注釈を付さない動的コードのため @ts-nocheck。定義・変異・fixture を変えない。
// m1-t2 タスク設計 v1.1（1 巡目レビュー MAJ-1 の是正）: 採用規則 T の**純関数モジュール**。
// needle-rule-t-probe.mjs（§2.3 の実測）と design-self-check.mjs [7]（性質を偽にする変異が担当 fixture を赤にすることの照合）が
// 同じ定義を import する。規則 T の定義は設計 §5.7 が正本（差分が出たら設計側が正）。
//
//   compileRuleT(value, variantKey?) → { source, flags, hit(text) }
//     variantKey を省けば採用規則 T。VARIANTS の key を渡せば「その性質を意図的に偽にした変異」（設計 §5.7.1 の MT 表と 1:1）。
//   FIXTURES: 設計 §5.9 の F 行（ID / text / 期待 / 族 / 性質）。probe と self-check の唯一の入力（設計の表と ID・期待値を照合する）。
//   VARIANTS: 変異 key → 規則のどこをどう変えるか（設計 §5.7.1 の「変異」列と同じ語で書く）。
//
// 変異は規則の**部品**（needle の token 化 / token 字 / 連結子 J / 先頭境界 L / 末尾境界 / 走査対象の正規化 / 走査単位 / 前処理）
// への差し替えとして表す。fixture 集合の要素を見て作った変異ではない（列挙型の変異 `joiner-enumerated-only` だけは
// レビュアーの独立変異をそのまま持つ — その変異が緑のまま通る fixture 集合は PROP-4a を満たさない）。

const esc = (ch) => ch.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");

export const JOINER_T = "[-_\\s\\p{Pd}\\p{Zs}\\u200B-\\u200D\\u2060\\uFEFF]*";
export const LEAD_T = "(?:(?<![A-Za-z0-9])|(?<=[a-z0-9])(?=[A-Z]))";

// 規則 T の部品（採用形）
const BASE = {
  splitNeedle: (value) => value.normalize("NFKC").split(/[-_\s]+/).flatMap((w) => w.split(/(?<=[a-z0-9])(?=[A-Z])/)).filter(Boolean),
  tokenChar: (ch) => (/[a-z]/i.test(ch) ? `[${ch.toLowerCase()}${ch.toUpperCase()}]` : esc(ch)),
  joiner: JOINER_T,
  lead: LEAD_T,
  tail: "",
  normalizeTarget: (line) => line.normalize("NFKC"),
  splitTarget: (text) => text.split(/\r?\n/),
  predecode: (text) => text,
  pickTokens: (toks) => toks,
};

export function tokens(value) { return BASE.splitNeedle(value); }

// 変異表（設計 §5.7.1 MT 行の「変異 key」列と 1:1。desc は設計の「変異」列と同じ語）
export const VARIANTS = {
  "tokens-reversed":          { prop: "P-01", desc: "needle の token 列を逆順にする（`xx-yy` を `yy…xx` として組む）", apply: (p) => ({ ...p, pickTokens: (t) => [...t].reverse() }) },
  "case-sensitive":           { prop: "P-02", desc: "token の英字を大小文字クラスにせず needle の字そのまま（小文字）にする", apply: (p) => ({ ...p, tokenChar: (ch) => esc(ch) }) },
  "joiner-at-least-one":      { prop: "P-03", desc: "連結子 J の量指定子 `*` を `+`（1 文字以上必須）にする", apply: (p) => ({ ...p, joiner: p.joiner.replace(/\*$/, "+") }) },
  "joiner-at-most-one":       { prop: "P-04", desc: "連結子 J の量指定子 `*` を `?`（高々 1 文字）にする", apply: (p) => ({ ...p, joiner: p.joiner.replace(/\*$/, "?") }) },
  "joiner-drop-pd":           { prop: "P-05", desc: "連結子 J から `\\p{Pd}`（Unicode ダッシュ）を外す", apply: (p) => ({ ...p, joiner: p.joiner.replace("\\p{Pd}", "") }) },
  "joiner-drop-space-classes":{ prop: "P-05", desc: "連結子 J から `\\s` と `\\p{Zs}`（空白分離子）を外す", apply: (p) => ({ ...p, joiner: p.joiner.replace("\\s", "").replace("\\p{Zs}", "") }) },
  "joiner-drop-zero-width":   { prop: "P-05", desc: "連結子 J からゼロ幅（U+200B〜U+200D / U+2060 / U+FEFF）を外す", apply: (p) => ({ ...p, joiner: p.joiner.replace("\\u200B-\\u200D\\u2060\\uFEFF", "") }) },
  "joiner-enumerated-only":   { prop: "P-05", desc: "連結子 J を、v1.0 の fixture に現れた code point の列挙 `[-_\\s\\u2010\\u2014\\u200B]*` へ狭める（レビュアーの独立変異）", apply: (p) => ({ ...p, joiner: "[-_\\s\\u2010\\u2014\\u200B]*" }) },
  "no-nfkc":                  { prop: "P-06", desc: "走査対象側の NFKC 正規化を外す", apply: (p) => ({ ...p, normalizeTarget: (l) => l }) },
  "tail-no-alnum":            { prop: "P-07", desc: "末尾境界 `(?![a-z0-9])`（v1.0 §4.5 論点 A (ii) の末尾境界）を置く", apply: (p) => ({ ...p, tail: "(?![a-z0-9])" }) },
  "tail-block-able":          { prop: "P-07", desc: "末尾境界 `(?!able)` を置き `-able` だけを捕えなくする（レビュアーの独立変異）", apply: (p) => ({ ...p, tail: "(?!able)" }) },
  "lead-no-camel":            { prop: "P-08", desc: "先頭境界 L から camelCase 境界を外し `(?<![A-Za-z0-9])` だけにする（v1.0 §4.5 論点 A (iii) の先頭境界）", apply: (p) => ({ ...p, lead: "(?<![A-Za-z0-9])" }) },
  "lead-whitespace-only":     { prop: "P-09", desc: "先頭境界 L の「非英数の直後」を「空白の直後または行頭」`(?<!\\S)` へ狭める", apply: (p) => ({ ...p, lead: "(?:(?<!\\S)|(?<=[a-z0-9])(?=[A-Z]))" }) },
  "lead-none":                { prop: "P-10", desc: "先頭境界 L を撤去する（境界無し）", apply: (p) => ({ ...p, lead: "" }) },
  "joiner-add-punct":         { prop: "P-11", desc: "連結子 J に `.` `/` `:` を加える", apply: (p) => ({ ...p, joiner: p.joiner.replace("[-_", "[-_./:") }) },
  "unit-document":            { prop: "P-12", desc: "走査単位を行から文書全体にする（行分割しない）", apply: (p) => ({ ...p, splitTarget: (text) => [text] }) },
  "predecode-js-string":      { prop: "P-13", desc: "走査前に JS 文字列の連結 `\" + \"` を除き `\\uXXXX` 表記を復号する前処理を置く", apply: (p) => ({ ...p, predecode: (text) => text.replace(/"\s*\+\s*"/g, "").replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16))) }) },
  "first-token-only":         { prop: "P-14", desc: "needle の先頭 token だけで正規表現を組む（後続 token を落とす）", apply: (p) => ({ ...p, pickTokens: (t) => t.slice(0, 1) }) },
};

export function compileRuleT(value, variantKey: any = undefined) {
  let p = BASE;
  if (variantKey !== undefined) {
    const v = VARIANTS[variantKey];
    if (!v) throw new Error(`未定義の変異 key: ${variantKey}`);
    p = v.apply(BASE);
  }
  const toks = p.pickTokens(p.splitNeedle(value));
  if (toks.length === 0) throw new Error(`token 数 0 の needle: ${JSON.stringify(value)}`);
  const body = toks.map((t) => [...t].map(p.tokenChar).join("")).join(p.joiner);
  const re = new RegExp(`${p.lead}${body}${p.tail}`, "u");
  return {
    source: re.source,
    flags: re.flags,
    regex: re,
    hit: (text) => p.splitTarget(p.predecode(text)).some((l) => re.test(p.normalizeTarget(l))),
    // v1.2（MAJ2-1）: 走査側の部品を露出する。design-self-check.mjs [8] U-05 が hit / 各部品の関数 source を設計 §5.7 定義 5 の正準形と照合する
    //（正規表現の外に「末尾境界」や多文字の書き換えを置く変異は、生成コーパスでは測れない ∴ 構造で拘束する）
    parts: { splitTarget: p.splitTarget, predecode: p.predecode, normalizeTarget: p.normalizeTarget },
  };
}

// 採用規則 T の regex（needle-rule-t-probe.mjs の互換 API）
export const regexT = (value) => compileRuleT(value).regex;
export const hitLines = (text, re) => text.split(/\r?\n/).some((l) => re.test(l.normalize("NFKC")));

// 設計 §5.9 の F 行（ID / text / expectedT / 族 / 性質）。合成 needle は xx-yy
export const FIXTURES = [
  ["F-01", "xx-yy", "red", "素の形", "P-01"],
  ["F-02", "xxYy", "red", "大小文字・camelCase・SNAKE", "P-02"],
  ["F-03", "XX_YY", "red", "大小文字・camelCase・SNAKE", "P-02"],
  ["F-04", "Xx-Yy", "red", "大小文字・camelCase・SNAKE", "P-02"],
  ["F-05", "xxyy", "red", "連結（区切り 0 文字）", "P-03"],
  ["F-06", "xx yy", "red", "区切り記号 1 文字（空白）", "P-04"],
  ["F-07", "xx__yy", "red", "区切り記号 2 文字以上", "P-04"],
  ["F-08", "xx - yy", "red", "区切り記号 2 文字以上", "P-04"],
  ["F-09", "xx_ yy", "red", "区切り記号 2 文字以上", "P-04"],
  ["F-10", "xx‑yy", "red", "Unicode ダッシュ（U+2011 non-breaking hyphen。NFKC 後 U+2010）", "P-05"],
  ["F-11", "xx—yy", "red", "Unicode ダッシュ（U+2014 em dash）", "P-05"],
  ["F-12", "xx​yy", "red", "ゼロ幅スペース（U+200B）", "P-05"],
  ["F-13", "xx　yy", "red", "全角空白（U+3000。\\p{Zs}。NFKC 後 U+0020）", "P-05"],
  ["F-14", "ｘｘ－ｙｙ", "red", "NFKC 互換文字（全角英字 + 全角ハイフンマイナス）", "P-06"],
  ["F-15", "xx-yys", "red", "語尾変化・複数形", "P-07"],
  ["F-16", "xx-yying", "red", "語尾変化", "P-07"],
  ["F-17", "xx_yyed", "red", "語尾変化", "P-07"],
  ["F-18", "xxyyz", "red", "別語への埋め込み（後置）", "P-07"],
  ["F-19", "xx-yy2", "red", "数字後置", "P-07"],
  ["F-20", "xxYyMode", "red", "後続語（大文字始まり）", "P-07"],
  ["F-21", "getXxYyz", "red", "別語への埋め込み（英字前置 + camelCase 境界）", "P-08"],
  ["F-22", "isXxYyEnabled", "red", "別語への埋め込み（camelCase 境界・前後）", "P-08"],
  ["F-23", "2XxYy", "red", "数字前置 + camelCase 境界", "P-08"],
  ["F-24", "_xxyy", "red", "前置区切り", "P-09"],
  ["F-25", "従来のxx-yy", "red", "非 ASCII 文字の直後（日本語散文中）", "P-09"],
  ["F-26", "xx-yyを追加", "red", "非 ASCII 文字の直前", "P-09"],
  ["F-27", "const xxyydict", "red", "別語への埋め込み（空白後・後置）", "P-07"],
  ["F-28", "constxxyydict", "green", "別語への埋め込み（小文字前置。境界無し）", "P-10"],
  ["F-29", "Zxxyy", "green", "別語への埋め込み（大文字前置 + 小文字続き。camelCase 境界に当たらない）", "P-10"],
  ["F-30", "ZXXYY", "green", "全大文字語への埋め込み（大文字→大文字は境界でない）", "P-10"],
  ["F-31", "xx.yy", "green", "[-_\\s] 以外の区切り（.）", "P-11"],
  ["F-32", "xx/yy", "green", "[-_\\s] 以外の区切り（/）", "P-11"],
  ["F-33", "xx:yy", "green", "[-_\\s] 以外の区切り（:）", "P-11"],
  ["F-34", "xx-\nyy", "green", "行跨ぎ（行単位走査）", "P-12"],
  ["F-35", "\"xx\" + \"-yy\"", "green", "文字列連結", "P-13"],
  ["F-36", "\\u0078x-yy", "green", "文字コード表記（先頭 1 字をエスケープ）", "P-13"],
  ["F-37", "xxzyy", "green", "非該当（別語）", "P-14"],
  ["F-38", "xx", "green", "非該当（token 不足）", "P-14"],
  ["F-39", "yy-xx", "green", "非該当（token 順序違い）", "P-14"],
  // v1.1（MAJ-1）: 文字クラスの「列挙されていない代表」と、C-NEG-RULE (2) が名指しする -able、区切り `--`
  ["F-40", "xx‒yy", "red", "Unicode ダッシュ（U+2012 figure dash。v1.0 fixture に無い \\p{Pd} の代表）", "P-05"],
  ["F-41", "xx‌yy", "red", "ゼロ幅非接合子（U+200C。v1.0 fixture に無いゼロ幅の代表）", "P-05"],
  ["F-42", "xx yy", "red", "空白分離子（U+1680 ogham space mark。\\p{Zs} かつ \\s。NFKC で変化しない）", "P-05"],
  ["F-43", "xx-yyable", "red", "語尾変化（-able。C-NEG-RULE (2) が名指しする形）", "P-07"],
  ["F-44", "xx--yy", "red", "区切り記号 2 文字以上（`--`）", "P-04"],
];
