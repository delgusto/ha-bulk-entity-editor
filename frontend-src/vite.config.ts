import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
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
