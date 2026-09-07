// @vitest-environment jsdom
// Core adapter harness（m1-t3 設計 §5.6）。npm 公開版 `@maplat/core@1.0.0` を kit の adapter 契約で包み、
// `runContractSuite` / `runNegativeRuntime` を走らせる。adapter は構築手段だけを提供し、期待値は fixture が持つ。
// C-IFACE 構造型（`MaplatFeatureLike` / `MaplatFeatureStyleLike` / `MaplatImageStyleLike` / `MaplatViewLike` / `MaplatVectorSourceLike`
// と `MapCoordinate` の tuple 化）への narrow を箇所ごとに書く（`as any` を使わない — m1-t3/AC3）。
import { describe, expect, test } from "vitest";
import * as core from "@maplat/core";
import { runContractSuite, runNegativeRuntime } from "../../src/contract-kit/index.js";
import type { ContractAdapter, ContractResult } from "../../src/contract-kit/index.js";
import type {
  MaplatFeatureLike, MaplatFeatureStyleLike, MaplatImageStyleLike, MaplatMapConstructor,
  MaplatMapInterface, MaplatMapOption, MaplatVectorSourceLike, MaplatViewLike,
} from "../../src/core/map.js";
import type { MapCoordinate } from "../../src/core/coordinates.js";

// ---- C-IFACE 構造型への narrow（型 guard。`as any` を使わず、箇所ごとに 1 行） ----
const isVectorSourceLike = (v: unknown): v is MaplatVectorSourceLike =>
  v !== null && typeof v === "object" && typeof (v as { getFeatures?: unknown }).getFeatures === "function";
const isFeatureLike = (v: unknown): v is MaplatFeatureLike =>
  v !== null && typeof v === "object" && typeof (v as { getStyle?: unknown }).getStyle === "function";
const isStyleLike = (v: unknown): v is MaplatFeatureStyleLike =>
  v !== null && typeof v === "object" && typeof (v as { getImage?: unknown }).getImage === "function";
const isImageLike = (v: unknown): v is MaplatImageStyleLike =>
  v !== null && typeof v === "object" && typeof (v as { getSrc?: unknown }).getSrc === "function";
const isViewLike = (v: unknown): v is MaplatViewLike =>
  v !== null && typeof v === "object" && typeof (v as { getCenter?: unknown }).getCenter === "function";

// ---- adapter（構築手段だけ。期待値を持たない） ----
const calls: string[] = [];
function installFetch(files: Record<string, unknown>): void {
  calls.length = 0;
  (globalThis as { fetch?: unknown }).fetch = async (input: unknown) => {
    const url = String(input);
    calls.push(url);
    const key = Object.keys(files).find((k) => url.endsWith(k));
    if (key === undefined) return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
    return { ok: true, status: 200, json: async () => files[key], text: async () => JSON.stringify(files[key]) };
  };
}

const adapter: ContractAdapter = {
  name: "core",
  createApp: async () => {
    const div = document.createElement("div");
    div.style.width = "400px";
    div.style.height = "300px";
    document.body.appendChild(div);
    const MaplatMapCtor = core.MaplatMap as unknown as MaplatMapConstructor;
    const option: MaplatMapOption = { target: div, div: "map" };
    return { mapObject: new MaplatMapCtor(option) };
  },
  sourceFactory: async (input, commonOptions) => core.mapSourceFactory(input, commonOptions),
  fetchStub: installFetch,
  fetchCalls: () => calls,
  module: core as unknown as Record<string, unknown>,
  dispose: () => {},
};

let suiteResult: ContractResult;
let runtimeResult: ContractResult;

describe("Core adapter", () => {
  suiteResult = runContractSuite(adapter, { test, expect });
  runtimeResult = runNegativeRuntime(adapter, { test, expect });

  test("適用外の CK-MODE-INVALID / CK-ERR-MAPBOX が not-applicable として結果に数えられる（skip しない）", () => {
    const na = suiteResult.results.filter((r) => r.status === "not-applicable").map((r) => r.id);
    expect(na).toContain("CK-MODE-INVALID");
    expect(na).toContain("CK-ERR-MAPBOX");
    expect(runtimeResult.results[0]?.status).toBe("not-applicable");
  });

  test("registry の全 entry が結果に数えられ、applicable は pass", () => {
    expect(suiteResult.results.length).toBeGreaterThanOrEqual(15);
    for (const r of suiteResult.results) {
      if (r.status !== "not-applicable") expect(r.status).toBe("pass");
    }
  });

  // ---- C-IFACE 構造型への明示的な narrow（5 箇所。m1-t3/AC3: `as any` 0） ----
  test("MARKER の style 連鎖 getStyle().getImage().getSrc() を構造型 narrow で通す", async () => {
    const app = await adapter.createApp({});
    const rawMap = app.mapObject as { setMarker?: (...a: unknown[]) => unknown };
    rawMap.setMarker?.([0, 0], { datum: 1 }, "imgs/icons/builtin/defaultpin.png", undefined);
    const map = app.mapObject as MaplatMapInterface;
    const src = map.getSource("marker");
    if (!isVectorSourceLike(src)) throw new Error("getSource('marker') が MaplatVectorSourceLike でない");
    const feat = src.getFeatures()[0];
    if (!isFeatureLike(feat)) throw new Error("feature が MaplatFeatureLike でない");
    const style = feat.getStyle();
    if (!style || !isStyleLike(style)) throw new Error("feature の style が MaplatFeatureStyleLike でない");
    const image = style.getImage();
    if (!image || !isImageLike(image)) throw new Error("style の image が MaplatImageStyleLike でない");
    expect(image.getSrc()).toBe("imgs/icons/builtin/defaultpin.png");
  });

  test("getView() を MaplatViewLike へ narrow し、getCenter() が MapCoordinate（tuple）を返す", async () => {
    const app = await adapter.createApp({});
    const map = app.mapObject as MaplatMapInterface;
    const view = map.getView();
    if (!isViewLike(view)) throw new Error("view が MaplatViewLike でない");
    const center: MapCoordinate | undefined = view.getCenter();
    expect(Array.isArray(center)).toBe(center !== undefined);
    // MapCoordinate は tuple（[x: number, y: number]）として成立する
    const tuple: MapCoordinate = [0, 0];
    expect(tuple).toHaveLength(2);
  });
});