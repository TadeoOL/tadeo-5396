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
  await user.type(screen.getByLabelText("Full name"), fullName);
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.type(screen.getByLabelText("Confirm password"), confirm);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

test("shows an error under every invalid field and focuses the first", async () => {
  render(<App />);
  await fill("A", "ana@", "short", "different");
  expect(
    await screen.findByText("Enter your full name (2–80 characters)."),
  ).toBeInTheDocument();
  expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  expect(
    screen.getByText("Use at least 15 characters. A short phrase works well."),
  ).toBeInTheDocument();
  expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
  const name = screen.getByLabelText("Full name");
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
    await screen.findByText("An account with this email already exists."),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute(
    "href",
    "/sign-in",
  );
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
    await screen.findByRole("heading", { level: 1, name: "Hi, Ana López" }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/dashboard");
  expect(document.title).toBe("Dashboard · Snailrace");
  expect(
    within(screen.getByRole("region", { name: "Balance" })).getByText("$0.00"),
  ).toBeInTheDocument();
});
