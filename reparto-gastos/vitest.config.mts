import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Por defecto los tests corren en Node (lógica, Server Actions, Route
 * Handler). Los tests de componentes declaran `// @vitest-environment jsdom`.
 */
export default defineConfig({
  plugins: [react()],
  // Resuelve el alias `@/*` de tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
    restoreMocks: true,
  },
});
