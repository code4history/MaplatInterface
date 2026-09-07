// module 表面と browser global の契約（m1-t2 設計 §5.1 `module.ts`）。
// MaplatCoreModule は package root の export 集合を interface として宣言する（manifest の `export` 項目のうち runtime export）。
// Core / Pro の module object は `import * as m from "@maplat/core"; m satisfies MaplatCoreModule` の形で照合される（型検査は m2 / m3。kit は m1-t3）。
// type-only export 3 件（MaplatSource / BackmapSource / PoiLayer）は runtime member になれない ∴ outer の override 台帳で型へ写す。
import type { MaplatCoreFactory, MaplatCoreInterface, MaplatCoreOption } from "./app.js";
import type { MaplatGpsErrorCode, MaplatGpsResultDetail } from "./events.js";
import type { MaplatMapConstructor } from "./map.js";
import type { MapSourceFactoryInterface } from "./source.js";

/** `export:CustomEvent` の構築契約（`type` と `detail` を持つイベント）。 */
export interface MaplatCustomEventConstructor {
  new (type: string, detail: unknown): { type: string; detail: unknown };
}

/** GPS イベント 3 種の構築契約。 */
export interface MaplatGpsEventConstructors {
  GPSErrorEvent: new (detail: MaplatGpsErrorCode) => { type: "gps_error"; detail: MaplatGpsErrorCode };
  GPSResultEvent: new (detail: MaplatGpsResultDetail) => { type: "gps_result"; detail: MaplatGpsResultDetail };
  GPSRequestEvent: new () => { type: "gps_request" };
}

/** package root の export 集合（module 表面）。 */
export interface MaplatCoreModule {
  /** @see manifest export:MaplatApp */
  MaplatApp: MaplatCoreFactory;
  /** @see manifest export:MaplatMap — engine-neutral な構築契約（人間決定 2026-09-06: shared-contract）。 */
  MaplatMap: MaplatMapConstructor;
  /** @see manifest export:mapSourceFactory */
  mapSourceFactory: MapSourceFactoryInterface;
  /** @see manifest export:CustomEvent */
  CustomEvent: MaplatCustomEventConstructor;
  /** @see manifest export:GPSErrorEvent */
  GPSErrorEvent: MaplatGpsEventConstructors["GPSErrorEvent"];
  /** @see manifest export:GPSResultEvent */
  GPSResultEvent: MaplatGpsEventConstructors["GPSResultEvent"];
  /** @see manifest export:GPSRequestEvent */
  GPSRequestEvent: MaplatGpsEventConstructors["GPSRequestEvent"];
  /** @see manifest export:createElement — HTML 文字列から要素の配列を作る（Core `functions.ts` は fragment の子を配列で返す）。 */
  createElement: (domStr: string) => Node | Node[];
  /** @see manifest export:sanitizeHtml */
  sanitizeHtml: (dirty: string) => string;
  /** @see manifest export:escapeAttr */
  escapeAttr: (value: string) => string;
  /** @see manifest export:toPlainText */
  toPlainText: (value: string) => string;
  /** @see manifest export:buildSlideAttrs */
  buildSlideAttrs: (media: Record<string, unknown>) => string;
  /** @see manifest export:assets — 名前 → data URL。 */
  assets: Record<string, string>;
}

/** browser global（`window.Maplat` / `window.MaplatApp`）。 */
export interface MaplatBrowserGlobals {
  /** @see manifest global:window.Maplat */
  Maplat: { createObject(option: MaplatCoreOption): Promise<MaplatCoreInterface> };
  /** @see manifest global:window.MaplatApp */
  MaplatApp: MaplatCoreFactory;
}
