import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("Rename", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("renames a file via UI", async ({ page }) => {
    const suffix = Date.now();
    const originalName = `rename-orig-${suffix}.txt`;
    const newName = `rename-new-${suffix}.txt`;

    // Create a temp file via API
    await page.request.post(`/api/files/upload?path=${encodeURIComponent(`/data/${originalName}`)}`, {
      multipart: {
        file: { name: "test.txt", mimeType: "text/plain", buffer: Buffer.from("rename test") },
      },
    });

    // Navigate to /data
    await page.locator(".file-row", { hasText: "data" }).click();
    await expect(page.locator(".file-row", { hasText: originalName })).toBeVisible();

    // Stub window.prompt to return the new name
    await page.evaluate((name) => {
      window.prompt = () => name;
    }, newName);

    // Click the rename button on the file row
    const row = page.locator(".file-row", { hasText: originalName });
    await row.locator(".rename-btn").click();

    // Verify old name gone and new name visible
    await expect(page.locator(".file-row", { hasText: newName })).toBeVisible();
    await expect(page.locator(".file-row", { hasText: originalName })).toHaveCount(0);

    // Clean up
    await page.request.delete(`/api/files?path=${encodeURIComponent(`/data/${newName}`)}`);
  });

  test("renames a directory via UI and preserves contents", async ({ page }) => {
    const suffix = Date.now();
    const originalName = `rename-dir-orig-${suffix}`;
    const newName = `rename-dir-new-${suffix}`;

    // Create a temp directory with a child file
    await page.request.put(`/api/files/mkdir?path=${encodeURIComponent(`/data/${originalName}`)}`);
    await page.request.post(
      `/api/files/upload?path=${encodeURIComponent(`/data/${originalName}/child.txt`)}`,
      {
        multipart: {
          file: { name: "child.txt", mimeType: "text/plain", buffer: Buffer.from("child content") },
        },
      }
    );

    // Navigate to /data
    await page.locator(".file-row", { hasText: "data" }).click();
    await expect(page.locator(".file-row", { hasText: originalName })).toBeVisible();

    // Stub window.prompt to return the new name
    await page.evaluate((name) => {
      window.prompt = () => name;
    }, newName);

    // Click the rename button on the directory row
    const row = page.locator(".file-row", { hasText: originalName });
    await row.locator(".rename-btn").click();

    // Verify old name gone and new name visible
    await expect(page.locator(".file-row", { hasText: newName })).toBeVisible();
    await expect(page.locator(".file-row", { hasText: originalName })).toHaveCount(0);

    // Verify contents preserved via API
    const listRes = await page.request.get(
      `/api/files/list?path=${encodeURIComponent(`/data/${newName}`)}`
    );
    const listing = await listRes.json();
    const names = listing.FileStatuses.FileStatus.map(
      (f: { pathSuffix: string }) => f.pathSuffix
    );
    expect(names).toContain("child.txt");

    // Clean up
    await page.request.delete(`/api/files?path=${encodeURIComponent(`/data/${newName}`)}`);
  });

  test("rename missing parameters returns 400", async ({ page }) => {
    const res = await page.request.put("/api/files/rename");
    expect(res.ok()).toBe(false);
    expect(res.status()).toBe(400);
  });
});
