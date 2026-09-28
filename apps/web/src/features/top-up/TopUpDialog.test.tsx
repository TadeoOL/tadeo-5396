import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { setBackend } from "@/storage/backend";
import { readLedger } from "@/storage/ledger";
import { createMemoryStorage } from "@/storage/memory-storage";
import { TopUpDialog } from "./TopUpDialog";

const user = {
  id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  fullName: "Ana López",
  email: "ana@example.com",
};

const approvedExample = {
  id: "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10",
  status: "approved",
  status_detail: "accredited",
  transaction_amount: 15000,
  date_created: "2026-09-28T17:04:05.123Z",
  authorization_code: "482915",
  reference: "5f1c3a8e-2d4b-4c6e-8f9a-1b2c3d4e5f60",
  payer_id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  payer_email: "ana@example.com",
  card: {
    card_number: "1234123412341234",
    expiration_date: "12/26",
    security_code: "543",
    cardholder_name: "Ana López",
  },
};

type Handler = (input: string, init: RequestInit) => Promise<Response>;

const keyOf = (init: RequestInit) =>
  (init.headers as Record<string, string>)["X-Idempotency-Key"] ?? "";

function stubFetch(handler: Handler) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const chargeCalls = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.filter(([input]) => input === "/api/snailpay/charges");

beforeEach(() => {
  setBackend(createMemoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderDialog() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TopUpDialog user={user} />
      <Toaster />
    </QueryClientProvider>,
  );
}

async function open(ue: ReturnType<typeof userEvent.setup>) {
  await ue.click(screen.getByRole("button", { name: "Top up" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Amount (MXN)")).toHaveFocus(),
  );
}

async function pay(
  ue: ReturnType<typeof userEvent.setup>,
  cardNumber = "1234123412341234",
) {
  await ue.type(screen.getByLabelText("Amount (MXN)"), "150.00");
  await ue.type(screen.getByLabelText("Card number"), cardNumber);
  await ue.type(screen.getByLabelText("Expiry"), "1226");
  await ue.type(screen.getByLabelText("CVV"), "543");
  await ue.click(screen.getByRole("button", { name: "Top up $150.00" }));
}

test("shows every field error and sends no Charge", async () => {
  const fetchMock = stubFetch(() => new Promise<Response>(() => {}));
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  const cardNumber = screen.getByLabelText("Card number");
  await ue.type(cardNumber, "12341234123412");
  expect(cardNumber).toHaveValue("1234 1234 1234 12");
  const expiry = screen.getByLabelText("Expiry");
  await ue.type(expiry, "1326");
  expect(expiry).toHaveValue("13/26");
  const amount = screen.getByLabelText("Amount (MXN)");
  await ue.type(amount, "0");
  await ue.type(screen.getByLabelText("CVV"), "54");
  await ue.clear(screen.getByLabelText("Name on card"));
  await ue.click(screen.getByRole("button", { name: "Top up" }));
  expect(
    await screen.findByText("Enter an amount from $0.01 to $10,000.00."),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Enter the 16 digits of the card."),
  ).toBeInTheDocument();
  expect(screen.getByText("Use MM/YY.")).toBeInTheDocument();
  expect(screen.getByText("Enter 3 digits.")).toBeInTheDocument();
  expect(
    screen.getByText("Enter the name on the card (up to 100 characters)."),
  ).toBeInTheDocument();
  expect(amount).toHaveFocus();
  await ue.clear(amount);
  await ue.type(amount, "10.123");
  expect(
    screen.getByText("Enter an amount from $0.01 to $10,000.00."),
  ).toBeInTheDocument();
  expect(chargeCalls(fetchMock)).toHaveLength(0);
  expect(readLedger(user.id).topUps).toEqual([]);
});

test("disables submit while a Top-up is pending", async () => {
  const fetchMock = stubFetch(() => new Promise<Response>(() => {}));
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await pay(ue);
  expect(
    await screen.findByText("Processing your payment…"),
  ).toBeInTheDocument();
  const processing = screen.getByRole("button", { name: "Processing…" });
  expect(processing).toBeDisabled();
  await ue.click(processing);
  expect(chargeCalls(fetchMock)).toHaveLength(1);
  expect(screen.getByLabelText("CVV")).toHaveValue("•••");
  expect(screen.getByLabelText("Amount (MXN)")).toHaveAttribute("readonly");
  expect(readLedger(user.id).topUps.map((t) => t.outcome)).toEqual(["pending"]);

  await ue.click(screen.getByRole("button", { name: "Close" }));
  await open(ue);
  expect(screen.getByLabelText("Amount (MXN)")).toHaveValue("");
  expect(screen.getByLabelText("Name on card")).toHaveValue("Ana López");
  await ue.type(screen.getByLabelText("Amount (MXN)"), "150.00");
  await ue.type(screen.getByLabelText("Card number"), "1234123412341234");
  await ue.type(screen.getByLabelText("Expiry"), "1226");
  await ue.type(screen.getByLabelText("CVV"), "543");
  expect(screen.getByRole("button", { name: "Top up $150.00" })).toBeDisabled();
});

test("credits the Balance and announces an approved Top-up", async () => {
  const fetchMock = stubFetch((_input, init) =>
    Promise.resolve(
      Response.json(
        { ...approvedExample, reference: keyOf(init) },
        { status: 201 },
      ),
    ),
  );
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await pay(ue);
  expect(
    await screen.findByRole("heading", { name: "Payment approved" }),
  ).toBeInTheDocument();
  const [call] = chargeCalls(fetchMock);
  const init = call?.[1] as RequestInit;
  const key = keyOf(init);
  expect(screen.getByText("+$150.00")).toBeInTheDocument();
  expect(
    screen.getByText("Added to your balance. New balance: $150.00"),
  ).toBeInTheDocument();
  expect(screen.getByText("•••• 1234")).toBeInTheDocument();
  expect(screen.getByText("482915")).toBeInTheDocument();
  expect(
    screen.getByText(`${key.slice(0, 8)}…${key.slice(-4)}`),
  ).toBeInTheDocument();
  expect(await screen.findByText("Top-up approved")).toBeInTheDocument();
  expect(
    screen.getByText("+$150.00 added to your balance."),
  ).toBeInTheDocument();
  const ledger = readLedger(user.id);
  expect(ledger.balanceCents).toBe(15000);
  expect(ledger.topUps).toHaveLength(1);
  expect(ledger.topUps[0]).toMatchObject({ id: key, outcome: "credited" });
  expect(JSON.parse(init.body as string)).toEqual({
    card_number: "1234123412341234",
    expiration_date: "12/26",
    security_code: "543",
    cardholder_name: "Ana López",
    transaction_amount: 15000,
    payer_id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    payer_email: "ana@example.com",
  });
});

test("keeps the form filled after a decline", async () => {
  stubFetch((_input, init) =>
    Promise.resolve(
      Response.json(
        {
          ...approvedExample,
          status: "rejected",
          status_detail: "cc_rejected_insufficient_amount",
          authorization_code: null,
          card: { ...approvedExample.card, card_number: "1234123412340002" },
          reference: keyOf(init),
        },
        { status: 402 },
      ),
    ),
  );
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await pay(ue, "1234123412340002");
  const title = await screen.findByText("Top-up declined");
  expect(screen.getByText("Your balance did not change.")).toBeInTheDocument();
  const alert = title.closest("[role=alert]");
  expect(alert).toHaveFocus();
  expect(screen.getByLabelText("CVV")).toHaveValue("543");
  expect(screen.getByLabelText("Card number")).toHaveValue(
    "1234 1234 1234 0002",
  );
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  const ledger = readLedger(user.id);
  expect(ledger.balanceCents).toBe(0);
  expect(ledger.topUps).toHaveLength(1);
  expect(ledger.topUps[0]?.outcome).toBe("declined");
  expect(ledger.topUps[0]?.charge).toBeDefined();
});

test("leaves a timed-out Top-up Unknown", async () => {
  stubFetch(() =>
    Promise.reject(
      new DOMException("The operation timed out.", "TimeoutError"),
    ),
  );
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await pay(ue);
  expect(
    await screen.findByText("Payment not confirmed yet"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Your balance won't change until it's confirmed."),
  ).toBeInTheDocument();
  const [topUp, ...rest] = readLedger(user.id).topUps;
  expect(rest).toEqual([]);
  expect(topUp?.outcome).toBe("unknown");
  expect(topUp?.charge).toBeUndefined();
});

test("reports a storage write failure and sends no Charge", async () => {
  const storage = createMemoryStorage();
  storage.setItem = () => {
    throw new DOMException("full", "QuotaExceededError");
  };
  setBackend(storage);
  const fetchMock = stubFetch(() => new Promise<Response>(() => {}));
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await pay(ue);
  expect(
    await screen.findByText(
      "Couldn't save this top-up. Free up browser storage and try again.",
    ),
  ).toBeInTheDocument();
  expect(chargeCalls(fetchMock)).toHaveLength(0);
  expect(screen.getByLabelText("Card number")).toHaveValue(
    "1234 1234 1234 1234",
  );
});
