import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { App } from "@/app/App";
import { getBackend, setBackend } from "@/storage/backend";
import { createMemoryStorage } from "@/storage/memory-storage";
import { SESSION_KEY, startSession } from "@/storage/session";
import { addUser } from "@/storage/users";

beforeEach(() => setBackend(createMemoryStorage()));

const addAna = () =>
  addUser({
    fullName: "Ana López",
    email: "ana@example.com",
    credential: {
      algo: "PBKDF2-SHA256",
      iterations: 600000,
      salt: "AAAA",
      hash: "AAAA",
    },
  })!;

const at = (path: string) => window.history.replaceState(null, "", path);

test("RequireSession sends a visitor with no Session to sign-in", async () => {
  at("/dashboard");
  render(<App />);
  expect(
    await screen.findByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/sign-in");
});

test("PublicOnly sends a signed-in User to the dashboard", async () => {
  startSession(addAna().id);
  for (const path of ["/sign-up", "/sign-in"]) {
    at(path);
    render(<App />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Hi, Ana López" }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard");
    cleanup();
  }
});

test("redirects / and unknown paths by Session", async () => {
  at("/");
  render(<App />);
  await screen.findByRole("heading", { level: 1, name: "Sign in" });
  expect(window.location.pathname).toBe("/sign-in");
  cleanup();

  startSession(addAna().id);
  at("/nope");
  render(<App />);
  await screen.findByRole("heading", { level: 1, name: "Hi, Ana López" });
  expect(window.location.pathname).toBe("/dashboard");
});

test("restores a stored Session on the first render", () => {
  startSession(addAna().id);
  at("/dashboard");
  render(<App />);
  expect(
    screen.getByRole("heading", { level: 1, name: "Hi, Ana López" }),
  ).toBeInTheDocument();
});

test("signs the User out when the Session expires with the dashboard open", async () => {
  const ana = addAna();
  const now = Date.now();
  getBackend().setItem(
    SESSION_KEY,
    JSON.stringify({
      id: crypto.randomUUID(),
      userId: ana.id,
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 300).toISOString(),
    }),
  );
  at("/dashboard");
  render(<App />);
  expect(
    screen.getByRole("heading", { level: 1, name: "Hi, Ana López" }),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/sign-in");
  expect(getBackend().getItem(SESSION_KEY)).toBeNull();
});
