import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { getBackend, setBackend } from "@/storage/backend";
import { settleTopUp, startTopUp } from "@/storage/ledger";
import { createMemoryStorage } from "@/storage/memory-storage";
import { TopUpHistory } from "./TopUpHistory";

const userId = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

const approved = {
  id: "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10",
  status: "approved" as const,
  status_detail: "accredited" as const,
  transaction_amount: 15000,
  date_created: "2026-09-28T17:04:05.123Z",
  authorization_code: "482915",
  reference: "5f1c3a8e-2d4b-4c6e-8f9a-1b2c3d4e5f60",
  payer_id: userId,
  payer_email: "ana@example.com",
  card: {
    card_number: "1234123412341234",
    expiration_date: "12/26",
    security_code: "543",
    cardholder_name: "Ana López",
  },
};

beforeEach(() => {
  setBackend(createMemoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("shows the empty state", () => {
  render(<TopUpHistory userId={userId} />);
  expect(screen.getByText("Aún no hay recargas.")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Recarga con SnailPay para agregar fondos. Cada intento aparece aquí, sea cual sea su resultado.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

test("lists every Top-up newest first with its outcome", () => {
  const seed = (
    amountCents: number,
    outcome?: "credited" | "declined" | "failed" | "unknown",
    charge?: typeof approved | Record<string, unknown>,
  ) => {
    const id = crypto.randomUUID();
    startTopUp(userId, { id, amountCents });
    if (outcome) settleTopUp(userId, id, outcome, charge as typeof approved);
  };
  seed(15000, "credited", approved);
  seed(5000, "declined", {
    ...approved,
    status: "rejected",
    status_detail: "cc_rejected_insufficient_amount",
    authorization_code: null,
    card: { ...approved.card, card_number: "1234123412340002" },
  });
  seed(2000, "failed", {
    ...approved,
    status: "error",
    status_detail: "service_unavailable",
    authorization_code: null,
  });
  seed(3000, "unknown");
  seed(1000);
  render(<TopUpHistory userId={userId} />);
  expect(screen.getByRole("region", { name: "Recargas" })).toBeInTheDocument();
  const rows = screen.getAllByRole("row").slice(1);
  const expected = [
    ["Procesando", "—", "$10.00"],
    ["Confirmando", "Aún sin confirmar.", "—", "$30.00"],
    ["Fallida", "SnailPay no estaba disponible", "•••• 1234", "$20.00"],
    ["Rechazada", "Fondos insuficientes", "•••• 0002", "$50.00"],
    ["Aprobada", "Cód. de autorización 482915", "•••• 1234", "$150.00"],
  ];
  expect(rows).toHaveLength(expected.length);
  rows.forEach((row, i) => {
    for (const text of expected[i] ?? [])
      expect(within(row).getByText(text)).toBeInTheDocument();
  });
});

test("shows the time for today and the date for older Top-ups", () => {
  const topUp = (createdAt: string) => ({
    id: crypto.randomUUID(),
    amountCents: 1000,
    createdAt,
    outcome: "pending",
  });
  getBackend().setItem(
    `snailrace.v1.ledger.${userId}`,
    JSON.stringify({
      balanceCents: 0,
      topUps: [
        topUp(new Date(2020, 8, 27, 12, 41).toISOString()),
        topUp(new Date().toISOString()),
      ],
    }),
  );
  render(<TopUpHistory userId={userId} />);
  const [, today, old] = screen.getAllByRole("row");
  expect(within(old!).getByText("27 sep, 12:41")).toBeInTheDocument();
  expect(within(today!).getAllByRole("cell")[0]).toHaveTextContent(
    /^\d{2}:\d{2}$/,
  );
});

test("updates when the ledger changes", () => {
  render(<TopUpHistory userId={userId} />);
  expect(screen.getByText("Aún no hay recargas.")).toBeInTheDocument();
  act(() => {
    startTopUp(userId, { id: crypto.randomUUID(), amountCents: 1000 });
  });
  expect(screen.getByText("Procesando")).toBeInTheDocument();
});

test("offers Check again on a Confirming Top-up", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => {})),
  );
  const id = crypto.randomUUID();
  startTopUp(userId, { id, amountCents: 1000 });
  settleTopUp(userId, id, "unknown");
  const ue = userEvent.setup();
  render(<TopUpHistory userId={userId} />);
  expect(screen.getByText("Aún sin confirmar.")).toBeInTheDocument();
  const button = screen.getByRole("button", { name: "Verificar de nuevo" });
  expect(button).toBeEnabled();
  await ue.click(button);
  expect(screen.getByRole("button", { name: "Verificando…" })).toBeDisabled();
});
