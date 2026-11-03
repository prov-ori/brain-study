import { test, expect } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
test("published URL serves the real model and supports 3D picking", async ({
  page,
  request,
}) => {
  test.skip(!process.env.ATLAS_URL, "Only after deployment");
  test.setTimeout(240000);
  const expectedScript = fs
    .readFileSync(new URL("../dist/index.html", import.meta.url), "utf8")
    .match(/src="([^"]+\.js)"/)[1];
  const url = "./?release=" + (process.env.GITHUB_SHA || Date.now());
  await expect
    .poll(
      async () => {
        const response = await request.get(url, {
          headers: { "Cache-Control": "no-cache" },
        });
        return (
          response.ok() && (await response.text()).includes(expectedScript)
        );
      },
      {
        timeout: 120000,
        message: "CDN must serve this release before testing WebGL",
      },
    )
    .toBe(true);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await expect(page.locator("body")).toHaveAttribute(
    "data-model-ready",
    "true",
    { timeout: 90000 },
  );
  await expect(page.locator("#model-mode")).toContainText("437");
  const model = await request.get("models/brain.glb");
  expect(model.status()).toBe(200);
  expect(
    crypto
      .createHash("sha256")
      .update(await model.body())
      .digest("hex"),
  ).toBe("76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453");
  await page.screenshot({
    path: "live-test-results/published-atlas.png",
    fullPage: true,
  });
  await page.locator("#brain-canvas canvas").click();
  await expect(page.locator("#selection-count")).not.toHaveText(
    "Выбрано структур: 0",
  );
  expect(errors).toEqual([]);
});
