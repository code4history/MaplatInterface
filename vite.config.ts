import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: { index: "src/index.ts", "core/index": "src/core/index.ts", "contract-kit/index": "src/contract-kit/index.ts" },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`
    },
    sourcemap: true
  },
  test: {
    environment: "node",
    include: ["spec/**/*.{test,spec}.ts"],
    setupFiles: ["spec/setup-dom.ts"],
    server: { deps: { inline: ["@maplat/core"] } }
  }
});