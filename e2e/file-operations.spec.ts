import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("File Operations", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("creates and deletes a folder", async ({ page }) => {
    const folderName = `test-folder-${Date.now()}`;

    // Override window.prompt to return the folder name
    await page.evaluate((name) => {
      window.prompt = () => name;
    }, folderName);

    await page.click("text=New Folder");
    await expect(page.locator(".file-row", { hasText: folderName })).toBeVisible();

    // Clean up: delete the folder
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    const row = page.locator(".file-row", { hasText: folderName });
    await row.locator(".delete-btn").click();
    await expect(page.locator(".file-row", { hasText: folderName })).toHaveCount(0);
  });

  test("uploads and deletes a file", async ({ page }) => {
    const fileName = `upload-test-${Date.now()}.txt`;

    // Navigate to /data to upload there (root upload may fail on some HDFS configs)
    await page.locator(".file-row", { hasText: "data" }).click();
    await expect(page.locator(".file-row")).toHaveCount(8);

    await page.click("text=Upload File");
    await expect(page.locator(".upload-modal")).toBeVisible();

    // Create a test file and upload it
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator('.upload-body input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: fileName,
      mimeType: "text/plain",
      buffer: Buffer.from("e2e test content"),
    });

    await page.locator(".upload-btn.primary").click();
    // Wait for upload to complete and modal to close (uploads can take a while)
    await expect(page.locator(".upload-modal")).toHaveCount(0, { timeout: 15000 });

    // Verify file appears in listing
    await expect(page.locator(".file-row", { hasText: fileName })).toBeVisible();

    // Clean up: delete the file
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    const row = page.locator(".file-row", { hasText: fileName });
    await row.locator(".delete-btn").click();
    await expect(page.locator(".file-row", { hasText: fileName })).toHaveCount(0);
  });

  test("deletes a file with confirmation", async ({ page }) => {
    const folderName = `delete-test-${Date.now()}`;

    // Create a temp folder first
    await page.evaluate((name) => {
      window.prompt = () => name;
    }, folderName);
    await page.click("text=New Folder");
    await expect(page.locator(".file-row", { hasText: folderName })).toBeVisible();

    // Delete with confirmation
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    const row = page.locator(".file-row", { hasText: folderName });
    await row.locator(".delete-btn").click();
    await expect(page.locator(".file-row", { hasText: folderName })).toHaveCount(0);
  });

  test("cancel upload dialog closes it", async ({ page }) => {
    await page.click("text=Upload File");
    await expect(page.locator(".upload-modal")).toBeVisible();
    await page.click("text=Cancel");
    await expect(page.locator(".upload-modal")).toHaveCount(0);
  });
});
