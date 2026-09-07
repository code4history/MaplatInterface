// 地図 object の契約（C-IFACE。m1-t2 設計 §5.1 `map.ts`）。描画エンジンの class 型は Interface に現れない — すべて構造型（`*Like`）。
import type { LngLat, MapCoordinate, ScreenPixel } from "./coordinates.js";
import type { MaplatSourceInterface } from "./source.js";

/** 地図 object のイベント名（consumer が購読するもの）。 */
export type MaplatMapEventName = "moveend" | "click_control";

/** 地図 object のイベント（構造型）。`click_control` では `control` または `frameState.control` に control が入る。 */
export interface MaplatMapEventLike extends Record<string, unknown> {
  type: string;
  control?: unknown;
  frameState?: unknown;
}

/** 地図に足す control の面（構造型）。 */
export interface MaplatMapControlLike {
  setMap(map: unknown): void;
  element?: HTMLElement;
}

/** 線のスタイル。`color` は CSS 色文字列または `[r, g, b, a?]`。 */
export interface MaplatStrokeStyle {
  color?: string | number[];
  width?: number;
  lineDash?: number[];
}

/** 塗りのスタイル。`color` は CSS 色文字列または `[r, g, b, a?]`。 */
export interface MaplatFillStyle {
  color?: string | number[];
}

/** 画像スタイルの面（marker の icon）。`getSrc()` は URL（未設定なら `undefined`）。 */
export interface MaplatImageStyleLike {
  getSrc(): string | undefined;
}

/** feature スタイルの面。`getImage()` は画像スタイルまたは `null`。 */
export interface MaplatFeatureStyleLike {
  getImage(): MaplatImageStyleLike | null;
}

/** feature の面。geometry は Point（marker）だけを契約する。`getCoordinates()` は {@link MapCoordinate}。 */
export interface MaplatFeatureLike {
  getGeometry(): { getCoordinates(): MapCoordinate } | undefined;
  get(key: string): unknown;
  getProperties(): Record<string, unknown>;
  getStyle(): MaplatFeatureStyleLike | undefined;
}

/** vector source の面（名前付き vector layer の source）。 */
export interface MaplatVectorSourceLike {
  getFeatures(): readonly MaplatFeatureLike[];
}

/** view の面。`getCenter()` は現在の map view projection の {@link MapCoordinate}（未設定なら `undefined`）。 */
export interface MaplatViewLike {
  getCenter(): MapCoordinate | undefined;
  getZoom(): number | undefined;
}

/** `setEnvelope` / `setFillEnvelope` が返す handle。`removeEnvelope` に渡す。 */
export type MaplatEnvelopeHandle = MaplatFeatureLike;

/**
 * 地図 object の契約（`MaplatCoreInterface.mapObject` の型）。member は manifest の `map-member` のうち shared-contract の全件。
 * 座標の引数・戻り値は {@link MapCoordinate}（現在の map view projection）と {@link ScreenPixel}（viewport の CSS px）。
 */
export interface MaplatMapInterface {
  /** @see manifest map-member:on — イベント購読。戻り値は consumer が使わない ∴ `unknown`。 */
  on(type: MaplatMapEventName, listener: (evt: MaplatMapEventLike) => void): unknown;
  /** @see manifest map-member:getViewport — 地図の viewport 要素。 */
  getViewport(): HTMLElement;
  /** @see manifest map-member:getEventPixel — DOM イベント（または clientX / clientY を持つ object）から viewport 上の pixel を得る。 */
  getEventPixel(evt: UIEvent | { clientX: number; clientY: number }): ScreenPixel;
  /** @see manifest map-member:getCoordinateFromPixel — viewport の pixel を現在の map view projection の座標へ。非 null（adapter は `undefined` を返さない）。 */
  getCoordinateFromPixel(pixel: ScreenPixel): MapCoordinate;
  /** @see manifest map-member:getPixelFromCoordinate — 座標を viewport の pixel へ。描画前など pixel が得られないときは `null`。 */
  getPixelFromCoordinate(coord: MapCoordinate): ScreenPixel | null;
  /** @see manifest map-member:addControl — control を地図に足す。 */
  addControl(control: MaplatMapControlLike): void;
  /** @see manifest map-member:setTransparency — 古地図レイヤの透過率（0〜100 の百分率）。 */
  setTransparency(percentage: number): void;
  /** @see manifest map-member:setEnvelope — 範囲枡（envelope）を線で描き handle を返す。`layer` 省略時の既定は envelope レイヤ。 */
  setEnvelope(xys: MapCoordinate[], stroke: MaplatStrokeStyle | null, layer?: string): MaplatEnvelopeHandle;
  /** @see manifest map-member:resetEnvelope — envelope レイヤを全消去する。 */
  resetEnvelope(layer?: string): void;
  /**
   * @see manifest map-member:getSource — 名前付き vector layer（`"marker"` 等）の source。layer が無ければ `undefined`。
   * 契約が観測するのは名前付き vector layer だけ。`name` 省略時の Core 既定（tile source）は契約外。
   */
  getSource(name?: string): MaplatVectorSourceLike | undefined;
  /** @see manifest map-member:getView — view の面。 */
  getView(): MaplatViewLike;
  /** @see manifest map-member:removeEnvelope — handle で指定した envelope を消す（optional。consumer は存在確認して呼ぶ）。 */
  removeEnvelope?(handle: MaplatEnvelopeHandle, layer?: string): void;
  /** @see manifest map-member:setFillEnvelope — 塗りつきの envelope を描き handle を返す（optional。consumer は存在確認して呼ぶ）。 */
  setFillEnvelope?(xys: MapCoordinate[], stroke: MaplatStrokeStyle | null, fill: MaplatFillStyle | null, layer?: string): MaplatEnvelopeHandle;
}

/**
 * 地図 object の構築 option（Core の実装が読み取る key の全数。残りは index signature で受ける）。
 * `defaultRotation` は radian（view の回転）。`defaultCenter` は {@link MapCoordinate}。
 */
export interface MaplatMapOption extends Record<string, unknown> {
  div?: string | HTMLElement;
  target?: string | HTMLElement;
  source?: MaplatSourceInterface;
  controls?: MaplatMapControlLike[];
  defaultCenter?: MapCoordinate;
  defaultZoom?: number;
  /** 初期回転。単位は radian。 */
  defaultRotation?: number;
  interactions?: unknown;
  fakeGps?: LngLat;
  fakeRadius?: number;
  homePosition?: LngLat;
  northUp?: boolean;
  tapDuration?: number;
  homeMarginPixels?: number;
  tapUIVanish?: boolean;
  alwaysGpsOn?: boolean;
}

/**
 * `export:MaplatMap`（shared-contract。人間決定 2026-09-06）の宣言 — engine-neutral な**構築契約**。
 * `new MaplatMap(option)` の戻り値が {@link MaplatMapInterface} を満たすことだけを約束する。
 * Core の実装 class は描画エンジンの Map 派生 class だが、契約は構築結果の面に限る（Pro は自前 class で満たす）。
 * 契約が約束する到達経路は package root の export（`export:MaplatMap`）であり、実装 path への deep import は契約外。
 * @see manifest export:MaplatMap
 */
export interface MaplatMapConstructor {
  new (option: MaplatMapOption): MaplatMapInterface;
}
