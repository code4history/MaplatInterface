// 座標型（@maplat/interface/core。C-IFACE の座標型行）。
// すべて tuple [number, number] で宣言する（可変・readonly を付けない）。tuple は number[] を引数に取る側へ代入できるが、
// number[] を tuple へは代入できない ∴ 描画エンジンの配列型を返す側は Core adapter が成分を取り出して狭める。
// 各型の JSDoc は「座標系 / 単位 / 軸方向 / nullability」を必ず持つ（機械検査 --declaration D8 が 4 語の存在を見る）。
// @see m1-t2 タスク設計 §5.4（Core adapter が narrow する箇所の表）

/**
 * 経度・緯度。
 * - 座標系: EPSG:4326（WGS 84 地理座標）
 * - 単位: 度
 * - 軸方向: x = 経度（東が正）、y = 緯度（北が正）
 * - nullability: 非 null（要素は常に 2 個）
 * @see m1-t2 タスク設計 §5.4
 */
export type LngLat = [lng: number, lat: number];

/**
 * Web Mercator 座標。
 * - 座標系: EPSG:3857（Web Mercator）
 * - 単位: m（投影面上のメートル）
 * - 軸方向: x = 東が正、y = 北が正
 * - nullability: 非 null（要素は常に 2 個）
 * @see m1-t2 タスク設計 §5.4
 */
export type MercCoordinate = [x: number, y: number];

/**
 * 古地図の画像 pixel 座標。
 * - 座標系: 当該 source（古地図）の最大 zoom における tile pyramid の pixel 系
 * - 単位: px
 * - 軸方向: 原点は画像左上、x = 右が正、y = 下が正（y 下向き）
 * - nullability: 非 null（要素は常に 2 個）
 * @see m1-t2 タスク設計 §5.4
 */
export type MapXy = [x: number, y: number];

/**
 * Core 内部の system 座標。MapXy を Mercator と同じ数値域 [-MERC_MAX, MERC_MAX] へ線形写像し y を反転したもの。
 * - 座標系: Core 内部の system 座標（Mercator と同じ数値域だが地理座標ではない）
 * - 単位: MapXy を線形写像した無次元値（Mercator の m と同じ数値域）
 * - 軸方向: x = 右が正、y = 上が正（MapXy と y の向きが逆）
 * - nullability: 非 null（要素は常に 2 個）
 * @see m1-t2 タスク設計 §5.4
 */
export type SysCoord = [x: number, y: number];

/**
 * 地図 viewport 上の pixel 位置。
 * - 座標系: 地図 viewport の CSS pixel 系（`getBoundingClientRect` 基準）
 * - 単位: CSS px
 * - 軸方向: 原点は viewport 左上、x = 右が正、y = 下が正（y 下向き）
 * - nullability: 非 null（要素は常に 2 個）
 * @see m1-t2 タスク設計 §5.4
 */
export type ScreenPixel = [x: number, y: number];

/**
 * 画面（viewport）の大きさ。
 * - 座標系: 地図 viewport の CSS pixel 系
 * - 単位: CSS px
 * - 軸方向: 第 1 要素 = 幅（横方向）、第 2 要素 = 高さ（縦方向）
 * - nullability: 非 null（要素は常に 2 個）
 * @see m1-t2 タスク設計 §5.4
 */
export type ScreenSize = [width: number, height: number];

/**
 * 現在の map view projection の座標。どの projection かは現在の source の class が決める:
 * 現在の source の static `isBasemap()`（{@link MaplatSourceStaticLike} — instance からは `constructor` 経由）が偽（古地図系）なら {@link SysCoord}、
 * 真（base map）なら {@link MercCoordinate}。`getCoordinateFromPixel` / `getPixelFromCoordinate` / `getCenter` / `clickMapXy` が使う。
 * - 座標系: 現在の map view projection（上記の分岐で SysCoord または MercCoordinate）
 * - 単位: 分岐先の型に従う（SysCoord の無次元値、または Mercator の m）
 * - 軸方向: x = 右が正、y = 上が正（両分岐とも）
 * - nullability: 非 null（要素は常に 2 個。`MaplatViewLike.getCenter()` だけが `undefined` を返しうる）
 * @see m1-t2 タスク設計 §5.4
 */
export type MapCoordinate = [x: number, y: number];

/**
 * 視点の配列表現（中心・zoom・回転）。3 要素とも optional。
 * - 座標系: 中心は {@link MapCoordinate}（現在の map view projection）
 * - 単位: zoom は無次元、回転は radian（Core の `getRotation()` は度へ変換して返す — 本型は radian のまま）
 * - 軸方向: 回転は時計回りが正、0 = 北が上
 * - nullability: 各要素は省略可（`undefined`）。配列自体は非 null
 * @see m1-t2 タスク設計 §5.4
 */
export type ViewpointArray = [center?: MapCoordinate, zoom?: number, rotation?: number];
