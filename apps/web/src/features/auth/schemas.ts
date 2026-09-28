import { z } from "zod";

export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NAME_ERROR = "Enter your full name (2–80 characters).";
const EMAIL_ERROR = "Enter a valid email address.";
const PASSWORD_ERROR = "Use at least 15 characters. A short phrase works well.";

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
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUpValues = z.output<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your email.")
    .regex(EMAIL_FORMAT, EMAIL_ERROR),
  password: z.string().normalize("NFKC").min(1, "Enter your password."),
});

export type SignInInput = z.input<typeof signInSchema>;
export type SignInValues = z.output<typeof signInSchema>;
