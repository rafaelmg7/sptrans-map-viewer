import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.{spec,test}.{js,jsx}"],
    setupFiles: ["./src/test/setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 90,
        branches: 80,
      },
      exclude: [
        "dist/**",
        "coverage/**",
        "src/main.jsx",
        "src/**/*.spec.{js,jsx}",
        "src/test/**",
        "src/assets/**",
        "src/**/*.css",
      ],
    },
  },
});
