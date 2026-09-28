import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { App } from "@/app/App";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { getBackend, setBackend } from "@/storage/backend";
import { createMemoryStorage } from "@/storage/memory-storage";
import { startSession } from "@/storage/session";
import { addUser } from "@/storage/users";

beforeEach(() => {
  setBackend(createMemoryStorage());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

const at = (path: string) => window.history.replaceState(null, "", path);

const damageAnasLedger = () => {
  const ana = addUser({
    fullName: "Ana López",
    email: "ana@example.com",
    credential: {
      algo: "PBKDF2-SHA256" as const,
      iterations: 600000,
      salt: "AAAAAAAAAAAAAAAAAAAAAA==",
      hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    },
  })!;
  startSession(ana.id);
  getBackend().setItem(
    `snailrace.v1.ledger.${ana.id}`,
    '{"balanceCents":500,"topUps":[]}',
  );
};

const unreadableHeading = () =>
  screen.findByRole("heading", {
    level: 1,
    name: "No se pueden leer tus datos guardados",
  });

test("shows the unreadable local data screen when the Users registry is invalid", async () => {
  getBackend().setItem("snailrace.v1.users", "not json");
  at("/sign-in");
  render(<App />);
  const heading = await unreadableHeading();
  expect(heading).toHaveFocus();
  expect(
    screen.getByText(
      "Los datos que este navegador guarda para Snailrace están dañados, así que no vamos a adivinar tu saldo. Al restablecerlos se eliminan todas las cuentas y recargas guardadas en este navegador.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Restablecer datos locales" }),
  ).toBeInTheDocument();
  expect(document.title).toBe(
    "No se pueden leer tus datos guardados · Snailrace",
  );
  expect(getBackend().getItem("snailrace.v1.users")).toBe("not json");
});

test("shows it when the signed-in User's ledger breaks the invariant", async () => {
  damageAnasLedger();
  at("/dashboard");
  render(<App />);
  expect(await unreadableHeading()).toBeInTheDocument();
  expect(screen.queryByText("Hola, Ana López")).not.toBeInTheDocument();
});

test("Reset local data removes every snailrace.v1. key and lands on sign-in", async () => {
  damageAnasLedger();
  getBackend().setItem("snailrace.v1.throttle", "{}");
  getBackend().setItem("other.app", "keep");
  at("/dashboard");
  render(<App />);
  await unreadableHeading();
  await userEvent.click(
    screen.getByRole("button", { name: "Restablecer datos locales" }),
  );
  expect(
    await screen.findByRole("heading", { level: 1, name: "Iniciar sesión" }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/sign-in");
  expect(getBackend().length).toBe(1);
  expect(getBackend().getItem("other.app")).toBe("keep");
});

function Boom(): never {
  throw new Error("boom");
}

test("shows the error screen when a render throws", async () => {
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Algo salió mal",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "La página tuvo un error inesperado. Tu saldo y tus recargas están a salvo en este navegador.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Recargar la página" }),
  ).toBeInTheDocument();
  expect(document.title).toBe("Algo salió mal · Snailrace");
});
