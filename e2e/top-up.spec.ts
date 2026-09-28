import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signUp } from "./helpers.ts";

test("approved Top-up credits the Balance and survives a reload", async ({
  page,
}) => {
  await signUp(page);
  const balance = page.getByRole("region", { name: "Saldo" });
  await expect(balance).toContainText("$0.00");
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Recargar" }).click();
  await page.getByLabel("Monto (MXN)", { exact: true }).fill("150.00");
  await page
    .getByLabel("Número de tarjeta", { exact: true })
    .fill("1234123412341234");
  await page.getByLabel("Vencimiento", { exact: true }).fill("1226");
  await page.getByLabel("CVV", { exact: true }).fill("543");
  const submit = page.getByRole("button", { name: "Recargar $150.00" });
  await expect(submit).toBeEnabled();
  await expectNoA11yViolations(page);

  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Pago aprobado" }),
  ).toBeVisible();
  await expect(page.getByText("Recarga aprobada")).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Listo" }).click();
  await expect(balance).toContainText("$150.00");
  await page.reload();
  await expect(balance).toContainText("$150.00");
});
