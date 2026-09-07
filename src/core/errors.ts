// error 契約（C-ERR。m1 設計 §7.5 / m1-t2 設計 §5.3）。class は export しない（実装は Core / Pro）。runtime 関数は純関数 1 つだけ（sideEffects: false）。

/**
 * 契約 error の code。
 * - `MAPBOX_UNSUPPORTED`: Pro が `maptype: "mapbox"` の source、`mapboxgl` / `mapboxToken` option を受けたとき明示 reject する（黙って無視しない）。Core は従来どおり受理する
 * - `INVALID_DISPLAY_MODE`: `setDisplayMode` に、contract kit の fixture が列挙する受理できない値が渡されたとき。公開語彙以外の一律 reject は契約しない
 * - `UNSUPPORTED_OPTION`: 契約が対応しないと定める option を受けたとき
 */
export type MaplatContractErrorCode = "MAPBOX_UNSUPPORTED" | "INVALID_DISPLAY_MODE" | "UNSUPPORTED_OPTION";

/** 契約 error の形（構造型）。`name` は固定文字列、`code` は 3 値のいずれか、`detail` は実装が任意に付ける補助情報。 */
export interface MaplatContractError extends Error {
  name: "MaplatContractError";
  code: MaplatContractErrorCode;
  detail?: unknown;
}

const CODES: readonly string[] = ["MAPBOX_UNSUPPORTED", "INVALID_DISPLAY_MODE", "UNSUPPORTED_OPTION"];

/** 構造判定: `name === "MaplatContractError"` かつ `code` が 3 値のいずれか。class の instanceof に依らない（Core / Pro のどちらの実装でも成立する）。 */
export function isMaplatContractError(e: unknown): e is MaplatContractError {
  if (typeof e !== "object" || e === null) return false;
  const o = e as { name?: unknown; code?: unknown };
  return o.name === "MaplatContractError" && typeof o.code === "string" && CODES.includes(o.code);
}
