import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signUp } from "./helpers.ts";

test("a User signs up, signs out and signs back in", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(
    page.getByRole("heading", { level: 1, name: "Crea tu cuenta" }),
  ).toBeVisible();
  await expectNoA11yViolations(page);

  const { email, password } = await signUp(page);
  const greeting = page.getByRole("heading", {
    level: 1,
    name: "Hola, Ana López",
  });
  const balance = page.getByRole("region", { name: "Saldo" });
  await expect(greeting).toBeVisible();
  await expect(balance).toContainText("$0.00");
  await expect(
    page.getByRole("img", { name: /^[A-Z][a-z]+ ganó \d carreras?/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: /^\d+ ganadas, \d+ perdidas, de \d+ apuestas\.$/,
    }),
  ).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL("**/sign-in");
  await expect(
    page.getByRole("heading", { level: 1, name: "Iniciar sesión" }),
  ).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByLabel("Correo electrónico", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/dashboard");
  await expect(greeting).toBeVisible();
  await expect(balance).toContainText("$0.00");

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL("**/sign-in");
  await page.goto("/dashboard");
  await page.waitForURL("**/sign-in");
  await expect(
    page.getByRole("heading", { level: 1, name: "Iniciar sesión" }),
  ).toBeVisible();
});
