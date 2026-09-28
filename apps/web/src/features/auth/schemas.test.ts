import { beforeEach, expect, test } from "vitest";
import { setBackend } from "@/storage/backend";
import { createMemoryStorage } from "@/storage/memory-storage";
import { signUpSchema } from "./schemas";

beforeEach(() => setBackend(createMemoryStorage()));

const PASSWORD_ERROR =
  "Usa al menos 15 caracteres. Una frase corta funciona bien.";
const valid = {
  fullName: "Ana López",
  email: "ana@example.com",
  password: "correct horse battery staple",
  confirmPassword: "correct horse battery staple",
};
const errorsFor = (input: Partial<typeof valid>) => {
  const result = signUpSchema.safeParse({ ...valid, ...input });
  return result.success
    ? []
    : result.error.issues.map((issue) => [issue.path.join("."), issue.message]);
};

test("normalizes the full name and the email", () => {
  const values = signUpSchema.parse({
    ...valid,
    fullName: "  Ana   María  López ",
    email: " Ana@Example.COM ",
  });
  expect(values.fullName).toBe("Ana María López");
  expect(values.email).toBe("ana@example.com");
});

test("applies NFKC to the password and never trims it", () => {
  const password = "ｐａｓｓｐｈｒａｓｅ with spaces ";
  const values = signUpSchema.parse({
    ...valid,
    password,
    confirmPassword: password,
  });
  expect(values.password).toBe("passphrase with spaces ");
});

test("accepts 15 to 128 characters with no composition rules", () => {
  for (const n of [15, 128]) {
    const password = "a".repeat(n);
    expect(errorsFor({ password, confirmPassword: password })).toEqual([]);
  }
  for (const n of [14, 129]) {
    const password = "a".repeat(n);
    expect(errorsFor({ password, confirmPassword: password })).toEqual([
      ["password", PASSWORD_ERROR],
    ]);
  }
});

test("reports every field error with the spec copy", () => {
  expect(
    errorsFor({
      fullName: "A",
      email: "ana@",
      password: "short",
      confirmPassword: "different",
    }),
  ).toEqual([
    ["fullName", "Ingresa tu nombre completo (de 2 a 80 caracteres)."],
    ["email", "Ingresa un correo electrónico válido."],
    ["password", PASSWORD_ERROR],
    ["confirmPassword", "Las contraseñas no coinciden."],
  ]);
});

test("accepts real-world names and rejects control characters", () => {
  for (const fullName of ["O'Brien-Núñez", "李小龙", "Zoë"]) {
    expect(errorsFor({ fullName })).toEqual([]);
  }
  for (const fullName of ["Ana\u0007López", "a".repeat(81)]) {
    expect(errorsFor({ fullName })).toEqual([
      ["fullName", "Ingresa tu nombre completo (de 2 a 80 caracteres)."],
    ]);
  }
});

test("rejects malformed emails", () => {
  for (const email of [
    "ana@example",
    "ana maria@example.com",
    `${"a".repeat(243)}@example.com`,
  ]) {
    expect(errorsFor({ email })).toContainEqual([
      "email",
      "Ingresa un correo electrónico válido.",
    ]);
  }
});
