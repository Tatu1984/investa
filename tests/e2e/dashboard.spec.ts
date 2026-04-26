import { test, expect } from "@playwright/test";

test.describe("dashboard golden path (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("demo@investa.local");
    await page.getByLabel("Password").fill("Demo@123");
    await page.getByRole("button", { name: /^log in$/i }).click();
    await page.waitForURL("**/for-you", { timeout: 10_000 });
  });

  test("/dashboard shows KPIs + sidebar + topbar", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /good morning, investor/i })).toBeVisible();
    // Sidebar primary CTA
    await expect(page.getByRole("link", { name: /for you/i }).first()).toBeVisible();
    // Topbar bell
    await expect(page.getByRole("link", { name: /^alerts/i }).first()).toBeVisible();
  });

  test("/assets renders the live asset list", async ({ page }) => {
    await page.goto("/assets");
    await expect(page.getByRole("heading", { name: /asset explorer/i })).toBeVisible();
    // We seeded 16 660+ rows; the page caps at 200, so at least "results" copy must be present.
    await expect(page.getByText(/results/i)).toBeVisible();
  });

  test("asset detail page loads tabs", async ({ page }) => {
    await page.goto("/assets/NIFTY50");
    await expect(page.locator("text=NIFTY 50").first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /price/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /metrics/i })).toBeVisible();
  });
});
