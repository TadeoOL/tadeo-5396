import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "./App.tsx";

test("renders the app shell with the wordmark", () => {
  render(<App />);
  expect(screen.getByRole("banner")).toHaveTextContent("Snailrace");
  expect(screen.getByRole("main")).toBeInTheDocument();
});
