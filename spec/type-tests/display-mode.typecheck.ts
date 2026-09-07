// C-MODE の型テスト（m1-t2 設計 §5.2。typecheck の対象 — tsconfig の include spec/**/*。ファイル名 *.typecheck.ts は vitest の対象外）。
// 歯: 公開語彙に第 3 の member を足すと T-1 / T-2 が赤、@ts-expect-error の対象エラーが消えると TS2578 で T-3 が赤（設計 §2.5 の probe で実測済み）。
import { PUBLIC_DISPLAY_MODES, type PublicDisplayMode } from "../../src/core/index.js";

// T-1 公開語彙は 2 値ちょうど（member が増えると never に代入できず赤）
type _Exhaustive = Exclude<PublicDisplayMode, "maplat" | "map-warp">;
export const _tExhaustive: never = null! as _Exhaustive;

// T-2 実行時定数も型レベルで 2 要素（要素が増えると 3 は 2 に代入できず赤）
export const _tLength: 2 = PUBLIC_DISPLAY_MODES.length;

// T-3 数値 tuple は公開語彙に代入できない（代入が通るようになると directive が余り TS2578 で赤）
// @ts-expect-error 数値 tuple は PublicDisplayMode ではない
export const _tTuple: PublicDisplayMode = [0, 1] as unknown as [number, number];

// T-4 定数配列の要素は union の member（satisfies と対）
export const _tMember: PublicDisplayMode = PUBLIC_DISPLAY_MODES[0];
