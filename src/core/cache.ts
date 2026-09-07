// tile cache 関連の構造型（m1-t2 設計 §5.1 `cache.ts`）。フィールド名の確定は cache 契約の担当（m4）∴ 本版は名前と基底だけを置く。

/** tile cache の統計。具体 field は cache 契約の担当が確定する。 */
export type MaplatTileCacheStats = Record<string, unknown>;

/** tile cache の容量情報。具体 field は cache 契約の担当が確定する。 */
export type MaplatTileCacheSize = Record<string, unknown>;

/** tile 一括取得の進捗通知。具体 field は cache 契約の担当が確定する。 */
export type MaplatTileCacheProgress = Record<string, unknown>;
