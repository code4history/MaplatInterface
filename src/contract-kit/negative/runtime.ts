// 負の検査の runtime 面（m1-t3 設計 §5.5。C-ERR / C-MODE。invalid-input の拒否）。
// runtime 依存 0・test runner 非依存。`isMaplatContractError` class を import しない（V2: 構造判定）。

import type { ContractAdapter, ContractHarness, ContractResult } from "../types.js";

/** displayMode capability に渡して reject を確認する値の集合（fixture に閉じる — V3。第 3 語彙を含まない）。 */
export const INVALID_DISPLAY_MODE_INPUTS: unknown[] = ["not-a-mode", [0, 1], undefined];

/** C-ERR の `MaplatContractError` の構造判定（name / code の構造。class を import しない — V2）。 */
export function isInvalidDisplayModeContractError(e: unknown): boolean {
  if (e === null || typeof e !== "object") return false;
  const err = e as { name?: unknown; code?: unknown };
  return err.name === "MaplatContractError" && err.code === "INVALID_DISPLAY_MODE";
}

/** C-ERR の error code 語彙（判定に使う唯一の集合。公開語彙の `INVALID_DISPLAY_MODE` と `MAPBOX_UNSUPPORTED`）。 */
export const CONTRACT_ERROR_CODES = ["MAPBOX_UNSUPPORTED", "INVALID_DISPLAY_MODE", "UNSUPPORTED_OPTION"] as const;

/**
 * displayMode capability が在る adapter に invalid 値を渡し、`INVALID_DISPLAY_MODE` で reject されることを測る（V0〜V4）。
 * capability 無しは `not-applicable` として**結果に数える**（skip しない）。
 */
export function runNegativeRuntime(adapter: ContractAdapter, harness: ContractHarness, invalidInputs: unknown[] = INVALID_DISPLAY_MODE_INPUTS): ContractResult {
  const cap = adapter.displayMode;
  // V0: capability 無し → not-applicable（結果に数える）
  if (!cap) {
    harness.test("runNegativeRuntime: displayMode capability が無い（not-applicable）", () => {
      harness.expect(adapter.displayMode).toBe(undefined);
    });
    return { adapter: adapter.name, results: [{ id: "CK-MODE-INVALID", status: "not-applicable", detail: "displayMode capability が無い" }] };
  }
  // V4: 値集合が空 → 赤（0 件を緑にしない）
  harness.test("runNegativeRuntime: invalid-input の値集合が空でない", () => {
    harness.expect(invalidInputs.length > 0).toBe(true);
  });
  // V1 + V2: 各値が INVALID_DISPLAY_MODE の MaplatContractError 構造で reject される
  for (const v of invalidInputs) {
    harness.test(`CK-MODE-INVALID rejects ${JSON.stringify(v)} (INVALID_DISPLAY_MODE)`, async () => {
      let err: unknown;
      try { await cap.set(v); } catch (e) { err = e; }
      harness.expect(isInvalidDisplayModeContractError(err)).toBe(true);
    });
  }
  return { adapter: adapter.name, results: [{ id: "CK-MODE-INVALID", status: "pass", detail: `displayMode capability 有り（values=${invalidInputs.length}）` }] };
}