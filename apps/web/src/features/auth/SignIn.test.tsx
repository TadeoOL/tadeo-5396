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
  const emailInput = screen.getByLabelText("Email");
  const passwordInput = screen.getByLabelText("Password");
  await user.clear(emailInput);
  if (email) await user.type(emailInput, email);
  await user.clear(passwordInput);
  if (password) await user.type(passwordInput, password);
  await user.click(screen.getByRole("button", { name: /Sign(ing)? in/ }));
}

test("asks for both fields", async () => {
  render(<App />);
  await signInWith("", "");
  expect(await screen.findByText("Enter your email.")).toBeInTheDocument();
  expect(screen.getByText("Enter your password.")).toBeInTheDocument();
});

test("shows the generic error and clears the password", async () => {
  await registerAna();
  endSession();
  render(<App />);
  await signInWith("ana@example.com", "wrong horse battery staple");
  expect(
    await screen.findByText("Invalid email or password."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toHaveValue("");
  await signInWith("nobody@example.com", "wrong horse battery staple");
  expect(
    await screen.findByText("Invalid email or password."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toHaveValue("");
});

test("shows the lock message after 5 failed attempts", async () => {
  render(<App />);
  for (let i = 0; i < 5; i++) {
    await signInWith("nobody@example.com", "wrong horse battery staple");
  }
  expect(await screen.findByText("Too many attempts.")).toBeInTheDocument();
  expect(screen.getByText(/Try again in \d+ s\./)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
});

test("signs in and lands on the dashboard", async () => {
  await registerAna();
  endSession();
  render(<App />);
  await signInWith("ana@example.com", "correct horse battery staple");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Hi, Ana López" }),
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
  expect(await screen.findByText("Your session expired.")).toBeInTheDocument();
  expect(screen.getByText("Sign in again to continue.")).toBeInTheDocument();
  expect(window.location.pathname).toBe("/sign-in");
});

test("Sign out returns to sign-in and keeps the User", async () => {
  await registerAna();
  window.history.replaceState(null, "", "/dashboard");
  render(<App />);
  expect(screen.getByRole("banner")).toHaveTextContent("Ana López");
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Sign out" }));
  expect(
    await screen.findByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/sign-in");
  expect(getBackend().getItem(SESSION_KEY)).toBeNull();
  expect(getBackend().getItem(USERS_KEY)).toContain("Ana López");
});
