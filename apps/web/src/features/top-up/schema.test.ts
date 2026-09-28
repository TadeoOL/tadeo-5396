import { expect, test } from "vitest";
import { parseAmountCents, topUpFormSchema } from "./schema";

test("parseAmountCents converts pesos to integer cents", () => {
  expect(parseAmountCents("150")).toBe(15000);
  expect(parseAmountCents("150.5")).toBe(15050);
  expect(parseAmountCents("0.29")).toBe(29);
  expect(parseAmountCents("0.01")).toBe(1);
  expect(parseAmountCents(" 10000.00 ")).toBe(1000000);
});

test("parseAmountCents rejects what the API rejects", () => {
  for (const input of [
    "0",
    "0.00",
    "10000.01",
    "10.123",
    "-5",
    "1e3",
    "1,000",
    "abc",
    "",
  ]) {
    expect(parseAmountCents(input)).toBeNull();
  }
});

test("topUpFormSchema outputs the Charge fields", () => {
  expect(
    topUpFormSchema.parse({
      amount: "150.00",
      cardNumber: "1234 1234 1234 1234",
      expiry: "12/26",
      cvv: "543",
      cardholderName: "  Ana López ",
    }),
  ).toEqual({
    amountCents: 15000,
    card: {
      card_number: "1234123412341234",
      expiration_date: "12/26",
      security_code: "543",
      cardholder_name: "Ana López",
    },
  });
});

test("topUpFormSchema reports the dialog copy for every field", () => {
  const result = topUpFormSchema.safeParse({
    amount: "0",
    cardNumber: "1234 1234 1234 12",
    expiry: "13/26",
    cvv: "54",
    cardholderName: "   ",
  });
  expect(
    result.error?.issues.map((issue) => [issue.path[0], issue.message]),
  ).toEqual([
    ["amount", "Enter an amount from $0.01 to $10,000.00."],
    ["cardNumber", "Enter the 16 digits of the card."],
    ["expiry", "Use MM/YY."],
    ["cvv", "Enter 3 digits."],
    ["cardholderName", "Enter the name on the card (up to 100 characters)."],
  ]);
  const long = topUpFormSchema.safeParse({
    amount: "150",
    cardNumber: "1234123412341234",
    expiry: "12/26",
    cvv: "543",
    cardholderName: "a".repeat(101),
  });
  expect(long.error?.issues.map((issue) => issue.message)).toEqual([
    "Enter the name on the card (up to 100 characters).",
  ]);
});
