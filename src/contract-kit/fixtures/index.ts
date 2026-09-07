// SRC-F1〜F5 の fixture を束ねる（m1-t3 設計 §5.1 / §5.2）。
// `resolveJsonModule` で型付き import する（tsconfig.json の compilerOptions.resolveJsonModule）。dist には JSON を物として置く（§5.1.1）。
import f1 from "./src-f1.json";
import f2 from "./src-f2.json";
import f3 from "./src-f3.json";
import f4 from "./src-f4.json";
import f5 from "./src-f5.json";

/** 1 case の形（`input.source` / `input.commonOptions` / `files` / `expected`）。 */
export interface SourceFixtureCase {
  case: string;
  input: { source: unknown; commonOptions?: Record<string, unknown> };
  files: Record<string, unknown>;
  expected: {
    fetch_urls_include: string[];
    fetch_urls_exclude: string[];
    observables: Record<string, unknown>;
  };
}

/** fixture 1 件の形。`attr` は SRC-F4 のみ（HJ-m1-3。判定 C1）。 */
export interface SourceFixture {
  id: string;
  attr?: string;
  cases: SourceFixtureCase[];
}

/** 全 fixture（SRC-F1〜F5）。順序は `data-contract` の導出名と同じ。 */
export const FIXTURES: SourceFixture[] = [f1, f2, f3, f4, f5] as unknown as SourceFixture[];

/** fixture を id で引く。 */
export function fixtureById(id: string): SourceFixture | undefined {
  return FIXTURES.find((f) => f.id === id);
}