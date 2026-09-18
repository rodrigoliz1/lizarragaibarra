import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseUrl ?? "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm run dev -- -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
          AUTH_URL: "http://localhost:3100",
          NEXTAUTH_URL: "http://localhost:3100",
          EMAIL_PROVIDER: "mock",
          CALENDAR_PROVIDER: "mock",
          NEXT_PUBLIC_CALENDAR_PROVIDER: "mock",
          STORAGE_PROVIDER: "local",
          FILE_SCANNER_PROVIDER: "mock",
          ENABLE_DEMO_AUTH: "false",
        },
      },
});
