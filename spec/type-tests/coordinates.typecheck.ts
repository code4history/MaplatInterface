// 座標型の型テスト（m1-t2 設計 §5.4 / §6.3 手順 1）: MapCoordinate は [number, number] の tuple であり number[] を受け取らない。
// 座標型どうしは構造的に同形（相互に区別されない）— これは契約の事実であり、JSDoc の座標系表記が唯一の区別である。
import type { LngLat, MapCoordinate, MapXy, MercCoordinate, ScreenPixel, SysCoord } from "../../src/core/index.js";

declare const arr: number[];
// @ts-expect-error number[] は tuple [number, number] に代入できない（Core adapter が narrow する — 設計 §5.4）
export const _c1: MapCoordinate = arr;
// @ts-expect-error 要素数 3 の tuple は [number, number] に代入できない
export const _c2: MapCoordinate = [0, 1, 2] as [number, number, number];

declare const px: ScreenPixel;
declare const mc: MercCoordinate;
declare const sc: SysCoord;
declare const xy: MapXy;
export const _a1: MapCoordinate = px;
export const _a2: LngLat = mc;
export const _a3: MapXy = sc;
export const _a4: SysCoord = xy;
