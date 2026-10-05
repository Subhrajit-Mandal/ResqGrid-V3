import { test, expect } from "./fixture";
import { DEMO_PASSWORD } from "../../frontend/src/auth/config";
async function login(page: import("@playwright/test").Page, label: string) {
  await page.getByRole("button", { name: "LOGIN", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(label) }).click();
  await page.getByLabel("Demo password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page.locator(".login-dialog")).toHaveCount(0);
}
async function switchRole(
  page: import("@playwright/test").Page,
  label: string,
) {
  await page.locator(".account summary").click();
  await page.getByRole("button", { name: "Log out / switch role" }).click();
  await page.getByRole("button", { name: new RegExp(label) }).click();
  await page.getByLabel("Demo password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page.locator(".login-dialog")).toHaveCount(0);
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});
test("citizen SOS flows into assignment and tracking", async ({ page }) => {
  await login(page, "Citizen Login");
  await page
    .getByRole("link", { name: "Request demo SOS", exact: true })
    .click();
  await page
    .getByLabel("Demo landmark", { exact: true })
    .fill("Fictional north bank gate");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Number of people").fill("3");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Confirm demo SOS" }).click();
  await expect(
    page.getByRole("heading", { name: "Request tracking" }),
  ).toBeVisible();
  const path = new URL(page.url()).pathname;
  await switchRole(page, "Agency Login");
  await page.getByLabel("Search incidents").fill("Fictional north bank gate");
  await page.locator(".incident-row").click();
  await page.getByLabel("Available team").selectOption("R-03");
  await page.getByRole("button", { name: "Assign team", exact: true }).click();
  await expect(page.locator("dialog")).toContainText("River Team Charlie");
  await page
    .getByRole("button", { name: "Mark en route", exact: true })
    .click();
  await page.getByRole("button", { name: "Close incident" }).click();
  await switchRole(page, "Citizen Login");
  await page.goto(path);
  await expect(page.locator(".request-detail-grid")).toContainText("En route");
  await expect(page.locator(".request-detail-grid")).toContainText(
    "River Team Charlie",
  );
});
test("spike and stale evidence cannot create warning candidates", async ({
  page,
}) => {
  await login(page, "Super Admin Login");
  await page.goto("/intelligence");
  await page.getByLabel("Select simulated scenario").selectOption("spike");
  await expect(
    page.getByRole("button", { name: "Create warning candidate" }),
  ).toBeDisabled();
  await page.getByLabel("Select simulated scenario").selectOption("stale");
  await expect(page.locator(".decision-panel")).toContainText(
    "Insufficient data",
  );
  await expect(
    page.getByRole("button", { name: "Create warning candidate" }),
  ).toBeDisabled();
  await page.getByLabel("Select simulated scenario").selectOption("rising");
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Advance sample" }).click();
  await expect(
    page.getByRole("button", { name: "Create warning candidate" }),
  ).toBeEnabled();
});
test("publisher approval makes a draft visible to citizens", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept());
  await login(page, "Super Admin Login");
  await page.goto("/intelligence/warnings");
  await page.getByRole("button", { name: "Approve & publish" }).click();
  await switchRole(page, "Citizen Login");
  await page.goto("/me");
  await page.getByLabel("Your demo area").selectOption("Z-02");
  await expect(
    page.getByRole("heading", {
      name: "Eastern catchment requires monitoring",
    }),
  ).toBeVisible();
});
test("mobile primary flows have no horizontal page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#landing-title")).toHaveText(
    "Welcome to RESQGRID INDIA",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await login(page, "Super Admin Login");
  for (const path of [
    "/",
    "/sos",
    "/intelligence",
    "/operations",
    "/admin",
    "/operations/recovery",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(fits, path).toBeTruthy();
  }
});
test("optional agent tools validate inputs and update shared state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const registry: Record<string, any> = {};
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool: (tool: any, options: any) => {
          registry[tool.name] = tool;
          options.signal.addEventListener(
            "abort",
            () => delete registry[tool.name],
          );
        },
      },
    });
    (window as any).__tools = registry;
  });
  await login(page, "Super Admin Login");
  await page.goto("/intelligence");
  await page.waitForFunction(() =>
    Boolean((window as any).__tools?.read_demo_situation),
  );
  const before = await page.evaluate(() =>
    (window as any).__tools.read_demo_situation.execute({}),
  );
  const after = await page.evaluate(() =>
    (window as any).__tools.advance_demo_scenario.execute({ samples: 2 }),
  );
  expect(after.sample).toBe(before.sample + 2);
  await expect(page.locator(".sample-count")).toHaveText(
    `Sample ${after.sample}`,
  );
  const failure = await page.evaluate(async () => {
    try {
      await (window as any).__tools.advance_demo_scenario.execute({
        samples: 99,
      });
      return false;
    } catch {
      return true;
    }
  });
  expect(failure).toBeTruthy();
  const unchanged = await page.evaluate(() =>
    (window as any).__tools.read_demo_situation.execute({}),
  );
  expect(unchanged.sample).toBe(after.sample);
});

test("login rejects an incorrect password and citizen routes cannot open command controls", async ({
  page,
}) => {
  await page.getByRole("button", { name: "LOGIN", exact: true }).click();
  await expect(page.locator(".role-option")).toHaveCount(3);
  await page.getByRole("button", { name: /Citizen Login/ }).click();
  await page.getByLabel("Demo password").fill("incorrect");
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Incorrect demo password",
  );
  await page.getByLabel("Demo password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Your local situation" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your local situation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Rescue operations", exact: true }),
  ).toHaveCount(0);
  await page.goto("/admin");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choose your workspace" }),
  ).toBeVisible();
});
test("landing login supports keyboard focus and Escape dismissal", async ({
  page,
}) => {
  const button = page.getByRole("button", { name: "LOGIN", exact: true });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page
      .locator("dialog")
      .evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator(".login-dialog")).toHaveCount(0);
  await expect(button).toBeFocused();
});
