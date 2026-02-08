import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("Directory Listing", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("shows root directory contents", async ({ page }) => {
    await expect(page.locator(".file-table")).toBeVisible();
    await expect(page.locator(".file-row")).toHaveCount(3); // ., data, projects
    await expect(page.locator(".file-row", { hasText: "data" })).toBeVisible();
    await expect(page.locator(".file-row", { hasText: "projects" })).toBeVisible();
  });

  test("navigates into subdirectory", async ({ page }) => {
    await page.locator(".file-row", { hasText: "data" }).click();
    await expect(page.locator(".file-row")).toHaveCount(8); // ., .., config, empty-dir, logs, readme.txt, reports, test-binary.bin
    await expect(page.locator(".breadcrumb-link")).toHaveCount(2); // / and data
  });

  test("navigates deep into subdirectory", async ({ page }) => {
    await page.locator(".file-row", { hasText: "data" }).click();
    await page.locator(".file-row", { hasText: "logs" }).click();
    await expect(page.locator(".file-row")).toHaveCount(4); // ., .., app-2025-01-15.log, error.log
    await expect(page.locator(".file-row", { hasText: "app-2025-01-15.log" })).toBeVisible();
  });

  test("breadcrumb navigates back to parent", async ({ page }) => {
    await page.locator(".file-row", { hasText: "data" }).click();
    await page.locator(".file-row", { hasText: "logs" }).click();
    // Click the "data" breadcrumb
    await page.locator(".breadcrumb-link", { hasText: "data" }).click();
    await expect(page.locator(".file-row")).toHaveCount(8);
  });

  test("breadcrumb navigates to root", async ({ page }) => {
    await page.locator(".file-row", { hasText: "data" }).click();
    await page.locator(".file-row", { hasText: "logs" }).click();
    // Click the "/" breadcrumb (first one)
    await page.locator(".breadcrumb-link").first().click();
    await expect(page.locator(".file-row")).toHaveCount(3);
  });

  test("shows dot entries in empty directory", async ({ page }) => {
    await page.locator(".file-row", { hasText: "data" }).click();
    await page.locator(".file-row", { hasText: "empty-dir" }).click();
    // Empty dir still shows . and .. entries
    await expect(page.locator(".file-row")).toHaveCount(2);
    await expect(page.locator(".file-row", { hasText: "." }).first()).toBeVisible();
    await expect(page.locator(".file-row", { hasText: ".." })).toBeVisible();
  });
});
