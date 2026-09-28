import { defineConfig, devices } from "@playwright/test";

// Runs against the full app (FastAPI + static frontend). Start it first, ideally
// on a separate database: DB_NAME=pm_e2e docker compose up -d --build
export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
