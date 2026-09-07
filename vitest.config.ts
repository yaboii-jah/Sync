import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests cover the pure helpers in `lib/` only. Anything that needs a
 * database, a browser or a Supabase session is verified against the linked
 * project instead — this runner deliberately has no environment to fake one.
 */
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
