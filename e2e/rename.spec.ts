import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("Rename API", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("renames a file", async ({ page }) => {
    const suffix = Date.now();
    const original = `/data/rename-orig-${suffix}.txt`;
    const renamed = `/data/rename-new-${suffix}.txt`;

    // Create a temp file via API
    await page.request.post(`/api/files/upload?path=${encodeURIComponent(original)}`, {
      multipart: {
        file: { name: "test.txt", mimeType: "text/plain", buffer: Buffer.from("rename test") },
      },
    });

    // Rename via API
    const res = await page.request.put(
      `/api/files/rename?from=${encodeURIComponent(original)}&to=${encodeURIComponent(renamed)}`
    );
    expect(res.ok()).toBe(true);

    // Verify new name exists and old name is gone in the listing
    const listRes = await page.request.get(`/api/files/list?path=${encodeURIComponent("/data")}`);
    const listing = await listRes.json();
    const names = listing.FileStatuses.FileStatus.map(
      (f: { pathSuffix: string }) => f.pathSuffix
    );
    expect(names).toContain(`rename-new-${suffix}.txt`);
    expect(names).not.toContain(`rename-orig-${suffix}.txt`);

    // Clean up
    await page.request.delete(`/api/files?path=${encodeURIComponent(renamed)}`);
  });

  test("renames a directory and preserves contents", async ({ page }) => {
    const suffix = Date.now();
    const original = `/data/rename-dir-orig-${suffix}`;
    const renamed = `/data/rename-dir-new-${suffix}`;

    // Create a temp directory
    await page.request.put(`/api/files/mkdir?path=${encodeURIComponent(original)}`);

    // Create a file inside it
    await page.request.post(
      `/api/files/upload?path=${encodeURIComponent(original + "/child.txt")}`,
      {
        multipart: {
          file: { name: "child.txt", mimeType: "text/plain", buffer: Buffer.from("child content") },
        },
      }
    );

    // Rename the directory
    const res = await page.request.put(
      `/api/files/rename?from=${encodeURIComponent(original)}&to=${encodeURIComponent(renamed)}`
    );
    expect(res.ok()).toBe(true);

    // Verify the renamed directory has the child file
    const listRes = await page.request.get(
      `/api/files/list?path=${encodeURIComponent(renamed)}`
    );
    const listing = await listRes.json();
    const names = listing.FileStatuses.FileStatus.map(
      (f: { pathSuffix: string }) => f.pathSuffix
    );
    expect(names).toContain("child.txt");

    // Verify old directory is gone
    const parentRes = await page.request.get(
      `/api/files/list?path=${encodeURIComponent("/data")}`
    );
    const parentListing = await parentRes.json();
    const parentNames = parentListing.FileStatuses.FileStatus.map(
      (f: { pathSuffix: string }) => f.pathSuffix
    );
    expect(parentNames).not.toContain(`rename-dir-orig-${suffix}`);

    // Clean up
    await page.request.delete(`/api/files?path=${encodeURIComponent(renamed)}`);
  });

  test("rename missing parameters returns 400", async ({ page }) => {
    // Call rename without 'from' and 'to' params
    const res = await page.request.put("/api/files/rename");
    expect(res.ok()).toBe(false);
    expect(res.status()).toBe(400);
  });
});
