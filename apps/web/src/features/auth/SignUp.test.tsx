import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import { App } from "@/app/App";
import { getBackend, setBackend } from "@/storage/backend";
import { createMemoryStorage } from "@/storage/memory-storage";
import { endSession } from "@/storage/session";
import { USERS_KEY } from "@/storage/users";
import { signUp } from "./auth";
import { signUpSchema } from "./schemas";

beforeEach(() => {
  setBackend(createMemoryStorage());
  window.history.replaceState(null, "", "/sign-up");
});

async function fill(
  fullName: string,
  email: string,
  password: string,
  confirm: string,
) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Nombre completo"), fullName);
  await user.type(screen.getByLabelText("Correo electrónico"), email);
  await user.type(screen.getByLabelText("Contraseña"), password);
  await user.type(screen.getByLabelText("Confirma la contraseña"), confirm);
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

test("shows an error under every invalid field and focuses the first", async () => {
  render(<App />);
  await fill("A", "ana@", "short", "different");
  expect(
    await screen.findByText(
      "Ingresa tu nombre completo (de 2 a 80 caracteres).",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Ingresa un correo electrónico válido."),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Usa al menos 15 caracteres. Una frase corta funciona bien.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
  const name = screen.getByLabelText("Nombre completo");
  expect(name).toHaveFocus();
  expect(name).toHaveAttribute("aria-invalid", "true");
  expect(getBackend().getItem(USERS_KEY)).toBeNull();
});

test("shows the duplicate-email message with a link to sign in", async () => {
  await signUp(
    signUpSchema.parse({
      fullName: "Ana López",
      email: "ana@example.com",
      password: "correct horse battery staple",
      confirmPassword: "correct horse battery staple",
    }),
  );
  endSession();
  render(<App />);
  await fill(
    "Ana Two",
    "ANA@example.com",
    "another long pass phrase",
    "another long pass phrase",
  );
  expect(
    await screen.findByText(
      "Ya existe una cuenta con este correo electrónico.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Inicia sesión con esa cuenta" }),
  ).toHaveAttribute("href", "/sign-in");
  expect(window.location.pathname).toBe("/sign-up");
});

test("lands on the dashboard after signing up", async () => {
  render(<App />);
  await fill(
    "Ana López",
    "ana@example.com",
    "correct horse battery staple",
    "correct horse battery staple",
  );
  expect(
    await screen.findByRole("heading", { level: 1, name: "Hola, Ana López" }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/dashboard");
  expect(document.title).toBe("Panel · Snailrace");
  expect(
    within(screen.getByRole("region", { name: "Saldo" })).getByText("$0.00"),
  ).toBeInTheDocument();
});
