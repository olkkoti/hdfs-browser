import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("Directory Listing", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("shows root directory contents", async ({ page }) => {
    await expect(page.locator(".file-table")).toBeVisible();
    await expect(page.locator(".file-row")).toHaveCount(2); // data, projects
    await expect(page.locator(".file-row").first()).toContainText("data");
    await expect(page.locator(".file-row").last()).toContainText("projects");
  });

  test("navigates into subdirectory", async ({ page }) => {
    await page.locator(".file-row", { hasText: "data" }).click();
    await expect(page.locator(".file-row")).toHaveCount(6); // config, empty-dir, logs, readme.txt, reports, test-binary.bin
    await expect(page.locator(".breadcrumb-link")).toHaveCount(2); // / and data
  });

  test("navigates deep into subdirectory", async ({ page }) => {
    await page.locator(".file-row", { hasText: "data" }).click();
    await page.locator(".file-row", { hasText: "logs" }).click();
    await expect(page.locator(".file-row")).toHaveCount(2);
    await expect(page.locator(".file-row").first()).toContainText("app-2025-01-15.log");
  });

  test("breadcrumb navigates back to parent", async ({ page }) => {
    await page.locator(".file-row", { hasText: "data" }).click();
    await page.locator(".file-row", { hasText: "logs" }).click();
    // Click the "data" breadcrumb
    await page.locator(".breadcrumb-link", { hasText: "data" }).click();
    await expect(page.locator(".file-row")).toHaveCount(6);
  });

  test("breadcrumb navigates to root", async ({ page }) => {
    await page.locator(".file-row", { hasText: "data" }).click();
    await page.locator(".file-row", { hasText: "logs" }).click();
    // Click the "/" breadcrumb (first one)
    await page.locator(".breadcrumb-link").first().click();
    await expect(page.locator(".file-row")).toHaveCount(2);
  });

  test("shows empty directory message", async ({ page }) => {
    await page.locator(".file-row", { hasText: "data" }).click();
    await page.locator(".file-row", { hasText: "empty-dir" }).click();
    await expect(page.locator(".empty-message")).toHaveText("This directory is empty");
  });
});
