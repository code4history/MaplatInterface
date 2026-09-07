// イベント契約（C-IFACE。m1-t2 設計 §5.1 `events.ts`）。`MaplatCoreEventName` は manifest の `event` 項目（shared-contract）の名の string literal union、
// `MaplatCoreEventDetailMap` は同じ名を key に持つ detail 型の map（両方が要る — --declaration D3）。
import type { LngLat, MapCoordinate, MercCoordinate } from "./coordinates.js";
import type { MaplatLifecycleContext, MaplatLifecyclePhaseId, MaplatRestoreState } from "./app.js";
import type { MaplatMapMeta, MaplatPoi } from "./poi.js";
import type { MaplatSourceInterface } from "./source.js";

/** `changeViewpoint` の detail。`x` / `y` は {@link MapCoordinate} の成分。`direction` / `rotation` は度。 */
export interface MaplatChangeViewpointDetail {
  x: number;
  y: number;
  longitude: number;
  latitude: number;
  mercator_x: number;
  mercator_y: number;
  zoom: number;
  mercZoom: number;
  /** 実世界方位角。単位は度。 */
  direction: number;
  /** 画面回転角。単位は度。 */
  rotation: number;
}

/** `clickMap` の detail（経緯度）。 */
export interface MaplatClickMapDetail {
  longitude: number;
  latitude: number;
}

/** `gps_error` の detail。 */
export type MaplatGpsErrorCode = "user_gps_deny" | "gps_miss" | "gps_timeout";

/** `gps_result` の detail。位置が得られたら `lnglat` / `acc`、得られなければ `error`。 */
export type MaplatGpsResultDetail = { lnglat: LngLat; acc: number } | { error: "gps_out" | "gps_out_hide" | "gps_off" };

/** Core が dispatch するイベント名の全数（manifest の `event` 項目。shared-contract）。 */
export type MaplatCoreEventName =
  | "changeViewpoint"
  | "clickMap"
  | "clickMapMerc"
  | "clickMapXy"
  | "clickMarker"
  | "clickMarkers"
  | "gps_error"
  | "gps_request"
  | "gps_result"
  | "lifecycle:appdata-ready"
  | "lifecycle:core-dom-ready"
  | "lifecycle:core-ready"
  | "lifecycle:error"
  | "lifecycle:setting-loaded"
  | "lifecycle:ui-configure"
  | "lifecycle:ui-dom-ready"
  | "lifecycle:ui-ready"
  | "mapChanged"
  | "outOfMap"
  | "poi_number"
  | "pointerMoveOnMapMerc"
  | "pointerMoveOnMapXy"
  | "sourceLoaded"
  | "updateState";

/** イベント名 → detail 型。 */
export interface MaplatCoreEventDetailMap {
  /** @see manifest event:changeViewpoint */
  changeViewpoint: MaplatChangeViewpointDetail;
  /** @see manifest event:clickMap */
  clickMap: MaplatClickMapDetail;
  /** @see manifest event:clickMapMerc — {@link MercCoordinate} */
  clickMapMerc: MercCoordinate;
  /** @see manifest event:clickMapXy — {@link MapCoordinate}（`getCoordinateFromPixel` の値） */
  clickMapXy: MapCoordinate;
  /** @see manifest event:clickMarker */
  clickMarker: MaplatPoi;
  /** @see manifest event:clickMarkers */
  clickMarkers: MaplatPoi[];
  /** @see manifest event:gps_error */
  gps_error: MaplatGpsErrorCode;
  /** @see manifest event:gps_request — detail 無し */
  gps_request: undefined;
  /** @see manifest event:gps_result */
  gps_result: MaplatGpsResultDetail;
  /** @see manifest event:lifecycle:appdata-ready */
  "lifecycle:appdata-ready": MaplatLifecycleContext;
  /** @see manifest event:lifecycle:core-dom-ready */
  "lifecycle:core-dom-ready": MaplatLifecycleContext;
  /** @see manifest event:lifecycle:core-ready */
  "lifecycle:core-ready": MaplatLifecycleContext;
  /** @see manifest event:lifecycle:error */
  "lifecycle:error": { phaseId: MaplatLifecyclePhaseId; error: unknown };
  /** @see manifest event:lifecycle:setting-loaded */
  "lifecycle:setting-loaded": MaplatLifecycleContext;
  /** @see manifest event:lifecycle:ui-configure */
  "lifecycle:ui-configure": MaplatLifecycleContext;
  /** @see manifest event:lifecycle:ui-dom-ready */
  "lifecycle:ui-dom-ready": MaplatLifecycleContext;
  /** @see manifest event:lifecycle:ui-ready */
  "lifecycle:ui-ready": MaplatLifecycleContext;
  /** @see manifest event:mapChanged — `getMapMeta` の値 */
  mapChanged: MaplatMapMeta | undefined;
  /** @see manifest event:outOfMap — 空 object */
  outOfMap: Record<string, never>;
  /** @see manifest event:poi_number — 表示中 POI の総数 */
  poi_number: number;
  /** @see manifest event:pointerMoveOnMapMerc — {@link MercCoordinate} */
  pointerMoveOnMapMerc: MercCoordinate;
  /** @see manifest event:pointerMoveOnMapXy — {@link MapCoordinate} */
  pointerMoveOnMapXy: MapCoordinate;
  /** @see manifest event:sourceLoaded */
  sourceLoaded: MaplatSourceInterface[];
  /** @see manifest event:updateState — `stateBuffer` */
  updateState: MaplatRestoreState;
}

/** Core が dispatch するイベント（`type` と `detail` を持つ構造型）。 */
export interface MaplatCoreEvent<K extends MaplatCoreEventName = MaplatCoreEventName> {
  type: K;
  detail: MaplatCoreEventDetailMap[K];
}
