import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // "@/" = koren webu (stejne jako v tsconfig.json pro Next.js)
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
