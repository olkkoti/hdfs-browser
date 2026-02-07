import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("Permissions", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator(".file-row", { hasText: "data" }).click();
    await expect(page.locator(".file-table")).toBeVisible();
  });

  test("opens permissions dialog from table", async ({ page }) => {
    const row = page.locator(".file-row", { hasText: "readme.txt" });
    await row.locator('.action-btn[title="Permissions"]').click();
    await expect(page.locator(".perm-modal")).toBeVisible();
    await expect(page.locator(".perm-title")).toContainText("Permissions:");
  });

  test("permissions tab shows POSIX controls", async ({ page }) => {
    const row = page.locator(".file-row", { hasText: "readme.txt" });
    await row.locator('.action-btn[title="Permissions"]').click();
    await expect(page.locator(".perm-modal")).toBeVisible();

    // Verify permissions tab is active by default
    await expect(page.locator(".perm-tab.active")).toHaveText("Permissions");
    // Owner info
    await expect(page.locator(".perm-owner-info")).toContainText("Owner:");
    // Octal input
    await expect(page.locator(".perm-octal-input")).toBeVisible();
    // Preview
    await expect(page.locator(".perm-preview")).toBeVisible();
    // Checkbox grid
    await expect(page.locator(".perm-checkbox-grid")).toBeVisible();
  });

  test("edit octal value updates preview", async ({ page }) => {
    const row = page.locator(".file-row", { hasText: "readme.txt" });
    await row.locator('.action-btn[title="Permissions"]').click();
    await expect(page.locator(".perm-modal")).toBeVisible();

    await page.locator(".perm-octal-input").fill("777");
    await expect(page.locator(".perm-preview")).toHaveText("rwxrwxrwx");

    await page.locator(".perm-octal-input").fill("000");
    await expect(page.locator(".perm-preview")).toHaveText("---------");
  });

  test("checkbox and octal stay in sync", async ({ page }) => {
    const row = page.locator(".file-row", { hasText: "readme.txt" });
    await row.locator('.action-btn[title="Permissions"]').click();
    await expect(page.locator(".perm-modal")).toBeVisible();

    // Set octal to 000 first
    await page.locator(".perm-octal-input").fill("000");

    // Check the Owner Read checkbox (first checkbox in the grid)
    const checkboxes = page.locator(".perm-checkbox-grid input[type='checkbox']");
    await checkboxes.nth(0).check(); // Owner read
    // Octal should now be 400
    await expect(page.locator(".perm-octal-input")).toHaveValue("400");
  });

  test("apply permissions and restore", async ({ page }) => {
    const row = page.locator(".file-row", { hasText: "readme.txt" });
    await row.locator('.action-btn[title="Permissions"]').click();
    await expect(page.locator(".perm-modal")).toBeVisible();

    // Save original octal
    const original = await page.locator(".perm-octal-input").inputValue();

    // Change to 777 and apply
    await page.locator(".perm-octal-input").fill("777");
    await page.locator(".perm-btn.primary", { hasText: "Apply" }).click();
    // Wait for save to complete (button text goes from "Applying..." back to "Apply")
    await expect(page.locator(".perm-btn.primary", { hasText: "Apply" })).toBeEnabled();
    await expect(page.locator(".perm-preview")).toHaveText("rwxrwxrwx");

    // Restore original permission
    await page.locator(".perm-octal-input").fill(original);
    await page.locator(".perm-btn.primary", { hasText: "Apply" }).click();
    // Wait for save to complete
    await expect(page.locator(".perm-btn.primary", { hasText: "Apply" })).toBeEnabled();
    await expect(page.locator(".perm-octal-input")).toHaveValue(original);

    await page.locator(".perm-close").click();
  });

  test("ACL tab shows entries", async ({ page }) => {
    const row = page.locator(".file-row", { hasText: "readme.txt" });
    await row.locator('.action-btn[title="Permissions"]').click();
    await expect(page.locator(".perm-modal")).toBeVisible();

    // Switch to ACLs tab
    await page.locator(".perm-tab", { hasText: "ACLs" }).click();
    await expect(page.locator(".acl-section")).toBeVisible();
    await expect(page.locator("h4", { hasText: "Access ACL Entries" })).toBeVisible();
    // Base entries should be visible
    await expect(page.locator(".acl-table")).toBeVisible();
  });

  test("add and remove ACL entry", async ({ page }) => {
    const row = page.locator(".file-row", { hasText: "readme.txt" });
    await row.locator('.action-btn[title="Permissions"]').click();
    await expect(page.locator(".perm-modal")).toBeVisible();

    // Switch to ACLs tab
    await page.locator(".perm-tab", { hasText: "ACLs" }).click();

    // Add a user ACL entry
    const addRow = page.locator(".acl-add-row").first();
    await addRow.locator('input[type="text"]').fill("alice");
    // Read checkbox is already checked by default
    await addRow.locator(".acl-add-btn").click();

    // Wait for the entry to appear and add button to be re-enabled (saving complete)
    await expect(page.locator(".acl-table").first()).toContainText("alice");
    await expect(addRow.locator(".acl-add-btn")).toBeEnabled();

    // Remove the alice entry specifically
    const aliceRow = page.locator(".acl-table tr", { hasText: "alice" });
    await expect(aliceRow.locator(".acl-remove-btn")).toBeEnabled();
    await aliceRow.locator(".acl-remove-btn").click();

    // Wait for the removal to complete and alice to disappear
    await expect(page.locator(".acl-table").first()).not.toContainText("alice", { timeout: 10000 });
  });

  test("directory shows default ACL section", async ({ page }) => {
    // Navigate to a directory (logs) and open permissions
    const row = page.locator(".file-row", { hasText: "logs" });
    await row.locator('.action-btn[title="Permissions"]').click();
    await expect(page.locator(".perm-modal")).toBeVisible();

    // Switch to ACLs tab
    await page.locator(".perm-tab", { hasText: "ACLs" }).click();

    // Should show Default ACL section for directories
    await expect(page.locator("h4", { hasText: "Default ACL Entries" })).toBeVisible();
    // Should show Remove Default ACLs button
    await expect(page.locator(".perm-btn.danger", { hasText: "Remove Default ACLs" })).toBeVisible();
  });

  test("permissions from file viewer", async ({ page }) => {
    // Open file viewer
    await page.locator(".file-row", { hasText: "readme.txt" }).click();
    await expect(page.locator(".fv-sidebar")).toBeVisible();

    // Click Permissions button in viewer sidebar
    await page.locator(".fv-action-btn", { hasText: "Permissions" }).click();
    await expect(page.locator(".perm-modal")).toBeVisible();
    await expect(page.locator(".perm-title")).toContainText("Permissions:");

    await page.locator(".perm-close").click();
  });
});
