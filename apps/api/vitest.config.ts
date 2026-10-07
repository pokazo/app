import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/data/**"],
    fileParallelism: false,
  },
  server: {
    watch: { ignored: ["**/node_modules/**", "**/data/**", "**/dist/**"] },
  },
});
