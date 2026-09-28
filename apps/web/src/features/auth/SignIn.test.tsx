import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import { App } from "@/app/App";
import { getBackend, setBackend } from "@/storage/backend";
import { createMemoryStorage } from "@/storage/memory-storage";
import { endSession, SESSION_KEY } from "@/storage/session";
import { readUsers, USERS_KEY } from "@/storage/users";
import { signUp } from "./auth";
import { signUpSchema } from "./schemas";

beforeEach(() => {
  setBackend(createMemoryStorage());
  window.history.replaceState(null, "", "/sign-in");
});

const registerAna = () =>
  signUp(
    signUpSchema.parse({
      fullName: "Ana López",
      email: "ana@example.com",
      password: "correct horse battery staple",
      confirmPassword: "correct horse battery staple",
    }),
  );

async function signInWith(email: string, password: string) {
  const user = userEvent.setup();
  const emailInput = screen.getByLabelText("Correo electrónico");
  const passwordInput = screen.getByLabelText("Contraseña");
  await user.clear(emailInput);
  if (email) await user.type(emailInput, email);
  await user.clear(passwordInput);
  if (password) await user.type(passwordInput, password);
  await user.click(
    screen.getByRole("button", { name: /Inici(ar|ando) sesión/ }),
  );
}

test("asks for both fields", async () => {
  render(<App />);
  await signInWith("", "");
  expect(
    await screen.findByText("Ingresa tu correo electrónico."),
  ).toBeInTheDocument();
  expect(screen.getByText("Ingresa tu contraseña.")).toBeInTheDocument();
});

test("shows the generic error and clears the password", async () => {
  await registerAna();
  endSession();
  render(<App />);
  await signInWith("ana@example.com", "wrong horse battery staple");
  expect(
    await screen.findByText("Correo electrónico o contraseña incorrectos."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Contraseña")).toHaveValue("");
  await signInWith("nobody@example.com", "wrong horse battery staple");
  expect(
    await screen.findByText("Correo electrónico o contraseña incorrectos."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Contraseña")).toHaveValue("");
});

test("shows the lock message after 5 failed attempts", async () => {
  render(<App />);
  for (let i = 0; i < 5; i++) {
    await signInWith("nobody@example.com", "wrong horse battery staple");
  }
  expect(await screen.findByText("Demasiados intentos.")).toBeInTheDocument();
  expect(screen.getByText(/Intenta de nuevo en \d+ s\./)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeDisabled();
});

test("signs in and lands on the dashboard", async () => {
  await registerAna();
  endSession();
  render(<App />);
  await signInWith("ana@example.com", "correct horse battery staple");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Hola, Ana López" }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/dashboard");
});

test("tells the User their Session expired", async () => {
  await registerAna();
  const [ana] = Object.values(readUsers());
  const now = Date.now();
  getBackend().setItem(
    SESSION_KEY,
    JSON.stringify({
      id: crypto.randomUUID(),
      userId: ana!.id,
      issuedAt: new Date(now - 120_000).toISOString(),
      expiresAt: new Date(now - 60_000).toISOString(),
    }),
  );
  window.history.replaceState(null, "", "/dashboard");
  render(<App />);
  expect(await screen.findByText("Tu sesión expiró.")).toBeInTheDocument();
  expect(
    screen.getByText("Inicia sesión de nuevo para continuar."),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/sign-in");
});

test("Sign out returns to sign-in and keeps the User", async () => {
  await registerAna();
  window.history.replaceState(null, "", "/dashboard");
  render(<App />);
  expect(screen.getByRole("banner")).toHaveTextContent("Ana López");
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(
    await screen.findByRole("heading", { level: 1, name: "Iniciar sesión" }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/sign-in");
  expect(getBackend().getItem(SESSION_KEY)).toBeNull();
  expect(getBackend().getItem(USERS_KEY)).toContain("Ana López");
});
