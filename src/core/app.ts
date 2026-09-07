// Core app の契約（C-IFACE。m1-t2 設計 §5.1 `app.ts`）。member は manifest の `field` / `method` のうち shared-contract の全件、
// `static:createObject` は MaplatCoreFactory。AppData / Restore 相当は Core が export していないため構造型として新規に命名する。
import type { LngLat } from "./coordinates.js";
import type { DisplayModeCapability } from "./display-mode.js";
import type { MaplatCoreEvent, MaplatCoreEventName } from "./events.js";
import type { MaplatMapControlLike, MaplatMapInterface } from "./map.js";
import type { MaplatLineData, MaplatMapMeta, MaplatMetaKey, MaplatPoi, MaplatPoiLayer, MaplatPoiLayers, MaplatVectorData } from "./poi.js";
import type { MaplatGpsPosition, MaplatSourceInput, MaplatSourceInterface, MaplatViewpointObject } from "./source.js";
import type { MaplatTileCacheProgress, MaplatTileCacheSize, MaplatTileCacheStats } from "./cache.js";

/** EventTarget の面（型付きイベント）。Core app は EventTarget を継承し、consumer はここへ listener を足す。 */
export interface MaplatEventTargetLike {
  addEventListener<K extends MaplatCoreEventName>(type: K, listener: (evt: MaplatCoreEvent<K>) => void): void;
  removeEventListener<K extends MaplatCoreEventName>(type: K, listener: (evt: MaplatCoreEvent<K>) => void): void;
  dispatchEvent(evt: unknown): boolean | void;
}

/** 位置の保存形（`x` / `y` は {@link MapCoordinate} の成分。`rotation` は度）。 */
export interface MaplatPositionSet {
  x: number;
  y: number;
  zoom: number;
  /** 画面回転角。単位は度。 */
  rotation: number;
}

/** 復元状態（Core の Restore 相当）。 */
export interface MaplatRestoreState {
  mapID?: string;
  backgroundID?: string;
  position?: MaplatPositionSet;
  transparency?: number;
  hideMarker?: number;
  hideLayer?: string;
}

/** ライフサイクルの phase ID（7 値）。イベント名は `lifecycle:<phase>`。 */
export type MaplatLifecyclePhaseId =
  | "setting-loaded"
  | "appdata-ready"
  | "ui-configure"
  | "core-dom-ready"
  | "ui-dom-ready"
  | "core-ready"
  | "ui-ready";

/** ライフサイクルイベントの detail。 */
export interface MaplatLifecycleContext {
  phaseId: MaplatLifecyclePhaseId;
  appData?: MaplatAppData;
  mapDivDocument?: HTMLElement | null;
  core: MaplatCoreInterface;
  uiHookResults?: Partial<Record<MaplatLifecyclePhaseId, unknown>>;
  uiHookResult?: unknown;
}

/** app 設定（Core の AppData 相当）。`sources` は source 入力 grammar の 5 形（{@link MaplatSourceInput}）。 */
export interface MaplatAppData {
  sources: MaplatSourceInput[];
  lang?: string;
  /** POI 定義（app 設定の形。Core が layer へ正規化する）。 */
  pois?: unknown;
  homePosition?: LngLat;
  defaultZoom?: number;
  zoomRestriction?: boolean;
  minZoom?: number;
  maxZoom?: number;
  /** app 名（多言語 object を受ける）。 */
  appName?: string | Record<string, string>;
  fakeGps?: LngLat;
  fakeRadius?: number;
  noRotate?: boolean;
  poiTemplate?: string;
  poiStyle?: string;
  iconTemplate?: string;
  startFrom?: string;
  controls?: MaplatMapControlLike[];
  northUp?: boolean;
  tapDuration?: number;
  homeMarginPixels: number;
  tapUIVanish: boolean;
}

/** `currentMapInfo` / `mapInfo` の戻り値（`mapID` + META_KEYS の値）。 */
export interface MaplatMapInfo extends Partial<Record<MaplatMetaKey, unknown>> {
  mapID: string;
}

/** Core app の構築 option（consumer が渡す key を名指しし、残りは index signature で受ける。全体の確定は facade の担当）。 */
export interface MaplatCoreOption extends Record<string, unknown> {
  appid?: string;
  setting?: MaplatAppData;
  mapDiv?: string;
  restoreSession?: boolean;
  enableCache?: boolean;
  translateUI?: boolean;
  noRotate?: boolean;
  fakeGps?: LngLat;
  fakeRadius?: number;
  alwaysGpsOn?: boolean;
  stateUrl?: boolean;
}

/**
 * Core app（instance）の契約。Core と Pro の両方が `implements` する。
 * 座標の意味は {@link LngLat} / {@link MapCoordinate} 等の座標型の JSDoc に委ねる。
 */
export interface MaplatCoreInterface extends MaplatEventTargetLike {
  // ---- field ----
  /** @see manifest field:appid */
  appid: string;
  /** @see manifest field:translateUI */
  translateUI: boolean;
  /** @see manifest field:noRotate */
  noRotate: boolean;
  /** @see manifest field:initialRestore */
  initialRestore: MaplatRestoreState;
  /** @see manifest field:mapDiv — 地図を置く要素の id。 */
  mapDiv: string;
  /** @see manifest field:restoreSession */
  restoreSession: boolean;
  /** @see manifest field:enableCache */
  enableCache: boolean;
  /** @see manifest field:stateBuffer */
  stateBuffer: MaplatRestoreState;
  /** @see manifest field:overlay */
  overlay: boolean;
  /** @see manifest field:waitReady — 初期化完了で app 自身を返す。`createObject` はこれを待つ。 */
  waitReady: Promise<MaplatCoreInterface>;
  /** @see manifest field:appData */
  appData: MaplatAppData | undefined;
  /** @see manifest field:appName — 多言語 object を受ける。 */
  appName: string | Record<string, string> | undefined;
  /** @see manifest field:cacheHash — mapID → source。 */
  cacheHash: Record<string, MaplatSourceInterface>;
  /** @see manifest field:startFrom */
  startFrom?: string;
  /** @see manifest field:from — 現在の source。 */
  from: MaplatSourceInterface | undefined;
  /** @see manifest field:mapDivDocument */
  mapDivDocument: HTMLElement | null;
  /** @see manifest field:mapObject — 地図 object（必須・非 nullable。C-IFACE）。 */
  mapObject: MaplatMapInterface;
  /** @see manifest field:googleApiKey */
  googleApiKey?: string;
  /** @see manifest field:pois — layer 名 → POI レイヤ。 */
  pois: MaplatPoiLayers;
  /** @see manifest field:poiTemplate */
  poiTemplate?: string;
  /** @see manifest field:poiStyle */
  poiStyle?: string;
  /** @see manifest field:iconTemplate */
  iconTemplate?: string;
  /** @see manifest field:icon */
  icon?: string;
  /** @see manifest field:selectedIcon */
  selectedIcon?: string;
  /** @see manifest field:fakeGps */
  fakeGps: boolean;
  /** @see manifest field:fakeRadius */
  fakeRadius?: number;
  /** @see manifest field:homePosition — {@link LngLat} */
  homePosition?: LngLat;
  /** @see manifest field:geolocation — 位置取得の実装 object。engine-neutral に開かない ∴ `unknown`。 */
  geolocation?: unknown;
  /** @see manifest field:alwaysGpsOn */
  alwaysGpsOn: boolean;
  /** 表示モード capability（C-MODE (i)。optional。Core は実装しない ∴ `undefined`）。manifest 項目ではない。 */
  displayMode?: DisplayModeCapability;
  // ---- method ----
  /** @see manifest method:changeMap */
  changeMap(mapID: string, restore?: MaplatRestoreState): Promise<void>;
  /** @see manifest method:requestUpdateState */
  requestUpdateState(data: MaplatRestoreState): void;
  /** @see manifest method:setTransparency — 0〜100 の百分率。 */
  setTransparency(percentage: number): void;
  /** @see manifest method:getTransparency */
  getTransparency(): number;
  /** @see manifest method:getRotation — 現在の画面回転角。単位は度。 */
  getRotation(): number;
  /** @see manifest method:getDirection — 現在の実世界方位角。単位は度。 */
  getDirection(): Promise<number>;
  /** @see manifest method:clientPointToLngLat — client 座標（`getBoundingClientRect` 基準の CSS px）→ 経緯度。 */
  clientPointToLngLat(clientX: number, clientY: number): Promise<{ longitude: number; latitude: number } | undefined>;
  /** @see manifest method:lngLatToClientPoint — 経緯度 → client 座標（CSS px）。 */
  lngLatToClientPoint(longitude: number, latitude: number): Promise<{ x: number; y: number } | undefined>;
  /** @see manifest method:setViewpoint — 角度は度。 */
  setViewpoint(cond: MaplatViewpointObject): void;
  /** @see manifest method:goHome */
  goHome(useTo?: MaplatSourceInterface): void;
  /** @see manifest method:resetRotation */
  resetRotation(): void;
  /** @see manifest method:resetDirection */
  resetDirection(): void;
  /** @see manifest method:resetCirculation */
  resetCirculation(): void;
  /** @see manifest method:getMapMeta — 省略時は現在の source。 */
  getMapMeta(mapID?: string): MaplatMapMeta | undefined;
  /** @see manifest method:currentMapInfo */
  currentMapInfo(): MaplatMapInfo | undefined;
  /** @see manifest method:mapInfo */
  mapInfo(mapID: string): MaplatMapInfo | undefined;
  /** @see manifest method:setMarker */
  setMarker(data: MaplatPoi): Promise<void>;
  /** @see manifest method:addMarker — 付与した namespaceID を返す。 */
  addMarker(data: MaplatPoi, clusterId?: string): string | undefined;
  /** @see manifest method:updateMarker */
  updateMarker(id: string, data: Partial<MaplatPoi>, overwrite?: boolean): void;
  /** @see manifest method:getMarker */
  getMarker(id: string): MaplatPoi | undefined;
  /** @see manifest method:removeMarker */
  removeMarker(id: string): void;
  /** @see manifest method:clearMarker */
  clearMarker(clusterId?: string): void;
  /** @see manifest method:selectMarker */
  selectMarker(id: string): void;
  /** @see manifest method:unselectMarker */
  unselectMarker(): void;
  /** @see manifest method:redrawMarkers */
  redrawMarkers(source?: MaplatSourceInterface): void;
  /** @see manifest method:resetMarker */
  resetMarker(): void;
  /** @see manifest method:showAllMarkers */
  showAllMarkers(): void;
  /** @see manifest method:hideAllMarkers */
  hideAllMarkers(): void;
  /** @see manifest method:listPoiLayers */
  listPoiLayers(hideOnly?: boolean, nonzero?: boolean): MaplatPoiLayer[];
  /** @see manifest method:getPoiLayer */
  getPoiLayer(id: string): MaplatPoiLayer | undefined;
  /** @see manifest method:addPoiLayer */
  addPoiLayer(id: string, data: Partial<MaplatPoiLayer>): void;
  /** @see manifest method:removePoiLayer */
  removePoiLayer(id: string): void;
  /** @see manifest method:showPoiLayer */
  showPoiLayer(id: string): void;
  /** @see manifest method:hidePoiLayer */
  hidePoiLayer(id: string): void;
  /** @see manifest method:setLine */
  setLine(data: MaplatLineData): void;
  /** @see manifest method:setVector */
  setVector(data: MaplatVectorData): void;
  /** @see manifest method:addLine */
  addLine(data: MaplatLineData): void;
  /** @see manifest method:addVector */
  addVector(data: MaplatVectorData): void;
  /** @see manifest method:resetLine */
  resetLine(): void;
  /** @see manifest method:resetVector */
  resetVector(): void;
  /** @see manifest method:clearLine */
  clearLine(): void;
  /** @see manifest method:clearVector */
  clearVector(): void;
  /** @see manifest method:handleGPS */
  handleGPS(enable: boolean, avoidEventForOff?: boolean): void;
  /** @see manifest method:getGPSEnabled */
  getGPSEnabled(): boolean;
  /** @see manifest method:setGPSMarker */
  setGPSMarker(position: MaplatGpsPosition | undefined): void;
  /** @see manifest method:getMapCacheEnable */
  getMapCacheEnable(mapID: string): boolean;
  /** @see manifest method:getMapTileCacheStatsAsync */
  getMapTileCacheStatsAsync(mapID: string): Promise<MaplatTileCacheStats>;
  /** @see manifest method:getMapTileCacheSizeAsync */
  getMapTileCacheSizeAsync(mapID: string): Promise<MaplatTileCacheSize>;
  /** @see manifest method:clearMapTileCacheAsync */
  clearMapTileCacheAsync(mapID: string): Promise<void>;
  /** @see manifest method:fetchAllMapTileCacheAsync */
  fetchAllMapTileCacheAsync(mapID: string, callback: (progress: MaplatTileCacheProgress) => void): Promise<void>;
  /** @see manifest method:cancelMapTileCacheAsync */
  cancelMapTileCacheAsync(mapID: string): Promise<void>;
  /** @see manifest method:remove — app を破棄する。 */
  remove(): void;
}

/**
 * Core app の class（constructor）側の契約。`static:createObject` の被覆先。
 * `export:MaplatApp` の module 表面上の型（{@link MaplatCoreModule}）でもある。
 */
export interface MaplatCoreFactory {
  new (option: MaplatCoreOption): MaplatCoreInterface;
  /** @see manifest static:createObject — 生成して `waitReady` を待ち、app を返す。 */
  createObject(option: MaplatCoreOption): Promise<MaplatCoreInterface>;
}
