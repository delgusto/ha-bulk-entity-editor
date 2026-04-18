import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(
    resolve(
      __dirname,
      "../custom_components/bulk_entity_editor/manifest.json",
    ),
    "utf8",
  ),
) as { version: string };

const buildTime = new Date().toISOString().replace("T", " ").slice(0, 16);

export default defineConfig({
  define: {
    __BUILD_VERSION__: JSON.stringify(manifest.version),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  build: {
    outDir: resolve(__dirname, "../custom_components/bulk_entity_editor/frontend"),
    emptyOutDir: true,
    target: "es2020",
    lib: {
      entry: resolve(__dirname, "src/panel.ts"),
      name: "BulkEntityEditorPanel",
      formats: ["es"],
      fileName: () => "bulk-entity-editor.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    sourcemap: false,
    minify: "esbuild",
  },
});
