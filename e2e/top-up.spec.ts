import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signUp } from "./helpers.ts";

test("approved Top-up credits the Balance and survives a reload", async ({
  page,
}) => {
  await signUp(page);
  const balance = page.getByRole("region", { name: "Balance" });
  await expect(balance).toContainText("$0.00");
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Top up" }).click();
  await page.getByLabel("Amount (MXN)", { exact: true }).fill("150.00");
  await page
    .getByLabel("Card number", { exact: true })
    .fill("1234123412341234");
  await page.getByLabel("Expiry", { exact: true }).fill("1226");
  await page.getByLabel("CVV", { exact: true }).fill("543");
  const submit = page.getByRole("button", { name: "Top up $150.00" });
  await expect(submit).toBeEnabled();
  await expectNoA11yViolations(page);

  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Payment approved" }),
  ).toBeVisible();
  await expect(page.getByText("Top-up approved")).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Done" }).click();
  await expect(balance).toContainText("$150.00");
  await page.reload();
  await expect(balance).toContainText("$150.00");
});
