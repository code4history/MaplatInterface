// 表示モードの公開語彙（C-MODE。m1 設計 §7.3 / m1-t2 設計 §5.2）。公開する語彙は 2 値のみ。

/** 公開される表示モード。`"maplat"` = Maplat の古地図表示、`"map-warp"` = 地図側ワープ表示。 */
export type PublicDisplayMode = "maplat" | "map-warp";

/** 公開表示モードの実行時定数（型レベルでも 2 要素。型テスト T-2 / T-4 が歯を持つ）。 */
export const PUBLIC_DISPLAY_MODES = ["maplat", "map-warp"] as const satisfies readonly PublicDisplayMode[];

/**
 * 表示モードの capability（optional）。Pro が実装する。Core は実装しない ∴ `MaplatCoreInterface.displayMode` は `undefined`。
 * `setDisplayMode` に受理できない値が渡されたときの契約は C-ERR の `INVALID_DISPLAY_MODE`（{@link MaplatContractError}）。
 */
export interface DisplayModeCapability {
  /** 現在の表示モードを返す。 */
  getDisplayMode(): PublicDisplayMode;
  /** 表示モードを切り替える。切替の完了で resolve する。 */
  setDisplayMode(mode: PublicDisplayMode): Promise<void>;
}
