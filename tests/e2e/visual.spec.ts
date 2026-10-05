import { test, expect } from "./fixture";
import { mkdir } from "node:fs/promises";
import { DEMO_PASSWORD } from "../../frontend/src/auth/config";
const directory = process.env.PLAYWRIGHT_SCREENSHOT_DIR;
test("landing and role workspaces fit desktop, tablet and mobile viewports", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (directory) await mkdir(directory, { recursive: true });
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator(".approved-landing-image")).toBeVisible();
    await page
      .locator(".approved-landing-image")
      .evaluate((img: HTMLImageElement) => img.decode());
    expect(
      await page
        .locator(".approved-landing-image")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBe(2048);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    if (directory)
      await page.screenshot({
        path: `${directory}/landing-${viewport.width}.png`,
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.getByRole("button", { name: "LOGIN", exact: true }).click();
  if (directory) await page.screenshot({ path: `${directory}/login.png` });
  await page.getByRole("button", { name: /Super Admin Login/ }).click();
  await page.getByLabel("Demo password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Administration", exact: true }),
  ).toBeVisible();
  for (const route of [
    "/intelligence",
    "/operations",
    "/me",
    "/admin",
    "/operations/recovery",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await page.locator(".workspace-loading").waitFor({ state: "hidden" });
    await expect(page.locator(".map-loading")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    if (directory)
      await page.screenshot({
        path: `${directory}/${route.replaceAll("/", "")}-desktop.png`,
        fullPage: true,
      });
  }
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/intelligence",
      "/operations",
      "/me",
      "/admin",
      "/operations/recovery",
    ]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator(".map-loading")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} fits ${width}px`,
      ).toBe(true);
      if (directory)
        await page.screenshot({
          path: `${directory}/${route.replaceAll("/", "")}-${width}.png`,
          fullPage: true,
        });
    }
  }
  await page.goto("/operations");
  await page.locator(".incident-row").first().click();
  await expect(page.locator(".incident-dialog")).toBeVisible();
  await expect(page.getByLabel("Available team")).toBeVisible();
  if (directory)
    await page.screenshot({ path: `${directory}/incident-dialog-mobile.png` });
  await page.getByRole("button", { name: "Close incident" }).click();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(page.locator(".sidebar.open")).toBeVisible();
  if (directory)
    await page.screenshot({ path: `${directory}/navigation-mobile.png` });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/intelligence");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Map layers" }).click();
  await expect(page.getByLabel("Sensor nodes")).toBeVisible();
  await page.getByLabel("Shelters").check();
  await expect(page.getByLabel("Shelters")).toBeChecked();
  await page.getByRole("button", { name: "Map layers" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.locator(".map-zone-pills button").nth(1).click();
  await expect(page.getByLabel("Select zone")).toHaveValue("Z-02");
  expect(errors).toEqual([]);
});
