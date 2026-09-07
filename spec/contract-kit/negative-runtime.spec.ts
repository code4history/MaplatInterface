// negative/runtime.ts の V 行（m1-t3 設計 §5.5。C-ERR / C-MODE。invalid-input の拒否）。
import { describe, expect, test } from "vitest";
import {
  CONTRACT_ERROR_CODES, INVALID_DISPLAY_MODE_INPUTS,
  isInvalidDisplayModeContractError, runNegativeRuntime,
} from "../../src/contract-kit/index.js";
import type { ContractAdapter, ContractHarness, ContractResult } from "../../src/contract-kit/index.js";

/** 記録するだけの harness（runNegativeRuntime が登録した test を拾って実行できる）。 */
function recordingHarness(): { harness: ContractHarness; run: () => Promise<void>; testNames: () => string[] } {
  const tests: { name: string; fn: () => void | Promise<void> }[] = [];
  let failed: Error | null = null;
  const expectImpl = (actual: unknown) => {
    const arr = Array.isArray(actual) ? actual : null;
    return {
      toEqual: (expected: unknown) => { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`toEqual ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`); },
      toBe: (expected: unknown) => { if (actual !== expected) throw new Error(`toBe ${String(actual)} != ${String(expected)}`); },
      toBeTruthy: () => { if (!actual) throw new Error("toBeTruthy false"); },
      toContain: (item: unknown) => { if (arr === null || !arr.includes(item)) throw new Error(`toContain missing ${String(item)}`); },
      toHaveLength: (n: number) => { const len = arr === null ? -1 : arr.length; if (len !== n) throw new Error(`toHaveLength ${len} != ${n}`); },
    };
  };
  return {
    harness: {
      test: (name, fn) => { tests.push({ name, fn }); },
      expect: expectImpl,
    },
    run: async () => { for (const t of tests) { try { await t.fn(); } catch (e) { failed = e as Error; } } if (failed) throw failed; },
    testNames: () => tests.map((t) => t.name),
  };
}

const noDisplay: ContractAdapter = { name: "pro-less", createApp: async () => ({ mapObject: {} }), sourceFactory: async () => ({}), fetchStub: () => {}, fetchCalls: () => [], dispose: () => {} };

test("V-P1 displayMode capability が無ければ not-applicable として結果に数える", () => {
  const r = recordingHarness();
  const res: ContractResult = runNegativeRuntime(noDisplay, r.harness);
  expect(res.results[0]?.status).toBe("not-applicable");
  expect(res.results[0]?.id).toBe("CK-MODE-INVALID");
});

test("V-P2 INVALID_DISPLAY_MODE_INPUTS は fixture に閉じ、公開語彙・第 3 語彙を含まない", () => {
  expect(INVALID_DISPLAY_MODE_INPUTS).toHaveLength(3);
  for (const v of INVALID_DISPLAY_MODE_INPUTS) {
    expect(["maplat", "map-warp"].includes(v as string)).toBe(false);
  }
  expect(CONTRACT_ERROR_CODES).toContain("INVALID_DISPLAY_MODE");
  expect(CONTRACT_ERROR_CODES).toContain("MAPBOX_UNSUPPORTED");
});

test("V-N2 isInvalidDisplayModeContractError は name と code の構造判定（class を import しない）", () => {
  expect(isInvalidDisplayModeContractError({ name: "MaplatContractError", code: "INVALID_DISPLAY_MODE" })).toBe(true);
  expect(isInvalidDisplayModeContractError({ name: "Error", code: "INVALID_DISPLAY_MODE" })).toBe(false);
  expect(isInvalidDisplayModeContractError({ name: "MaplatContractError", code: "OTHER" })).toBe(false);
  expect(isInvalidDisplayModeContractError(null)).toBe(false);
});

test("V-N1 capability が在れば 3 値すべて INVALID_DISPLAY_MODE で reject される", async () => {
  const capAdapter: ContractAdapter = { ...noDisplay, displayMode: { set: async (mode) => { throw { name: "MaplatContractError", code: "INVALID_DISPLAY_MODE" }; } } };
  const r = recordingHarness();
  const res = runNegativeRuntime(capAdapter, r.harness);
  await r.run(); // 登録された 4 テスト（empty 検査 + 3 値）が pass すれば throw しない
  expect(res.results[0]?.status).toBe("pass");
  expect(r.testNames().filter((n) => n.startsWith("CK-MODE-INVALID rejects")).length).toBe(3);
});

test("V-N3 値集合が空 → 赤（0 件を緑にしない）", async () => {
  const capAdapter: ContractAdapter = { ...noDisplay, displayMode: { set: async () => {} } };
  const r = recordingHarness();
  runNegativeRuntime(capAdapter, r.harness, []);
  expect(r.testNames().some((n) => n.includes("空でない"))).toBe(true);
  await expect(r.run()).rejects.toThrow();
});