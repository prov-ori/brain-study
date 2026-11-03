import { test, expect } from "@playwright/test";
const correct = [1, 0, 1, 0, 1, 0, 1, 0];
test("production atlas loads local anatomy, selection, layers and learning; quiz completes twice", async ({
  page,
}) => {
  const errors = [],
    failed = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(r.url());
  });
  await page.goto("./");
  await expect(page.locator("body")).toHaveAttribute(
    "data-model-ready",
    "true",
    { timeout: 90000 },
  );
  await expect(page.locator("#model-mode")).toContainText("437");
  await expect(page.locator("#structure-list button")).toHaveCount(437);
  await page.locator('[data-region="hippocampus"]').click();
  await expect(page.locator("#selection-count")).toHaveText(
    "Выбрано структур: 2",
  );
  await expect(page.locator("#cortex-opacity")).toHaveValue("12");
  await page.locator("#isolate").click();
  await expect(page.locator("#isolate")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#reset-camera").click();
  await page.locator("#search").fill("Hippocampus");
  await expect(page.locator("#structure-list button")).toHaveCount(2);
  await page.locator("#structure-list button").first().click();
  await expect(page.locator("#structure-title")).toHaveText("Hippocampus");
  await page.locator("#search").fill("нет_такой_структуры");
  await expect(page.locator("#result-count")).toHaveText("0 из 437");
  await page.locator("#reset-camera").click();
  await page.locator("#category").selectOption("cerebellum");
  await expect(page.locator("#structure-list button")).toHaveCount(33);
  await page.locator("#reset-camera").click();
  await page.locator("#color-mode").check();
  await page.screenshot({
    path: "test-results/atlas-desktop.png",
    fullPage: true,
  });
  await page.locator('[data-view="learn"]').click();
  await page.locator(".lesson-card").first().click();
  await page.locator("#lesson-done").click();
  await page.reload();
  await expect(page.locator("#progress-caption")).toHaveText("1 из 5 уроков");
  await page.locator('[data-view="quiz"]').click();
  for (let run = 0; run < 2; run++) {
    for (const answer of correct) {
      await page.locator("#quiz-options button").nth(answer).click();
      await expect(page.locator("#quiz-next")).toBeEnabled();
      await page.locator("#quiz-next").click();
    }
    await expect(page.locator("#quiz-question")).toHaveText(
      "Результат: 8 из 8",
    );
    if (run === 0) await page.locator("#quiz-next").click();
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
test("mobile layout has no horizontal overflow and atlas renders", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.locator("body")).toHaveAttribute(
    "data-model-ready",
    "true",
    { timeout: 90000 },
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/atlas-mobile.png",
    fullPage: true,
  });
});
test("missing model shows an honest recoverable error", async ({ page }) => {
  await page.route("**/models/brain.glb", (r) =>
    r.fulfill({ status: 404, body: "Not found" }),
  );
  await page.goto("./");
  await expect(page.locator("#model-mode")).toHaveText("Ошибка загрузки", {
    timeout: 30000,
  });
  await expect(page.locator("#retry")).toBeVisible();
});
