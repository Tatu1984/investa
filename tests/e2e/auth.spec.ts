import { test, expect } from "@playwright/test";

test.describe("auth golden path", () => {
  test("login with seeded demo user lands on /for-you", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    // Form is pre-filled with demo creds in dev seed; just submit.
    await page.getByLabel("Email").fill("demo@investa.local");
    await page.getByLabel("Password").fill("Demo@123");
    await page.getByRole("button", { name: /^log in$/i }).click();

    await page.waitForURL("**/for-you", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /for you/i })).toBeVisible();
  });

  test("unauth user hitting /dashboard is redirected to /login?next=…", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    // Followed the 307 → /login?next=/dashboard
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("next=%2Fdashboard");
    expect(res?.ok()).toBe(true);
  });

  test("forgot-password page loads and accepts an email", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /forgot your password/i })).toBeVisible();
    await page.getByLabel("Email").fill("demo@investa.local");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(/we've emailed a reset link/i)).toBeVisible({ timeout: 5_000 });
  });
});
