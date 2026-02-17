import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("LDAP Authentication", () => {
  test("logs in with valid LDAP credentials", async ({ page }) => {
    await login(page, "testuser", "testpass");
    await expect(page.locator("h1")).toHaveText("HDFS Browser");
    await expect(page.locator(".app-header-user")).toContainText("testuser");
  });

  test("logs in with second LDAP user", async ({ page }) => {
    await login(page, "alice", "alicepass");
    await expect(page.locator("h1")).toHaveText("HDFS Browser");
    await expect(page.locator(".app-header-user")).toContainText("alice");
  });

  test("shows error for invalid password", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[type="text"]', "testuser");
    await page.fill('input[type="password"]', "wrongpass");
    await page.click('button[type="submit"]');
    await expect(page.locator(".login-error")).toBeVisible();
  });

  test("shows error for non-existent user", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[type="text"]', "nouser");
    await page.fill('input[type="password"]', "nopass");
    await page.click('button[type="submit"]');
    await expect(page.locator(".login-error")).toBeVisible();
  });

  test("session persists on reload", async ({ page }) => {
    await login(page, "testuser", "testpass");
    await page.reload();
    await expect(page.locator("h1")).toHaveText("HDFS Browser");
    await expect(page.locator(".app-header-user")).toContainText("testuser");
  });

  test("sign out returns to login page", async ({ page }) => {
    await login(page, "testuser", "testpass");
    await page.click(".app-header-logout");
    await expect(page.locator(".login-form")).toBeVisible();
  });
});
