import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 5321);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  reporter: [["list"], ["html", { outputFolder: "outputs/playwright-report", open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-375",
      use: { viewport: { width: 375, height: 900 } },
    },
    {
      name: "tablet-768",
      use: { viewport: { width: 768, height: 980 } },
    },
    {
      name: "desktop-1440",
      use: { viewport: { width: 1440, height: 920 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
