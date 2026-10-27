import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "skills/tests/**/*.test.mjs"] } });
