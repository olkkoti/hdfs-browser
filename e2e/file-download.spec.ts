import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("File Download", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator(".file-row", { hasText: "data" }).click();
    await expect(page.locator(".file-table")).toBeVisible();
  });

  test("download from table action button", async ({ page }) => {
    // Intercept window.open to capture the URL
    const openedUrl = page.evaluate(() => {
      return new Promise<string>((resolve) => {
        window.open = (url?: string | URL) => {
          resolve(String(url ?? ""));
          return null;
        };
      });
    });

    const row = page.locator(".file-row", { hasText: "readme.txt" });
    await row.locator(".action-btn").first().click();

    const url = await openedUrl;
    expect(url).toContain("/api/files/download");
    expect(url).toContain("readme.txt");
  });

  test("download from file viewer", async ({ page }) => {
    await page.locator(".file-row", { hasText: "readme.txt" }).click();
    await expect(page.locator(".fv-sidebar")).toBeVisible();

    const openedUrl = page.evaluate(() => {
      return new Promise<string>((resolve) => {
        window.open = (url?: string | URL) => {
          resolve(String(url ?? ""));
          return null;
        };
      });
    });

    await page.locator(".fv-action-btn", { hasText: "Download" }).click();

    const url = await openedUrl;
    expect(url).toContain("/api/files/download");
    expect(url).toContain("readme.txt");
  });
});
