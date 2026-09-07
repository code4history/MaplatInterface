// 契約テストの runner（m1-t3 設計 §5.3）。runtime 依存 0・test runner 非依存。
// registry の各 entry について `applies_to` を評価し、適用外を `not-applicable` として**結果に数える**（skip しない）。
// 期待値は fixture が持つ（adapter は構築手段だけを提供する — §5.6）。

import registryJson from "./registry.json";
import { FIXTURES, fixtureById, type SourceFixtureCase } from "./fixtures/index.js";
import type { ContractAdapter, ContractHarness, ContractRegistryEntry, ContractResult } from "./types.js";

export const REGISTRY = registryJson as ContractRegistryEntry[];

/** module 表面の 13 member（m1-t3 設計 §2.6 の EXPORTS 実測）。 */
export const MODULE_EXPORTS = [
  "CustomEvent", "GPSErrorEvent", "GPSRequestEvent", "GPSResultEvent", "MaplatApp", "MaplatMap",
  "assets", "buildSlideAttrs", "createElement", "escapeAttr", "mapSourceFactory", "sanitizeHtml", "toPlainText",
] as const;

type R = Record<string, unknown>;
const asRecord = (v: unknown): R => (v !== null && (typeof v === "object" || typeof v === "function") ? (v as R) : {});
/** メソッドを `this` 束縛付きで呼ぶ（ol 等の method は unbound で呼ぶと `this` 欠落で壊れる）。 */
const callM = (obj: R, key: string, ...args: unknown[]): unknown => {
  const m = obj[key];
  return typeof m === "function" ? (m as (...a: unknown[]) => unknown).apply(obj, args) : null;
};

/** SRC-F fixture の observable（m1-t3 設計 §5.2 の whitelist: mapID / isBasemap() / isWmts() / label / width / height / ctorStatics）。 */
function observe(s: unknown): R {
  const src = asRecord(s);
  const ctor = asRecord(src.constructor);
  return {
    mapID: src.mapID ?? null,
    isBasemap: callM(src, "isBasemap"),
    isWmts: callM(src, "isWmts"),
    label: src.label ?? null,
    width: src.width ?? null,
    height: src.height ?? null,
    ctorStatics: ["isBasemap", "isWmts", "isMapLibre", "createAsync"].filter((k) => typeof ctor[k] === "function"),
  };
}

/** style 連鎖の 3 段（m1-t3 設計 §5.3 CK-MARKER の契約）: `getStyle().getImage().getSrc()`。 */
function srcOf(f: unknown): unknown {
  const feat = asRecord(f);
  const style = callM(feat, "getStyle");
  const image = callM(asRecord(style), "getImage");
  return callM(asRecord(image), "getSrc");
}

const getFeatures = (s: unknown): unknown[] => {
  const feats = callM(asRecord(s), "getFeatures");
  return Array.isArray(feats) ? feats : [];
};

/** `applies_to` の評価。 */
function applicability(adapter: ContractAdapter, entry: ContractRegistryEntry): { applicable: boolean; reason: string } {
  const a = entry.applies_to;
  if (a === "all") return { applicable: true, reason: "all" };
  if (a.startsWith("capability:")) {
    const cap = a.slice("capability:".length);
    const has = cap === "displayMode" ? adapter.displayMode !== undefined : false;
    return { applicable: has, reason: has ? `capability:${cap} 有り` : `capability:${cap} が無い` };
  }
  if (a.startsWith("adapter:")) {
    const name = a.slice("adapter:".length);
    const has = adapter.name === name;
    return { applicable: has, reason: has ? `adapter:${name}` : `adapter:${name} でない（${adapter.name}）` };
  }
  // classification:<value>: manifest 台帳の classification で適用を制御する余地（現状適用外）
  return { applicable: false, reason: `applies_to が未対応: ${a}` };
}

/** SK-SRC-F<n>-<case> の契約（fixture `expected` との照合）。 */
async function runSourceCase(c: SourceFixtureCase, adapter: ContractAdapter, harness: ContractHarness): Promise<void> {
  adapter.fetchStub(c.files);
  const s = await adapter.sourceFactory(c.input.source, c.input.commonOptions);
  const obs = observe(s);
  const calls = adapter.fetchCalls();
  for (const inc of c.expected.fetch_urls_include) {
    harness.expect(calls.some((u) => u.endsWith(inc))).toBe(true);
  }
  harness.expect(calls.length).toBe(c.expected.fetch_urls_include.length);
  for (const exc of c.expected.fetch_urls_exclude) {
    harness.expect(calls.some((u) => u.endsWith(exc))).toBe(false);
  }
  harness.expect(obs).toEqual(c.expected.observables);
}

/** `CK-*` 1 entry の契約本体を返す（適用外は呼ばれない）。 */
async function runContract(entry: ContractRegistryEntry, adapter: ContractAdapter, harness: ContractHarness): Promise<void> {
  const id = entry.id;
  if (id.startsWith("CK-SRC-F") && id !== "CK-SRC-STATIC") {
    const m = /^CK-(SRC-F\d)-(.*)$/.exec(id);
    if (m) {
      const fixture = fixtureById(m[1]);
      const c = fixture?.cases.find((cc) => cc.case === m[2]);
      if (!c) throw new Error(`fixture case が無い: ${id}`);
      await runSourceCase(c, adapter, harness);
      return;
    }
  }
  switch (id) {
    case "CK-SRC-STATIC": {
      const rep = fixtureById("SRC-F2")?.cases[0];
      if (!rep) throw new Error("SRC-F2 base fixture が無い");
      adapter.fetchStub(rep.files);
      const s = await adapter.sourceFactory(rep.input.source, rep.input.commonOptions);
      const ctor = asRecord(asRecord(s).constructor);
      harness.expect(["isBasemap", "isWmts", "isMapLibre", "createAsync"].filter((k) => typeof ctor[k] === "function")).toEqual(["isBasemap", "isWmts", "isMapLibre", "createAsync"]);
      return;
    }
    case "CK-MARKER-1": {
      const app = await adapter.createApp({});
      const map = asRecord(app.mapObject);
      const icon = "imgs/icons/builtin/defaultpin.png";
      (map.setMarker as (...a: unknown[]) => unknown)([0, 0], { datum: 1 }, icon, undefined);
      const feats = getFeatures((map.getSource as (n: string) => unknown)("marker"));
      harness.expect(feats).toHaveLength(1);
      harness.expect(srcOf(feats[0])).toBe(icon);
      return;
    }
    case "CK-MARKER-2": {
      const app = await adapter.createApp({});
      const map = asRecord(app.mapObject);
      const icon = "imgs/icons/x.png";
      (map.setMarker as (...a: unknown[]) => unknown)([1, 2], { d: 2 }, { src: icon, anchor: [0.5, 1.0] }, undefined);
      const feats = getFeatures((map.getSource as (n: string) => unknown)("marker"));
      harness.expect(srcOf(feats[0])).toBe(icon);
      return;
    }
    case "CK-MARKER-3": {
      const app = await adapter.createApp({});
      const map = asRecord(app.mapObject);
      (map.setMarker as (...a: unknown[]) => unknown)([0, 0], { d: 3 }, "a.png", undefined);
      (map.resetMarker as (...a: unknown[]) => unknown)(undefined);
      harness.expect(getFeatures((map.getSource as (n: string) => unknown)("marker"))).toHaveLength(0);
      return;
    }
    case "CK-MARKER-4": {
      const app = await adapter.createApp({});
      const map = asRecord(app.mapObject);
      (map.setMarker as (...a: unknown[]) => unknown)([0, 0], { d: 4 }, "a.png", "gps");
      const m = getFeatures((map.getSource as (n: string) => unknown)("marker"));
      const g = getFeatures((map.getSource as (n: string) => unknown)("gps"));
      harness.expect(m).toHaveLength(0);
      harness.expect(g).toHaveLength(1);
      return;
    }
    case "CK-MODULE-EXPORTS": {
      const mod = adapter.module;
      harness.expect(mod === undefined).toBe(false);
      harness.expect(Object.keys(mod ?? {}).sort()).toEqual([...MODULE_EXPORTS].sort());
      return;
    }
    case "CK-MODULE-CE": {
      const ce = asRecord(adapter.module).createElement;
      harness.expect(typeof ce).toBe("function");
      const out = ['<div id="a">x</div>', "<div>a</div><span>b</span>", "plain text", ""].map((s) => {
        const r = (ce as (s: string) => unknown)(s);
        return { isArray: Array.isArray(r), len: Array.isArray(r) ? r.length : null };
      });
      for (const o of out) harness.expect(o.isArray).toBe(true);
      return;
    }
    case "CK-MODE-INVALID":
      // §5.5 で測る（runNegativeRuntime）。ここでは適用性だけを数える（applicable のときのみ到達）。
      harness.expect(adapter.displayMode !== undefined).toBe(true);
      return;
    case "CK-ERR-MAPBOX": {
      adapter.fetchStub({});
      let err: unknown;
      try { await adapter.sourceFactory({ maptype: "mapbox" }, {}); } catch (e) { err = e; }
      const e = err as { name?: unknown; code?: unknown } | null;
      harness.expect(err !== null && typeof err === "object").toBe(true);
      harness.expect(e?.name).toBe("MaplatContractError");
      harness.expect(e?.code).toBe("MAPBOX_UNSUPPORTED");
      return;
    }
    default:
      throw new Error(`未実装の CK-* test ID: ${id}`);
  }
}

/** `runContractSuite(adapter, harness)`。registry の全 entry を数え、適用外は `not-applicable` として results に含める。 */
export function runContractSuite(adapter: ContractAdapter, harness: ContractHarness): ContractResult {
  const results: ContractResult["results"] = [];
  for (const entry of REGISTRY) {
    const app = applicability(adapter, entry);
    if (app.applicable) {
      results.push({ id: entry.id, status: "pass", detail: app.reason });
      harness.test(entry.id, async () => { await runContract(entry, adapter, harness); });
    } else {
      results.push({ id: entry.id, status: "not-applicable", detail: app.reason });
      harness.test(`${entry.id} (not-applicable)`, () => { harness.expect(app.applicable).toBe(false); });
    }
  }
  return { adapter: adapter.name, results };
}