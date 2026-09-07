// `./contract-kit` の公開表面（m1-t3 設計 §5.1）。runtime 依存 0・test runner 非依存（C-KIT）。
export type {
  ContractAdapter, ContractAppHandle, ContractExpectation, ContractHarness,
  ContractRegistryEntry, ContractResult, ContractTestResult, ContractTestStatus,
  ScanArtifact, ScanDoc, ScanInput, NeedleEntry, AllowedExposure, AllowedExposureLocation,
} from "./types.js";

export { REGISTRY } from "./suite.js";
export { FIXTURES, fixtureById, type SourceFixture, type SourceFixtureCase } from "./fixtures/index.js";
export { runContractSuite, MODULE_EXPORTS } from "./suite.js";

export {
  compileNeedle, scanDocs, checkNeedleFile, scanArtifacts, tokens,
  SCHEMA_VERSION, JOINER, LEAD, KNOWN_KINDS, REQUIRED_KINDS,
  type ScanReport, type NeedleFileCheck,
} from "./negative/scan.js";

export {
  runNegativeRuntime, INVALID_DISPLAY_MODE_INPUTS, CONTRACT_ERROR_CODES, isInvalidDisplayModeContractError,
} from "./negative/runtime.js";
// 規則 T の機構（rule-t.ts / rule-t-universal.ts）は kit の F / MT / U 行（negative-scan.spec.ts）が使う test-only 機構であり、
// 公開表面（§5.1 の scanArtifacts / compileNeedle / scanDocs / checkNeedleFile）には含めない（合成 needle を公開パッケージへ漏らさない — R-9）。