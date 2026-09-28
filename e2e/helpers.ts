import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function signUp(
  page: Page,
): Promise<{ fullName: string; email: string; password: string }> {
  const values = {
    fullName: "Ana López",
    email: "ana@example.com",
    password: "correct horse battery staple",
  };
  await page.goto("/sign-up");
  await page.getByLabel("Full name", { exact: true }).fill(values.fullName);
  await page.getByLabel("Email", { exact: true }).fill(values.email);
  await page.getByLabel("Password", { exact: true }).fill(values.password);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill(values.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard");
  return values;
}

export async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}
