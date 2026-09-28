import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signUp } from "./helpers.ts";

test("a User signs up, signs out and signs back in", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(
    page.getByRole("heading", { level: 1, name: "Create your account" }),
  ).toBeVisible();
  await expectNoA11yViolations(page);

  const { email, password } = await signUp(page);
  const greeting = page.getByRole("heading", {
    level: 1,
    name: "Hi, Ana López",
  });
  const balance = page.getByRole("region", { name: "Balance" });
  await expect(greeting).toBeVisible();
  await expect(balance).toContainText("$0.00");
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/sign-in");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
  await expect(greeting).toBeVisible();
  await expect(balance).toContainText("$0.00");

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/sign-in");
  await page.goto("/dashboard");
  await page.waitForURL("**/sign-in");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeVisible();
});
