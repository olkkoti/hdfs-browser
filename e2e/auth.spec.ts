import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("Authentication", () => {
  test("shows login form when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".login-form")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText("Sign in");
  });

  test("logs in with valid credentials", async ({ page }) => {
    await login(page);
    await expect(page.locator("h1")).toHaveText("HDFS Browser");
    await expect(page.locator(".app-header-user")).toContainText("hadoop");
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[type="text"]', "baduser");
    await page.fill('input[type="password"]', "badpass");
    await page.click('button[type="submit"]');
    await expect(page.locator(".login-error")).toBeVisible();
  });

  test("session persists on reload", async ({ page }) => {
    await login(page);
    await page.reload();
    await expect(page.locator("h1")).toHaveText("HDFS Browser");
    await expect(page.locator(".app-header-user")).toContainText("hadoop");
  });

  test("sign out returns to login", async ({ page }) => {
    await login(page);
    await page.click(".app-header-logout");
    await expect(page.locator(".login-form")).toBeVisible();
  });
});
