// source 入力 union の型テスト（m1-t2 設計 §5.2 T-S1 / T-S2。1 巡目レビュー MAJ-6）: SRC-F1〜F5 の各値が MaplatSourceInput と
// MapSourceFactoryInterface の第 1 引数へ渡せる（union から 1 形が欠けるとその行が TS2322 / TS2345 で赤 — 設計 §2.5.1 で実測）。
// 値は合成の mapID（osm / gsi / naramachi / tin）で、実データを参照しない。
import type {
  MapSourceFactoryInterface,
  MaplatCoreModule,
  MaplatTileCacheProgress,
  MaplatTileCacheSize,
  MaplatTileCacheStats,
  MaplatSourceInput,
  MaplatSourceInputF1,
  MaplatSourceInputF2,
  MaplatSourceInputF3,
  MaplatSourceInputF4,
  MaplatSourceInputF5,
} from "../../src/core/index.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? (<T>() => T extends B ? 1 : 2) extends
        (<T>() => T extends A ? 1 : 2)
      ? true
      : false
    : false;

declare const factory: MapSourceFactoryInterface;

// T-S1 F1〜F5 の各値は MaplatSourceInput の member であり factory の第 1 引数へ渡せる
const _f1: MaplatSourceInputF1 = "osm";
const _f2: MaplatSourceInputF2 = { mapID: "gsi", maptype: "base", url: "https://example.invalid/{z}/{x}/{y}.png" };
const _f3: MaplatSourceInputF3 = { mapID: "naramachi", settingFile: "maps/naramachi.json" };
const _f4: MaplatSourceInputF4 = { mapID: "naramachi" };
const _f5: MaplatSourceInputF5 = { mapID: "tin", noload: true };
export const _u: MaplatSourceInput[] = [_f1, _f2, _f3, _f4, _f5];
export const _p1 = factory(_f1);
export const _p2 = factory(_f2);
export const _p3 = factory(_f3);
export const _p4 = factory(_f4);
export const _p5 = factory(_f5);

// T-S2 mapID の無い object は渡せない（代入が通るようになると directive が余り TS2578 で赤）
// @ts-expect-error mapID の無い object は MaplatSourceInput ではない
export const _pBad = factory({ settingFile: "maps/x.json" });

// module 表面は単一 node と node 配列の両方を公開戻り値として表す。
type _CreateElementResult = ReturnType<MaplatCoreModule["createElement"]>;
export const _createElementResult: true = null! as Equal<_CreateElementResult, Node | Node[]>;

// cache 契約は m4 まで具体 field を固定せず、3 型とも開いた record として公開する。
export const _cacheStatsSizeIsOpen: true =
  null! as Equal<MaplatTileCacheStats["size"], unknown>;
export const _cacheProgressTypeIsOpen: true =
  null! as Equal<MaplatTileCacheProgress["type"], unknown>;
export const _cacheSizeIsOpenRecord: true =
  null! as Equal<MaplatTileCacheSize, Record<string, unknown>>;
