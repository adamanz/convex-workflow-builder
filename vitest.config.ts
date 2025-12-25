import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/tests/**/*.test.ts"],
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
