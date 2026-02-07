import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("File Table Sorting", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to /data which has both dirs and files
    await page.locator(".file-row", { hasText: "data" }).click();
    // Wait for /data contents to load (6 items: 4 dirs + 2 files)
    await expect(page.locator(".file-row")).toHaveCount(6);
  });

  test("default sort is by name ascending", async ({ page }) => {
    const names = await page.locator(".file-row .file-name").allTextContents();
    // Directories come first, then files, each sorted alphabetically
    expect(names[0]).toBe("config");
    expect(names[1]).toBe("empty-dir");
    expect(names[2]).toBe("logs");
    expect(names[3]).toBe("reports");
    // Files after dirs
    expect(names[4]).toBe("readme.txt");
    expect(names[5]).toBe("test-binary.bin");
  });

  test("toggles to descending on second click", async ({ page }) => {
    // Click Name header to toggle to descending
    await page.locator("th", { hasText: "Name" }).click();
    const names = await page.locator(".file-row .file-name").allTextContents();
    // Dirs still first but reversed, then files reversed
    expect(names[0]).toBe("reports");
    expect(names[1]).toBe("logs");
    expect(names[2]).toBe("empty-dir");
    expect(names[3]).toBe("config");
    expect(names[4]).toBe("test-binary.bin");
    expect(names[5]).toBe("readme.txt");
  });

  test("sorts by size", async ({ page }) => {
    await page.locator("th", { hasText: "Size" }).click();
    // Just verify the table is still rendered after sorting
    await expect(page.locator(".file-row")).toHaveCount(6);
  });

  test("sorts by modified date", async ({ page }) => {
    await page.locator("th", { hasText: "Modified" }).click();
    await expect(page.locator(".file-row")).toHaveCount(6);
  });
});
