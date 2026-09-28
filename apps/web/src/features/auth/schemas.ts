import { z } from "zod";

export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NAME_ERROR = "Ingresa tu nombre completo (de 2 a 80 caracteres).";
const EMAIL_ERROR = "Ingresa un correo electrónico válido.";
const PASSWORD_ERROR =
  "Usa al menos 15 caracteres. Una frase corta funciona bien.";

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .overwrite((v) => v.replace(/\s+/g, " "))
      .min(2, NAME_ERROR)
      .max(80, NAME_ERROR)
      .regex(/^\P{Cc}*$/u, NAME_ERROR),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, EMAIL_ERROR)
      .regex(EMAIL_FORMAT, EMAIL_ERROR),
    password: z
      .string()
      .normalize("NFKC")
      .min(15, PASSWORD_ERROR)
      .max(128, PASSWORD_ERROR),
    confirmPassword: z.string().normalize("NFKC"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUpValues = z.output<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Ingresa tu correo electrónico.")
    .regex(EMAIL_FORMAT, EMAIL_ERROR),
  password: z.string().normalize("NFKC").min(1, "Ingresa tu contraseña."),
});

export type SignInInput = z.input<typeof signInSchema>;
export type SignInValues = z.output<typeof signInSchema>;
