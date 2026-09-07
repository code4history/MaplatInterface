// POI / layer / 地図メタデータの構造型（m1-t2 設計 §5.1 `poi.ts`）。Core の export 名 `PoiLayer` を保つ。
import type { LngLat, MapXy } from "./coordinates.js";
import type { MaplatFillStyle, MaplatStrokeStyle } from "./map.js";

/** 1 件の POI。位置は `lnglat`（{@link LngLat}）または `longitude` / `latitude`（`lng` / `lat` の短縮も受理）、古地図座標なら `x` / `y`（{@link MapXy} の成分）。 */
export interface MaplatPoi extends Record<string, unknown> {
  /** namespace 付き ID（`<layer 名>#<id>`）。Core が付与する。 */
  namespaceID?: string;
  id?: string | number;
  lnglat?: LngLat;
  longitude?: number;
  latitude?: number;
  lng?: number;
  lat?: number;
  x?: number;
  y?: number;
  name?: string | Record<string, string>;
  desc?: string | Record<string, string>;
  icon?: string;
  selectedIcon?: string;
  image?: string;
  url?: string;
}

/**
 * POI レイヤ（Core の export `PoiLayer` と同名。`@see manifest export:PoiLayer`）。
 * consumer は `pois?.[slug]?.icon` / `.hide` を読む。
 */
export interface PoiLayer extends Record<string, unknown> {
  id: string;
  namespaceID: string;
  name: string | Record<string, string>;
  pois: MaplatPoi[];
  hide?: boolean;
  icon?: string;
  selectedIcon?: string;
}

/** {@link PoiLayer} の別名（Interface 側の命名規約）。 */
export type MaplatPoiLayer = PoiLayer;

/** layer 名 → POI レイヤ。`MaplatCoreInterface.pois` / `MaplatSourceInterface.pois` の型。 */
export type MaplatPoiLayers = Record<string, MaplatPoiLayer>;

/** 地図メタデータの key（Core の `META_KEYS`）。 */
export type MaplatMetaKey =
  | "title"
  | "officialTitle"
  | "author"
  | "createdAt"
  | "era"
  | "contributor"
  | "mapper"
  | "license"
  | "dataLicense"
  | "licenseNote"
  | "dataLicenseNote"
  | "attr"
  | "dataAttr"
  | "reference"
  | "description";

/** `getMapMeta` の戻り値。`mapID` / `label` に META_KEYS の値を足したもの（各値は多言語 object を含みうる ∴ `unknown`）。 */
export interface MaplatMapMeta extends Partial<Record<MaplatMetaKey, unknown>> {
  mapID: string;
  label?: string | Record<string, string>;
}

/** 線（Line）データ。座標は `lnglats`（{@link LngLat}[]）または `xys`（{@link MapXy}[]）のどちらか。 */
export interface MaplatLineData extends Record<string, unknown> {
  lnglats?: LngLat[];
  xys?: MapXy[];
  stroke?: MaplatStrokeStyle;
}

/** vector（Line / Polygon）データ。 */
export interface MaplatVectorData extends MaplatLineData {
  type?: "Line" | "Polygon";
  fill?: MaplatFillStyle;
}
