/* eslint-disable */
// @ts-nocheck — m1-t2 design evidence rule-t-universal.mjs の忠実な移植（m1-t3 設計 §5.4「同じ定義・同じ fixture・同じ期待値」）。
// 型注釈を付さない動的コードのため @ts-nocheck。定義・変異・fixture を変えない。
// m1-t2 タスク設計 v1.2（2 巡目レビュー MAJ2-1 の是正）: 規則 T の**全称主張**を、著者が列挙した有限 fixture へ縮退させずに測る。
//
// 入力空間は著者の表からではなく **Unicode の全 code point（U+0000〜U+10FFFF。surrogate を除く）** と、
// 設計 §5.7.2 の「連結子 J の対象集合」表（Unicode property 名と code point 範囲の指定）から**導出**する。
// 検査の観点は設計 §5.9 の U 行（key）と 1:1。design-self-check.mjs [8] と rule-t-universal-probe.mjs が同じ関数を import する。
//
//   deriveTargetSet(specs)            §5.7.2 の各行の指定文字列（例 "\\p{Pd}" / "\\s" / "U+200B〜U+200D U+2060 U+FEFF"）→ { set, perComponent }
//   runUniversalChecks(ruleModule, { targetSet, lead, splitSource, needle }) → { results: [{ key, ok, detail }], texts }
//     ruleModule は rule-t.mjs（compileRuleT を持つ module）。lead は §5.7 定義 4 の先頭境界 L の literal、splitSource は定義 5 の行分割 regex の source。
//
// 独立性: 本モジュールは rule-t.mjs の JOINER_T / LEAD_T / FIXTURES / VARIANTS を**参照しない**（参照すれば「実装と実装の照合」になる）。
// token 字の正規表現（設計 §5.7 定義 2）だけを自前で組む。出力は貼付安全形（code point は U+XXXX、path を含めない）。

const MAX_CP = 0x10ffff;
const isSurrogate = (cp) => cp >= 0xd800 && cp <= 0xdfff;
const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;

// §5.7.2 の「指定」列の文法: 空白区切りの項。項は `\p{Xx}`（Unicode general category / binary property）/ `\s`（JS の空白クラス）/
// `U+XXXX`（単独）/ `U+XXXX〜U+XXXX`（範囲。`〜` または `-`）。未知の項は例外（黙って空集合にしない）。
export function parseSpec(spec) {
  const items = spec.trim().split(/\s+/).filter(Boolean);
  const preds = [];
  for (const it of items) {
    let m;
    if ((m = /^\\p\{([A-Za-z_]+)\}$/.exec(it))) { const re = new RegExp(`^\\p{${m[1]}}$`, "u"); preds.push((ch) => re.test(ch)); }
    else if (it === "\\s") preds.push((ch) => /^\s$/u.test(ch));
    else if ((m = /^U\+([0-9A-Fa-f]{4,6})(?:[〜-]U\+([0-9A-Fa-f]{4,6}))?$/.exec(it))) {
      const lo = parseInt(m[1], 16), hi = m[2] ? parseInt(m[2], 16) : lo;
      if (hi < lo) throw new Error(`範囲の向きが逆: ${it}`);
      preds.push((ch) => { const cp = ch.codePointAt(0); return cp >= lo && cp <= hi; });
    } else throw new Error(`§5.7.2 の指定を読めない項: ${JSON.stringify(it)}`);
  }
  if (preds.length === 0) throw new Error(`§5.7.2 の指定が空: ${JSON.stringify(spec)}`);
  return (ch) => preds.some((p) => p(ch));
}

// 対象集合 J* = ∪ 成分。perComponent は成分ごとの要素数（0 なら死んだ成分 — 表の typo を捕える）
export function deriveTargetSet(specs) {
  const preds = specs.map((s) => ({ id: s.id, pred: parseSpec(s.spec) }));
  const set = new Set();
  const perComponent = Object.fromEntries(specs.map((s) => [s.id, 0]));
  for (let cp = 0; cp <= MAX_CP; cp++) {
    if (isSurrogate(cp)) continue;
    const ch = String.fromCodePoint(cp);
    let inSet = false;
    for (const { id, pred } of preds) if (pred(ch)) { perComponent[id]++; inSet = true; }
    if (inSet) set.add(cp);
  }
  return { set, perComponent };
}

// 設計 §5.7 定義 1〜2 の自前実装（rule-t.mjs を参照しない）
const esc = (ch) => ch.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
export const splitNeedle = (value) => value.normalize("NFKC").split(/[-_\s]+/).flatMap((w) => w.split(/(?<=[a-z0-9])(?=[A-Z])/)).filter(Boolean);
export const tokenPattern = (tok) => [...tok].map((ch) => (/[a-z]/i.test(ch) ? `[${ch.toLowerCase()}${ch.toUpperCase()}]` : esc(ch))).join("");

// U-03: source を文法 `L tok (J tok)+` で照合し、J のクラスが受理する集合を返す（一致しなければ null）
export function parseGrammar(source, { lead, tokens }) {
  if (!source.startsWith(lead)) return { ok: false, reason: "先頭境界 L が設計 §5.7 定義 4 の literal と一致しない" };
  let rest = source.slice(lead.length);
  const toks = tokens.map(tokenPattern);
  if (!rest.startsWith(toks[0])) return { ok: false, reason: "先頭 token の直後から始まらない" };
  rest = rest.slice(toks[0].length);
  let joinerClass = null;
  for (let i = 1; i < toks.length; i++) {
    const at = rest.indexOf(toks[i]);
    if (at < 0) return { ok: false, reason: `token ${i + 1} が無い` };
    const j = rest.slice(0, at);
    // J は単一の文字クラス + `*` のみ（lookaround / alternation / 量指定子の変更を許さない）
    if (!/^\[(?:[^\]\\]|\\.)+\]\*$/u.test(j)) return { ok: false, reason: `token ${i} と ${i + 1} の間が単一の文字クラス \`[…]*\` でない: ${j}` };
    if (joinerClass !== null && joinerClass !== j) return { ok: false, reason: "連結子 J が token 間で一様でない" };
    joinerClass = j;
    rest = rest.slice(at + toks[i].length);
  }
  if (rest !== "") return { ok: false, reason: `最終 token の後に構造が残る（末尾境界）: ${rest}` };
  return { ok: true, joinerClass };
}

export function runUniversalChecks(ruleModule, { targetSet, lead, splitSource, needle = "xx-yy" }) {
  const { compileRuleT } = ruleModule;
  const splitRe = new RegExp(splitSource);
  const compiled = compileRuleT(needle);
  const regex = compiled.regex;
  const results = [];
  const tokens = splitNeedle(needle);
  const [tok1, tok2] = tokens;
  const oracle = (text) => text.split(splitRe).some((l) => regex.test(l.normalize("NFKC"))); // 設計 §5.7 定義 5 の読み（hit との一致を U-05 で測る）
  let mismatch = 0, samples = [];
  const observe = (text) => { const h = compiled.hit(text), o = oracle(text); if (h !== o) { mismatch++; if (samples.length < 5) samples.push([...text].map((c) => hex(c.codePointAt(0))).join(" ")); } return h; };

  // U-01 class-positive: J* の各 cp について tok1 <cp> tok2 が red（行分割で 2 行になる cp は除外し件数を印字）
  {
    let red = 0, green = [], excludedBySplit = [];
    for (const cp of targetSet) {
      const ch = String.fromCodePoint(cp);
      const text = `${needle.split("-")[0]}${ch}${needle.split("-")[1]}`;
      if (text.split(splitRe).length > 1) { excludedBySplit.push(cp); continue; }
      if (observe(text)) red++; else green.push(cp);
    }
    results.push({ key: "class-positive", ok: green.length === 0 && red > 0, detail: `target=${targetSet.size} red=${red} green=${green.length}${green.length ? ` (${green.slice(0, 8).map(hex).join(" ")})` : ""} excluded-by-line-split=${excludedBySplit.length}${excludedBySplit.length ? ` (${excludedBySplit.map(hex).join(" ")})` : ""}` });
  }
  // U-02 class-complement: J* に無い全 cp（NFKC 後に J* の字も needle の字も含まないもの）について tok1 <cp> tok2 が green
  const needleChars = new Set([...needle.normalize("NFKC").toLowerCase()].filter((c) => /[a-z0-9]/.test(c)).flatMap((c) => [c, c.toUpperCase()]));
  {
    let green = 0, red = [], skipped = 0;
    for (let cp = 0; cp <= MAX_CP; cp++) {
      if (isSurrogate(cp) || targetSet.has(cp)) continue;
      const ch = String.fromCodePoint(cp);
      const n = ch.normalize("NFKC");
      if ([...n].some((c) => targetSet.has(c.codePointAt(0)) || needleChars.has(c))) { skipped++; continue; }
      const text = `${needle.split("-")[0]}${ch}${needle.split("-")[1]}`;
      if (observe(text)) red.push(cp); else green++;
    }
    results.push({ key: "class-complement", ok: red.length === 0 && green > 0, detail: `complement=${green + red.length} green=${green} red=${red.length}${red.length ? ` (${red.slice(0, 8).map(hex).join(" ")})` : ""} skipped-nfkc-into-target-or-needle=${skipped}` });
  }
  // U-03 grammar: source = L tok (J tok)+、J は単一クラス、末尾に何も無い。J のクラスが受理する cp 集合 = J*
  {
    const g = parseGrammar(regex.source, { lead, tokens });
    let detail = g.ok ? "grammar=ok" : `grammar=NG ${g.reason}`;
    let classEq = false;
    if (g.ok) {
      const classRe = new RegExp(`^${g.joinerClass.slice(0, -1)}$`, "u");
      let extra = [], missing = [];
      for (let cp = 0; cp <= MAX_CP; cp++) {
        if (isSurrogate(cp)) continue;
        const inClass = classRe.test(String.fromCodePoint(cp));
        const inTarget = targetSet.has(cp);
        if (inClass && !inTarget) extra.push(cp);
        else if (!inClass && inTarget) missing.push(cp);
      }
      classEq = extra.length === 0 && missing.length === 0;
      detail += ` class-vs-target: extra=${extra.length}${extra.length ? ` (${extra.slice(0, 8).map(hex).join(" ")})` : ""} missing=${missing.length}${missing.length ? ` (${missing.slice(0, 8).map(hex).join(" ")})` : ""}`;
    }
    // 3 token の needle でも同じ文法（J が token 間で一様）
    const g3 = parseGrammar(compileRuleT(`${needle}-zz`).regex.source, { lead, tokens: splitNeedle(`${needle}-zz`) });
    detail += ` three-token-grammar=${g3.ok ? "ok" : `NG ${g3.reason}`}`;
    results.push({ key: "grammar", ok: g.ok && classEq && g3.ok, detail });
  }
  // U-04 suffix-universal: 全 cp について needle <cp> が red（NFKC で needle 末尾と合成する結合文字は除外して件数を印字）
  {
    let red = 0, green = [], composed = [];
    for (let cp = 0; cp <= MAX_CP; cp++) {
      if (isSurrogate(cp)) continue;
      const ch = String.fromCodePoint(cp);
      const text = `${needle}${ch}`;
      if (!text.normalize("NFKC").startsWith(needle)) { composed.push(cp); continue; }
      if (observe(text)) red++; else green.push(cp);
    }
    results.push({ key: "suffix-universal", ok: green.length === 0 && red > 0, detail: `red=${red} green=${green.length}${green.length ? ` (${green.slice(0, 8).map(hex).join(" ")})` : ""} excluded-composes-into-needle=${composed.length} (${composed.map(hex).join(" ")})` });
  }
  // U-05 hit-equals-regex: (a) 上の全テキストで hit(text) ≡ 「行分割 → NFKC → regex.test」（振る舞い）。
  // (b) 構造: hit と走査側の部品（splitTarget / predecode / normalizeTarget）の関数 source が設計 §5.7 定義 5 の正準形と一致する。
  //     多文字の条件（`(?!ment)` 相当の後置フィルタ・`yyment` の書き換え）は生成コーパスに現れない ∴ 振る舞いでは測れず、source で拘束する。
  {
    const norm = (s) => String(s).replace(/\s+/g, " ").trim();
    const canon = {
      hit: "(text) => p.splitTarget(p.predecode(text)).some((l) => re.test(p.normalizeTarget(l)))",
      splitTarget: `(text) => text.split(/${splitSource}/)`,
      predecode: "(text) => text",
      normalizeTarget: '(line) => line.normalize("NFKC")',
    };
    const actual = { hit: compiled.hit, ...(compiled.parts ?? {}) };
    const bad = Object.keys(canon).filter((k) => norm(actual[k]) !== norm(canon[k]));
    results.push({ key: "hit-equals-regex", ok: mismatch === 0 && bad.length === 0, detail: `behavior-mismatch=${mismatch}${samples.length ? ` (${samples.join(" | ")})` : ""} source-vs-canonical: ${bad.length ? `NG(${bad.join(",")})` : "ok"}` });
  }
  return { results, tokens: [tok1, tok2] };
}

// 残余の導出（§5.11 の申告に使う。検査ではない）: `\p{Cf}` のうち J* に無い cp、needle 末尾と合成する結合文字
export function deriveResiduals(targetSet, needle = "xx-yy") {
  const cfNotInTarget = [];
  const composing = [];
  for (let cp = 0; cp <= MAX_CP; cp++) {
    if (isSurrogate(cp)) continue;
    const ch = String.fromCodePoint(cp);
    if (/^\p{Cf}$/u.test(ch) && !targetSet.has(cp)) cfNotInTarget.push(cp);
    if (!`${needle}${ch}`.normalize("NFKC").startsWith(needle)) composing.push(cp);
  }
  return { cfNotInTarget, composing };
}

// 設計書から入力を導く（PROP-1: 対象集合・境界 L・行分割・U 行の key は本モジュールに書かず設計の表から読む）
//   specs: §5.7.2 の行 `| **J-n** | 成分 | \`指定\` |`、lead: §5.7 定義 4 の literal、splitSource: 定義 5 の行分割 regex、uRows: §5.9 の U 行
export function parseDesignInputs(designLines) {
  const sec = new Array(designLines.length).fill("header");
  let cur = "header";
  designLines.forEach((l, i) => { let m; if ((m = /^## (\d+)\.\s/.exec(l))) cur = m[1]; else if ((m = /^### (\d+\.\d+(?:\.\d+)?)\s/.exec(l))) cur = m[1]; else if (/^### 改版履歴/.test(l)) cur = "history"; else if (/^### 引継ぎ情報/.test(l)) cur = "handover"; sec[i] = cur; });
  const cells = (l) => l.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
  const specs = [], uRows = [];
  let lead = null, splitSource = null;
  designLines.forEach((l, i) => {
    let m;
    if (sec[i] === "5.7.2" && l.startsWith("|")) { const c = cells(l); if ((m = /^\*\*(J-\d+)\*\*$/.exec(c[0] ?? "")) && (c[2] ?? "").startsWith("`")) specs.push({ id: m[1], component: c[1], spec: c[2].replace(/^`|`$/g, "") }); }
    if (sec[i] === "5.7") {
      if ((m = /^4\. \*\*先頭境界 L\*\*: `([^`]+)`/.exec(l))) lead = m[1];
      if ((m = /^5\. \*\*走査対象側\*\*: 行（`\/(.+?)\/` で分割）/.exec(l))) splitSource = m[1];
    }
    if (sec[i] === "5.9" && l.startsWith("|")) { const c = cells(l); if (/^U-\d{2}$/.test(c[0] ?? "") && (m = /^`([a-z0-9-]+)`$/.exec(c[1] ?? ""))) uRows.push({ id: c[0], key: m[1], props: [...(c[c.length - 1] ?? "").matchAll(/\bP-\d{2}\b/g)].map((x) => x[0]) }); }
  });
  return { specs, lead, splitSource, uRows };
}

export { hex };
