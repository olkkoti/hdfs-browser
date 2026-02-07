import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("File Viewer", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to /data
    await page.locator(".file-row", { hasText: "data" }).click();
    await expect(page.locator(".file-table")).toBeVisible();
  });

  test("displays text file with line numbers", async ({ page }) => {
    await page.locator(".file-row", { hasText: "readme.txt" }).click();
    await expect(page.locator(".fv-filename")).toContainText("readme.txt");
    await expect(page.locator(".fv-mode-tag")).toHaveText("Text");
    // Check line numbers are visible
    await expect(page.locator(".fv-line-number").first()).toBeVisible();
    // Check content is visible
    await expect(page.locator(".fv-text-content")).toContainText("Welcome to the HDFS Browser");
  });

  test("shows sidebar with file attributes", async ({ page }) => {
    await page.locator(".file-row", { hasText: "readme.txt" }).click();
    await expect(page.locator(".fv-sidebar")).toBeVisible();
    await expect(page.locator(".fv-attr-table")).toContainText("Name");
    await expect(page.locator(".fv-attr-table")).toContainText("readme.txt");
    await expect(page.locator(".fv-attr-table")).toContainText("Owner");
    await expect(page.locator(".fv-attr-table")).toContainText("Size");
  });

  test("shows ACL entries in sidebar", async ({ page }) => {
    await page.locator(".file-row", { hasText: "readme.txt" }).click();
    await expect(page.locator(".fv-sidebar")).toBeVisible();
    // ACL table should show base entries
    await expect(page.locator(".fv-acl-table")).toBeVisible();
  });

  test("displays binary file as hex dump", async ({ page }) => {
    await page.locator(".file-row", { hasText: "test-binary.bin" }).click();
    await expect(page.locator(".fv-filename")).toContainText("test-binary.bin");
    await expect(page.locator(".fv-mode-tag")).toHaveText("Binary");
    await expect(page.locator(".fv-hex-content")).toBeVisible();
    // Check hex offset column is visible
    await expect(page.locator(".fv-hex-offset").first()).toBeVisible();
  });

  test("shows pagination controls", async ({ page }) => {
    await page.locator(".file-row", { hasText: "readme.txt" }).click();
    await expect(page.locator(".fv-pagination")).toBeVisible();
    await expect(page.locator(".fv-byte-range")).toBeVisible();
  });

  test("jump to offset input works", async ({ page }) => {
    await page.locator(".file-row", { hasText: "readme.txt" }).click();
    await expect(page.locator(".fv-jump-input")).toBeVisible();
    await page.fill(".fv-jump-input", "10");
    await page.locator(".fv-pagination .fv-page-btn").last().click();
    // Byte range should update
    await expect(page.locator(".fv-byte-range")).toContainText("10");
  });

  test("back button returns to directory", async ({ page }) => {
    await page.locator(".file-row", { hasText: "readme.txt" }).click();
    await expect(page.locator(".fv-filename")).toBeVisible();
    await page.click(".fv-back-btn");
    await expect(page.locator(".file-table")).toBeVisible();
  });

  test("delete from viewer returns to directory", async ({ page }) => {
    // Create a temp file to delete
    const fileName = `viewer-delete-${Date.now()}.txt`;
    await page.click("text=Upload File");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator('.upload-body input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: fileName,
      mimeType: "text/plain",
      buffer: Buffer.from("to be deleted"),
    });
    await page.locator(".upload-btn.primary").click();
    await expect(page.locator(".upload-modal")).toHaveCount(0);

    // Open the file in viewer
    await page.locator(".file-row", { hasText: fileName }).click();
    await expect(page.locator(".fv-filename")).toContainText(fileName);

    // Delete from viewer
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    await page.locator(".fv-action-btn.danger").click();
    // Should return to directory listing
    await expect(page.locator(".file-table")).toBeVisible();
    await expect(page.locator(".file-row", { hasText: fileName })).toHaveCount(0);
  });
});
