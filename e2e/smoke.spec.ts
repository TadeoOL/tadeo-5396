import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the production server answers the health check", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});

test("the built app loads in Archivo and passes axe", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toContainText("Snailrace");
  await expect(page.locator("body")).toHaveCSS(
    "font-family",
    /Archivo Variable/,
  );
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
});

test("a deep link falls back to the app", async ({ page }) => {
  const res = await page.goto("/some/deep/link");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("banner")).toContainText("Snailrace");
});
