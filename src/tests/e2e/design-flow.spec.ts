import { test, expect } from "@playwright/test";
import path from "path";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

test.describe("Design Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL + "/login");
    await page.fill('[data-testid="email-input"]', "test@nestai.app");
    await page.fill('[data-testid="password-input"]', "TestPassword123!");
    await page.click('[data-testid="signin-button"]');
    await page.waitForURL(BASE_URL + "/design");
  });

  test("user uploads room and gets recommendation", async ({ page }) => {
    await page.goto(BASE_URL + "/design");
    await page.locator('input[type="file"]').setInputFiles(
      path.join(__dirname, "../fixtures/test-room.jpg")
    );
    await page.fill('[data-testid="style-prompt"]',
      "Modern minimalist with warm tones and natural light");
    await page.click('[data-testid="analyze-button"]');
    await page.waitForSelector('[data-testid="recommendation-card"]', { timeout: 30000 });
    await expect(page.locator('[data-testid="recommended-style"]')).toBeVisible();
    await expect(page.locator('[data-testid="furniture-list"]')).toBeVisible();
  });

  test("shows upgrade prompt when out of credits", async ({ page }) => {
    await page.route("/api/analyze", (route) =>
      route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({ error: "Insufficient credits" }),
      })
    );
    await page.goto(BASE_URL + "/design");
    await page.locator('input[type="file"]').setInputFiles(
      path.join(__dirname, "../fixtures/test-room.jpg")
    );
    await page.fill('[data-testid="style-prompt"]', "Modern look");
    await page.click('[data-testid="analyze-button"]');
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
  });

  test("history page shows past sessions", async ({ page }) => {
    await page.goto(BASE_URL + "/history");
    await expect(page.locator('[data-testid="session-card"]').first()).toBeVisible({ timeout: 5000 });
  });
});
