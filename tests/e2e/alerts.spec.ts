import { test, expect } from "@playwright/test";

test.describe("alerts CRUD golden path", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("demo@investa.local");
    await page.getByLabel("Password").fill("Demo@123");
    await page.getByRole("button", { name: /^log in$/i }).click();
    await page.waitForURL("**/for-you", { timeout: 10_000 });
  });

  test("create + delete an alert via the UI", async ({ page }) => {
    await page.goto("/alerts");
    await page.getByRole("tab", { name: /manage/i }).click();

    // Open the create dialog
    await page.getByRole("button", { name: /new alert/i }).click();
    await expect(page.getByRole("heading", { name: /^new alert$/i })).toBeVisible();

    // Use a unique-ish symbol so we know which row to delete after
    const symbol = `E2E${Math.floor(Math.random() * 90 + 10)}`;
    await page.getByLabel(/^symbol$/i).fill(symbol);
    await page.getByRole("button", { name: /^create alert$/i }).click();

    // The new row should appear
    await expect(page.locator(`text=${symbol}`)).toBeVisible({ timeout: 5_000 });

    // Delete it (find the table row containing the symbol, click the trash button)
    const row = page.locator("tr", { hasText: symbol });
    await row.getByRole("button", { name: /delete/i }).click();
    await expect(page.locator(`text=${symbol}`)).not.toBeVisible({ timeout: 5_000 });
  });
});
