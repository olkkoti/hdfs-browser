import { type Page } from "@playwright/test";

export async function login(page: Page, username = "hadoop", password = "hadoop") {
  await page.goto("/");
  await page.fill('input[type="text"]', username);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector("h1", { hasText: "HDFS Browser" });
}
