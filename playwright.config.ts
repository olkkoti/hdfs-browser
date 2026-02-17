import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3001",
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
      testIgnore: /ldap/,
    },
    {
      name: "ldap",
      use: {
        browserName: "chromium",
        baseURL: process.env.LDAP_BASE_URL || "http://localhost:3002",
      },
      testMatch: /ldap/,
    },
  ],
});
