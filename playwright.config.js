import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: ["browser.spec.js", "live.spec.js"],
  outputDir: process.env.ATLAS_URL ? "live-test-results" : "test-results",
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: process.env.ATLAS_URL || "http://127.0.0.1:4173/brain-study/",
    headless: true,
    launchOptions: {
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
    screenshot: "only-on-failure",
  },
  webServer: process.env.ATLAS_URL
    ? undefined
    : {
        command:
          "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort",
        url: "http://127.0.0.1:4173/brain-study/",
        reuseExistingServer: !process.env.CI,
      },
  reporter: "list",
});
