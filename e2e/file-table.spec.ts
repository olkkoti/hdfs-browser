import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("File Table Sorting", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to /data which has both dirs and files
    await page.locator(".file-row", { hasText: "data" }).click();
    // Wait for /data contents to load (. + .. + 4 dirs + 2 files)
    await expect(page.locator(".file-row")).toHaveCount(8);
  });

  test("default sort is by name ascending", async ({ page }) => {
    const names = await page.locator(".file-row .file-name").allTextContents();
    // . and .. pinned at top, then directories sorted, then files sorted
    expect(names[0]).toBe(".");
    expect(names[1]).toBe("..");
    expect(names[2]).toBe("config");
    expect(names[3]).toBe("empty-dir");
    expect(names[4]).toBe("logs");
    expect(names[5]).toBe("reports");
    expect(names[6]).toBe("readme.txt");
    expect(names[7]).toBe("test-binary.bin");
  });

  test("toggles to descending on second click", async ({ page }) => {
    // Click Name header to toggle to descending
    await page.locator("th", { hasText: "Name" }).click();
    const names = await page.locator(".file-row .file-name").allTextContents();
    // . and .. still pinned at top, dirs reversed, then files reversed
    expect(names[0]).toBe(".");
    expect(names[1]).toBe("..");
    expect(names[2]).toBe("reports");
    expect(names[3]).toBe("logs");
    expect(names[4]).toBe("empty-dir");
    expect(names[5]).toBe("config");
    expect(names[6]).toBe("test-binary.bin");
    expect(names[7]).toBe("readme.txt");
  });

  test("sorts by size", async ({ page }) => {
    await page.locator("th", { hasText: "Size" }).click();
    // Just verify the table is still rendered after sorting
    await expect(page.locator(".file-row")).toHaveCount(8);
  });

  test("sorts by modified date", async ({ page }) => {
    await page.locator("th", { hasText: "Modified" }).click();
    await expect(page.locator(".file-row")).toHaveCount(8);
  });
});
