// contract kit の公開型（C-KIT。m1-t3 設計 §5.1）。
// runtime 依存 0・test runner 非依存（suite / scan / runtime は harness を注入されるため vitest / node:test のいずれでも走れる）。

/** 契約テスト 1 件の結果の状態。適用外は skip でなく `not-applicable` として数える（m1-t3 設計 §5.3）。 */
export type ContractTestStatus = "pass" | "fail" | "not-applicable";

/** registry の 1 entry（`id` は CK-* の test ID、`applies_to` は適用条件）。 */
export interface ContractRegistryEntry {
  id: string;
  manifest_item_ids: string[];
  applies_to: string;
}

/** 契約テスト 1 件の結果。 */
export interface ContractTestResult {
  id: string;
  status: ContractTestStatus;
  /** 適用外の理由（`applies_to` の評価の要約）または pass の要約。 */
  detail: string;
}

/** `runContractSuite` の戻り値。 */
export interface ContractResult {
  adapter: string;
  results: ContractTestResult[];
}

/** harness 注入形の minimal な expect 面（vitest の `expect` / node:test の assert で満たせる構造型）。 */
export interface ContractExpectation {
  toEqual(expected: unknown): void;
  toBe(expected: unknown): void;
  toBeTruthy(): void;
  toContain(item: unknown): void;
  toHaveLength(n: number): void;
}

export interface ContractHarness {
  test(name: string, fn: () => void | Promise<void>): unknown;
  expect(actual: unknown): ContractExpectation;
}

/** `createApp` が返す app handle。`mapObject` は `setMarker` / `getSource` / `resetMarker` を持つ `MaplatMap` 相当。 */
export interface ContractAppHandle {
  mapObject: unknown;
  dispose?: () => void;
}

/** adapter が provider へ要請する構築手段。**期待値を持たない**（期待値は fixture が持つ — m1-t3 設計 §5.6）。 */
export interface ContractAdapter {
  /** adapter 名。`applies_to: "adapter:<name>"` の照合に使う。 */
  name: string;
  /** app の interface を作る。戻り値は {@link ContractAppHandle}。 */
  createApp(option: Record<string, unknown>): Promise<ContractAppHandle>;
  /** source を生成する（`@maplat/core` の `mapSourceFactory` 相当）。 */
  sourceFactory(input: unknown, commonOptions?: Record<string, unknown>): Promise<unknown>;
  /** fetch を横取りする stub を配備する。`files` は「path 断片 → 応答 body」の対応表。 */
  fetchStub(files: Record<string, unknown>): void;
  /** 直近に配備した fetch stub が記録した呼び出し URL の列を返す。 */
  fetchCalls(): string[];
  dispose(): void | Promise<void>;
  /** module 表面（root import）。`CK-MODULE-EXPORTS` / `CK-MODULE-CE` が使う。 */
  module?: Record<string, unknown>;
  /** displayMode capability。無ければ `CK-MODE-INVALID` / 負の runtime は `not-applicable`。 */
  displayMode?: { set(mode: unknown): Promise<void> };
}

// ---- 負の検査（negative/scan.ts。m1-t3 設計 §5.4） ----

/** 走査対象の doc（driver が materialize し、kit は I/O を持たない）。`id` は ordinal / OID 形の報告名。 */
export interface ScanDoc {
  id: string;
  name: string;
  text: string;
}

/** artifact 一覧の 1 件（outer の `public-surface-artifacts.json` の 1 entry）。 */
export interface ScanArtifact {
  kind: string;
  status: "present" | "pending";
  owner_milestone?: string;
  paths?: string[];
}

/** 除外指定（`allowed_exposures`）。`locations` は「当該 needle を許す場所」（artifact 種別 `kind` とその中の path）。 */
export interface AllowedExposureLocation {
  kind: string;
  paths: string[];
}

/** 除外指定（`allowed_exposures`）。`locations` は「当該 needle を許す場所」（doc の `kind` + `name`）。 */
export interface AllowedExposure {
  id: string;
  needle_key: string;
  status: "active" | "pending";
  owner_milestone?: string;
  locations: AllowedExposureLocation[];
  reason?: string;
}

/** needle 正本の 1 entry。 */
export interface NeedleEntry {
  key: string;
  value: string;
  aliases: string[];
}

/** `scanArtifacts` の入力。`read(path)` は driver が供給する callback（kit は I/O を持たない）。 */
export interface ScanInput {
  artifacts: ScanArtifact[];
  needles: NeedleEntry[];
  allowedExposures: AllowedExposure[];
  read: (path: string) => ScanDoc;
}

/** `scanArtifacts` の戻り値。 */
export interface ScanReport {
  /** needle 一致（doc-id / name / 行 / key / matched text）。matched text は既定出力へ印字しない（driver の整形責務）。 */
  hits: { doc: string; name: string; line: number; key: string; match: string }[];
  /** 走査面ごとの doc 件数。 */
  counts: Record<string, number>;
  failures: string[];
  warnings: string[];
  /** `pending` 種別（`{ kind, owner }`）。 */
  pending: { kind: string; owner: string }[];
  /** `allowed` として報告した除外指定の id。 */
  allowed: string[];
  /** needle ごとの実測（token 数 / alias 数 / selfmatch）。 */
  needles: { key: string; tokens: number; aliases: number; selfmatch: boolean }[];
}