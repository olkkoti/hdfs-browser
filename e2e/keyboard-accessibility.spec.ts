import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("Keyboard Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Escape closes upload dialog", async ({ page }) => {
    await page.click("text=Upload File");
    await expect(page.locator(".upload-modal")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(".upload-modal")).toHaveCount(0);
  });

  test("Escape closes permissions dialog", async ({ page }) => {
    // Navigate to /data
    await page.locator(".file-row", { hasText: "data" }).click();
    await expect(page.locator(".file-table")).toBeVisible();

    // Open permissions dialog
    const row = page.locator(".file-row", { hasText: "readme.txt" });
    await row.locator('.action-btn[title="Permissions"]').click();
    await expect(page.locator(".perm-modal")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(".perm-modal")).toHaveCount(0);
  });

  test("table rows navigable with keyboard", async ({ page }) => {
    // Focus the "data" row and press Enter to navigate into it
    const dataRow = page.locator(".file-row", { hasText: "data" });
    await dataRow.focus();
    await page.keyboard.press("Enter");

    // Should navigate into the /data directory
    await expect(page.locator(".breadcrumb-link", { hasText: "data" })).toBeVisible();
    await expect(page.locator(".file-row")).toHaveCount(8);
  });
});
