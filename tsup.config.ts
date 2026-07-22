import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server/index.ts", "src/mcp/index.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  sourcemap: true,
  // x402 SDK + viem are dynamically imported only when payments are enabled;
  // keep them external so a build without them installed still succeeds.
  external: ["@x402/express", "x402-fetch", "@coinbase/x402", "viem"],
});
