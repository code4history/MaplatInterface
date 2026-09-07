// source の契約（C-IFACE。m1-t2 設計 §5.1 `source.ts`）。member は manifest の `source-member` のうち shared-contract の全件。
// Core の宣言行が static の member（createAsync / isBasemap / isWmts / isMapLibre）は class 側の面 MaplatSourceStaticLike に置く。
import type { LngLat, MapXy, MercCoordinate, ScreenSize, SysCoord, ViewpointArray } from "./coordinates.js";
import type { MaplatMapControlLike } from "./map.js";
import type { MaplatPoi, MaplatPoiLayer, MaplatPoiLayers } from "./poi.js";
import type { MaplatTileCacheProgress, MaplatTileCacheSize, MaplatTileCacheStats } from "./cache.js";

/** 中心と周囲 4 点の座標列と、その画面サイズ（`[C[], ScreenSize?]`）。 */
export type CrossCoordinatesArray<C> = [coords: C[], size?: ScreenSize];

/** 視点の object 表現。角度（`direction` / `rotation`）は**度**（Core が radian へ変換する）。 */
export interface MaplatViewpointObject {
  x?: number;
  y?: number;
  latitude?: number;
  longitude?: number;
  mercZoom?: number;
  zoom?: number;
  /** 実世界方位角。単位は度。 */
  direction?: number;
  /** 画面回転角。単位は度。 */
  rotation?: number;
}

/** GPS 位置（`lnglat` は {@link LngLat}、`acc` は精度 m）。 */
export interface MaplatGpsPosition {
  lnglat: LngLat;
  acc: number;
}

/** source の範囲を表す GeoJSON Feature（Polygon。座標は {@link MercCoordinate}）。 */
export interface MaplatEnvelopeGeoJson {
  type: "Feature";
  geometry: { type: "Polygon"; coordinates: MercCoordinate[][] };
  properties: unknown;
}

// ---- source 入力 grammar（C-MANIFEST の data contract SRC-F1〜SRC-F5。m1 設計 §3.3 / outer ADR-0017 との関係は §11.1） ----

/** SRC-F1: bare string（`baseDict` の key: `osm` / `gsi` / `gsi_ortho`）→ base map の設定へ展開される。 */
export type MaplatSourceBareStringInput = string;

/** SRC-F2: inline `maptype`（WMTS 系。`base` / `overlay`）→ setting file の fetch 無しで生成される。 */
export interface MaplatSourceInlineInput extends Record<string, unknown> {
  mapID: string;
  maptype: string;
  url?: string;
  urls?: string[];
}

/**
 * SRC-F3: `settingFile` 明示 + app override → fetch 後に `Object.assign(resp, options)`（app element が勝つ = override precedence）。
 * ADR-0017（app sources reference a setting file）の viewer 側受理形。
 */
export interface MaplatSourceSettingFileRef extends Record<string, unknown> {
  mapID: string;
  settingFile: string;
}

/** SRC-F4: `settingFile` 省略 → 既定 path `maps/<mapID>.json` を fetch、`maptype` 既定は `maplat`。 */
export interface MaplatSourceMapIdRef extends Record<string, unknown> {
  mapID: string;
  settingFile?: undefined;
}

/**
 * SRC-F5: `noload` inline → setting を fetch せず生成する。ADR-0017 は Editor の出力文法であり viewer の受理文法の全数ではない ∴
 * 受理するが Editor は出力しない legacy input（除去予定なし）。
 */
export interface MaplatSourceNoloadInput extends Record<string, unknown> {
  mapID: string;
  noload: true;
}

/** data contract の機械導出名（`data-contract:SRC-F1`〜`SRC-F5` の被覆先）。読みやすい名の alias。 */
export type MaplatSourceInputF1 = MaplatSourceBareStringInput;
export type MaplatSourceInputF2 = MaplatSourceInlineInput;
export type MaplatSourceInputF3 = MaplatSourceSettingFileRef;
export type MaplatSourceInputF4 = MaplatSourceMapIdRef;
export type MaplatSourceInputF5 = MaplatSourceNoloadInput;

/** source 入力の 5 形の union（F1〜F5。すべて `MapSourceFactoryInterface` の第 1 引数へ渡せる — 型テスト T-S1）。 */
export type MaplatSourceInput = MaplatSourceBareStringInput | MaplatSourceInlineInput | MaplatSourceSettingFileRef | MaplatSourceMapIdRef | MaplatSourceNoloadInput;

/** factory の第 2 引数（app 全体に共通の option）。 */
export type MaplatSourceCommonOptions = Record<string, unknown>;

/**
 * source の生成関数（`export:mapSourceFactory`）。入力 grammar の 5 形（{@link MaplatSourceInput}）を受理し source を返す。
 * @see manifest export:mapSourceFactory
 */
export type MapSourceFactoryInterface = (options: MaplatSourceInput, commonOptions?: MaplatSourceCommonOptions) => Promise<MaplatSourceInterface>;

/**
 * source の instance が満たす面。座標変換の同期 8 種 / 非同期 8 種は {@link MapXy} / {@link SysCoord} / {@link MercCoordinate} の tuple と
 * {@link CrossCoordinatesArray} で受け渡す。
 */
export interface MaplatSourceInterface {
  // ---- 識別・表示 ----
  /** @see manifest source-member:mapID */
  mapID: string;
  /** @see manifest source-member:title */
  title: string;
  /** @see manifest source-member:officialTitle */
  officialTitle: string;
  /** @see manifest source-member:label — bare string 展開では多言語 object になりうる（SRC-F1）。 */
  label: string | Record<string, string>;
  /** @see manifest source-member:thumbnail */
  thumbnail?: string;
  /** @see manifest source-member:icon */
  icon?: string;
  /** @see manifest source-member:selectedIcon */
  selectedIcon?: string;
  /** @see manifest source-member:poiTemplate */
  poiTemplate?: string;
  /** @see manifest source-member:poiStyle */
  poiStyle?: string;
  /** @see manifest source-member:iconTemplate */
  iconTemplate?: string;
  /** @see manifest source-member:startFrom */
  startFrom?: string;
  // ---- 範囲・zoom ----
  /** @see manifest source-member:maxZoom */
  maxZoom?: number;
  /** @see manifest source-member:minZoom */
  minZoom?: number;
  /** @see manifest source-member:mercZoom */
  mercZoom?: number;
  /** @see manifest source-member:defZoom — 画面サイズから既定 zoom を得る。 */
  defZoom(screenSize?: ScreenSize): number;
  /** @see manifest source-member:width — 古地図の画像幅（px）。古地図系 source が持つ。 */
  width?: number;
  /** @see manifest source-member:height — 古地図の画像高さ（px）。古地図系 source が持つ。 */
  height?: number;
  /** @see manifest source-member:envelope — 範囲（{@link MaplatEnvelopeGeoJson}）。 */
  envelope?: MaplatEnvelopeGeoJson;
  /** @see manifest source-member:centroid — 範囲の重心（{@link MercCoordinate}）。 */
  centroid?: MercCoordinate;
  /** @see manifest source-member:homePosition — home 位置（{@link LngLat}）。 */
  homePosition?: LngLat;
  /** @see manifest source-member:homeMarginPixels */
  homeMarginPixels: number;
  /** @see manifest source-member:mercatorXShift */
  mercatorXShift: number;
  /** @see manifest source-member:mercatorYShift */
  mercatorYShift: number;
  /** @see manifest source-member:northUp */
  northUp?: boolean;
  /** @see manifest source-member:tapDuration */
  tapDuration?: number;
  /** @see manifest source-member:controls */
  controls?: MaplatMapControlLike[];
  // ---- 座標変換（同期） ----
  /** @see manifest source-member:xy2SysCoord */
  xy2SysCoord(xy: MapXy): SysCoord;
  /** @see manifest source-member:sysCoord2Xy */
  sysCoord2Xy(sysCoord: SysCoord): MapXy;
  /** @see manifest source-member:sysCoords2Xys */
  sysCoords2Xys(sysCoords: CrossCoordinatesArray<SysCoord>): CrossCoordinatesArray<MapXy>;
  /** @see manifest source-member:xys2SysCoords */
  xys2SysCoords(xys: CrossCoordinatesArray<MapXy>): CrossCoordinatesArray<SysCoord>;
  /** @see manifest source-member:sysCoords2Viewpoint */
  sysCoords2Viewpoint(sysCoords: CrossCoordinatesArray<SysCoord>): ViewpointArray;
  /** @see manifest source-member:mercs2MercViewpoint */
  mercs2MercViewpoint(mercs: CrossCoordinatesArray<MercCoordinate>): ViewpointArray;
  /** @see manifest source-member:viewpoint2SysCoords */
  viewpoint2SysCoords(viewpoint?: ViewpointArray, size?: ScreenSize): CrossCoordinatesArray<SysCoord>;
  /** @see manifest source-member:mercViewpoint2Mercs */
  mercViewpoint2Mercs(viewpoint?: ViewpointArray, size?: ScreenSize): CrossCoordinatesArray<MercCoordinate>;
  // ---- 座標変換（非同期） ----
  /** @see manifest source-member:merc2SysCoordAsync */
  merc2SysCoordAsync(merc: MercCoordinate): Promise<SysCoord>;
  /** @see manifest source-member:sysCoord2MercAsync */
  sysCoord2MercAsync(sysCoord: SysCoord): Promise<MercCoordinate>;
  /** @see manifest source-member:xy2MercAsync */
  xy2MercAsync(xy: MapXy): Promise<MercCoordinate>;
  /** @see manifest source-member:merc2XyAsync */
  merc2XyAsync(merc: MercCoordinate): Promise<MapXy>;
  /** @see manifest source-member:xys2MercsAsync */
  xys2MercsAsync(xys: CrossCoordinatesArray<MapXy>): Promise<CrossCoordinatesArray<MercCoordinate>>;
  /** @see manifest source-member:mercs2XysAsync */
  mercs2XysAsync(mercs: CrossCoordinatesArray<MercCoordinate>): Promise<CrossCoordinatesArray<MapXy>>;
  /** @see manifest source-member:viewpoint2MercsAsync */
  viewpoint2MercsAsync(viewpoint?: ViewpointArray, size?: ScreenSize): Promise<CrossCoordinatesArray<MercCoordinate>>;
  /** @see manifest source-member:mercs2ViewpointAsync */
  mercs2ViewpointAsync(mercs: CrossCoordinatesArray<MercCoordinate>): Promise<ViewpointArray>;
  // ---- 視点操作 ----
  /** @see manifest source-member:setViewpoint — 角度は度。 */
  setViewpoint(cond: MaplatViewpointObject): void;
  /** @see manifest source-member:goHome */
  goHome(): void;
  /** @see manifest source-member:resetRotation */
  resetRotation(): void;
  /** @see manifest source-member:resetDirection */
  resetDirection(): void;
  /** @see manifest source-member:resetCirculation */
  resetCirculation(): void;
  // ---- GPS ----
  /** @see manifest source-member:setGPSMarker */
  setGPSMarker(position: MaplatGpsPosition | undefined, ignoreMove?: boolean): void;
  /** @see manifest source-member:setGPSMarkerAsync — 戻り値は範囲内判定（inside）。 */
  setGPSMarkerAsync(position: MaplatGpsPosition | undefined, ignoreMove?: boolean): Promise<boolean>;
  // ---- POI ----
  /** @see manifest source-member:pois */
  pois: MaplatPoiLayers;
  /** @see manifest source-member:getPoi */
  getPoi(id: string): MaplatPoi | undefined;
  /** @see manifest source-member:addPoi */
  addPoi(data: MaplatPoi, clusterId?: string): unknown;
  /** @see manifest source-member:removePoi */
  removePoi(id: string): void;
  /** @see manifest source-member:clearPoi */
  clearPoi(clusterId?: string): void;
  /** @see manifest source-member:listPoiLayers */
  listPoiLayers(hideOnly?: boolean, nonzero?: boolean): MaplatPoiLayer[];
  /** @see manifest source-member:getPoiLayer */
  getPoiLayer(id: string): MaplatPoiLayer | undefined;
  /** @see manifest source-member:addPoiLayer */
  addPoiLayer(id: string, data: Partial<MaplatPoiLayer>): void;
  /** @see manifest source-member:removePoiLayer */
  removePoiLayer(id: string): void;
  // ---- cache ----
  /** @see manifest source-member:getCacheEnable */
  getCacheEnable(): boolean;
  /** @see manifest source-member:getTileCacheStatsAsync */
  getTileCacheStatsAsync(): Promise<MaplatTileCacheStats>;
  /** @see manifest source-member:getTileCacheSizeAsync */
  getTileCacheSizeAsync(): Promise<MaplatTileCacheSize>;
  /** @see manifest source-member:fetchAllTileCacheAsync */
  fetchAllTileCacheAsync(callback: (progress: MaplatTileCacheProgress) => void): Promise<void>;
  /** @see manifest source-member:cancelTileCacheAsync */
  cancelTileCacheAsync(): Promise<void>;
  /** @see manifest source-member:clearTileCacheAsync */
  clearTileCacheAsync(): Promise<void>;
}

/** base map 系 source の面（Core の `BackmapSource` に対応。`export:BackmapSource` の被覆先）。 */
export interface MaplatBackmapSourceInterface extends MaplatSourceInterface {}

/**
 * source の class（constructor）が満たす面。instance の `constructor` から到達する（`source.constructor.isBasemap()`）。
 * Core の宣言行が static の 4 member（manifest の `source-member`）をここに置く。
 */
export interface MaplatSourceStaticLike {
  /** @see manifest source-member:createAsync — source を非同期に生成する。 */
  createAsync(options: MaplatSourceInlineInput | MaplatSourceNoloadInput | Record<string, unknown>): Promise<MaplatSourceInterface>;
  /** @see manifest source-member:isBasemap — base map 系なら真。{@link MapCoordinate} の projection 分岐に使う。 */
  isBasemap(): boolean;
  /** @see manifest source-member:isWmts — WMTS 系なら真。 */
  isWmts(): boolean;
  /** @see manifest source-member:isMapLibre — MapLibre 系なら真。 */
  isMapLibre(): boolean;
}
