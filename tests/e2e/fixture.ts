import { test as base, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
// Optional isolated production-bundle testing when the managed preview is not
// reachable from the local test runner. This does not replace the Site preview.
export const test = base.extend({
  page: async ({ page, context, baseURL }, use) => {
    if (process.env.PLAYWRIGHT_STATIC_BUILD) {
      const root = resolve(process.env.PLAYWRIGHT_STATIC_BUILD);
      const origin = new URL(baseURL!).origin;
      await context.route(`${origin}/**`, async (route) => {
        const pathname = decodeURIComponent(
          new URL(route.request().url()).pathname,
        );
        const target = resolve(root, `.${pathname}`);
        if (target !== root && !target.startsWith(root + sep)) {
          await route.fulfill({ status: 403 });
          return;
        }
        const types: Record<string, string> = {
          ".html": "text/html",
          ".js": "text/javascript",
          ".mjs": "text/javascript",
          ".css": "text/css",
          ".png": "image/png",
          ".svg": "image/svg+xml",
          ".json": "application/json",
        };
        try {
          await route.fulfill({
            body: await readFile(target),
            contentType: types[extname(target)] || "application/octet-stream",
          });
        } catch {
          if (extname(pathname)) await route.fulfill({ status: 404 });
          else
            await route.fulfill({
              body: await readFile(resolve(root, "index.html")),
              contentType: "text/html",
            });
        }
      });
    }
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await use(page);
    expect(errors).toEqual([]);
  },
});
export { expect };
