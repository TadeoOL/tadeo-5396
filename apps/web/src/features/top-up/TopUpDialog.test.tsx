import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { setBackend } from "@/storage/backend";
import { readLedger, settleTopUp } from "@/storage/ledger";
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

const healthy: Handler = () => Promise.resolve(Response.json({ status: "ok" }));

function stubFetch(handler: Handler, health: Handler = healthy) {
  const fetchMock = vi.fn((input: string, init: RequestInit) =>
    input === "/api/health" ? health(input, init) : handler(input, init),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const healthCalls = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.filter(([input]) => input === "/api/health");

const chargeCalls = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.filter(([input]) => input === "/api/snailpay/charges");

beforeEach(() => {
  setBackend(createMemoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderDialog(client = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
      <TopUpDialog user={user} />
      <Toaster />
    </QueryClientProvider>,
  );
}

async function open(ue: ReturnType<typeof userEvent.setup>) {
  await ue.click(screen.getByRole("button", { name: "Recargar" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Monto (MXN)")).toHaveFocus(),
  );
}

async function fill(
  ue: ReturnType<typeof userEvent.setup>,
  cardNumber = "1234123412341234",
) {
  await ue.type(screen.getByLabelText("Monto (MXN)"), "150.00");
  await ue.type(screen.getByLabelText("Número de tarjeta"), cardNumber);
  await ue.type(screen.getByLabelText("Vencimiento"), "1226");
  await ue.type(screen.getByLabelText("CVV"), "543");
}

async function pay(
  ue: ReturnType<typeof userEvent.setup>,
  cardNumber = "1234123412341234",
) {
  await fill(ue, cardNumber);
  const button = screen.getByRole("button", { name: "Recargar $150.00" });
  await waitFor(() => expect(button).toBeEnabled());
  await ue.click(button);
}

test("shows every field error and sends no Charge", async () => {
  const fetchMock = stubFetch(() => new Promise<Response>(() => {}));
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  const cardNumber = screen.getByLabelText("Número de tarjeta");
  await ue.type(cardNumber, "12341234123412");
  expect(cardNumber).toHaveValue("1234 1234 1234 12");
  const expiry = screen.getByLabelText("Vencimiento");
  await ue.type(expiry, "1326");
  expect(expiry).toHaveValue("13/26");
  const amount = screen.getByLabelText("Monto (MXN)");
  await ue.type(amount, "0");
  await ue.type(screen.getByLabelText("CVV"), "54");
  await ue.clear(screen.getByLabelText("Nombre en la tarjeta"));
  await ue.click(screen.getByRole("button", { name: "Recargar" }));
  expect(
    await screen.findByText("Ingresa un monto de $0.01 a $10,000.00."),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Ingresa los 16 dígitos de la tarjeta."),
  ).toBeInTheDocument();
  expect(screen.getByText("Usa MM/AA.")).toBeInTheDocument();
  expect(screen.getByText("Ingresa 3 dígitos.")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Ingresa el nombre que aparece en la tarjeta (hasta 100 caracteres).",
    ),
  ).toBeInTheDocument();
  expect(amount).toHaveFocus();
  await ue.clear(amount);
  await ue.type(amount, "10.123");
  expect(
    screen.getByText("Ingresa un monto de $0.01 a $10,000.00."),
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
  expect(await screen.findByText("Procesando tu pago…")).toBeInTheDocument();
  const processing = screen.getByRole("button", { name: "Procesando…" });
  expect(processing).toBeDisabled();
  await ue.click(processing);
  expect(chargeCalls(fetchMock)).toHaveLength(1);
  expect(screen.getByLabelText("CVV")).toHaveValue("•••");
  expect(screen.getByLabelText("Monto (MXN)")).toHaveAttribute("readonly");
  expect(readLedger(user.id).topUps.map((t) => t.outcome)).toEqual(["pending"]);

  await ue.click(screen.getByRole("button", { name: "Cerrar" }));
  await open(ue);
  expect(screen.getByLabelText("Monto (MXN)")).toHaveValue("");
  expect(screen.getByLabelText("Nombre en la tarjeta")).toHaveValue(
    "Ana López",
  );
  await ue.type(screen.getByLabelText("Monto (MXN)"), "150.00");
  await ue.type(screen.getByLabelText("Número de tarjeta"), "1234123412341234");
  await ue.type(screen.getByLabelText("Vencimiento"), "1226");
  await ue.type(screen.getByLabelText("CVV"), "543");
  expect(
    screen.getByRole("button", { name: "Recargar $150.00" }),
  ).toBeDisabled();
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
    await screen.findByRole("heading", { name: "Pago aprobado" }),
  ).toBeInTheDocument();
  const [call] = chargeCalls(fetchMock);
  const init = call?.[1] as RequestInit;
  const key = keyOf(init);
  expect(screen.getByText("+$150.00")).toBeInTheDocument();
  expect(
    screen.getByText("Se agregó a tu saldo. Nuevo saldo: $150.00"),
  ).toBeInTheDocument();
  expect(screen.getByText("•••• 1234")).toBeInTheDocument();
  expect(screen.getByText("482915")).toBeInTheDocument();
  expect(
    screen.getByText(`${key.slice(0, 8)}…${key.slice(-4)}`),
  ).toBeInTheDocument();
  expect(await screen.findByText("Recarga aprobada")).toBeInTheDocument();
  expect(
    screen.getByText("+$150.00 agregados a tu saldo."),
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
  const title = await screen.findByText("Rechazada: fondos insuficientes");
  expect(
    screen.getByText(
      "Tu saldo no cambió. La tarjeta no tiene fondos suficientes. Prueba con un monto menor o con otra tarjeta.",
    ),
  ).toBeInTheDocument();
  const alert = title.closest("[role=alert]");
  expect(alert).toHaveFocus();
  expect(screen.getByLabelText("CVV")).toHaveValue("543");
  expect(screen.getByLabelText("Número de tarjeta")).toHaveValue(
    "1234 1234 1234 0002",
  );
  expect(
    screen.getByRole("button", { name: "Intentar de nuevo" }),
  ).toBeEnabled();
  const ledger = readLedger(user.id);
  expect(ledger.balanceCents).toBe(0);
  expect(ledger.topUps).toHaveLength(1);
  expect(ledger.topUps[0]?.outcome).toBe("declined");
  expect(ledger.topUps[0]?.charge).toBeDefined();
});

test("shows the Confirming panel when SnailPay doesn't answer in time", async () => {
  stubFetch((input) =>
    input === "/api/snailpay/charges"
      ? Promise.reject(
          new DOMException("The operation timed out.", "TimeoutError"),
        )
      : new Promise<Response>(() => {}),
  );
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await pay(ue);
  expect(
    await screen.findByRole("heading", { name: "Confirmando tu pago" }),
  ).toBeInTheDocument();
  expect(screen.getByText("$150.00")).toBeInTheDocument();
  expect(
    screen.getByText(
      "SnailPay no respondió a tiempo, así que estamos verificando si el pago se realizó. Tu saldo no cambiará hasta que se confirme.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("Verificando… (intento 1 de 5)")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Cerrar y seguir verificando" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Pago aún sin confirmar")).toBeInTheDocument();
  expect(
    screen.getByText("$150.00 · Estamos verificando con SnailPay."),
  ).toBeInTheDocument();
  const [topUp, ...rest] = readLedger(user.id).topUps;
  expect(rest).toEqual([]);
  expect(topUp?.outcome).toBe("unknown");
});

test("sends the Charge while the browser is offline and leaves the Top-up Unknown", async () => {
  const fetchMock = stubFetch((input) =>
    input === "/api/snailpay/charges"
      ? Promise.reject(new TypeError("Failed to fetch"))
      : new Promise<Response>(() => {}),
  );
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await fill(ue);
  const button = screen.getByRole("button", { name: "Recargar $150.00" });
  await waitFor(() => expect(button).toBeEnabled());
  onlineManager.setOnline(false);
  try {
    await ue.click(button);
    expect(
      await screen.findByRole("heading", { name: "Confirmando tu pago" }),
    ).toBeInTheDocument();
    expect(chargeCalls(fetchMock)).toHaveLength(1);
    expect(readLedger(user.id).topUps.map((t) => t.outcome)).toEqual([
      "unknown",
    ]);
  } finally {
    onlineManager.setOnline(true);
  }
});

test("announces only an outcome this tab settled", async () => {
  stubFetch((input, init) => {
    if (input !== "/api/snailpay/charges")
      return new Promise<Response>(() => {});
    // Another tab's Reconciliation credits the Top-up before this POST times out.
    settleTopUp(user.id, keyOf(init), "credited", {
      ...approvedExample,
      status: "approved",
      status_detail: "accredited",
      reference: keyOf(init),
    });
    return Promise.reject(
      new DOMException("The operation timed out.", "TimeoutError"),
    );
  });
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  // Sonner keeps earlier tests' toasts, so count instead of asserting absence.
  const warnings = () => screen.queryAllByText("Pago aún sin confirmar");
  const before = warnings().length;
  await pay(ue);
  expect(
    await screen.findByRole("heading", { name: "Pago aprobado" }),
  ).toBeInTheDocument();
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(warnings()).toHaveLength(before);
  expect(readLedger(user.id).topUps.map((t) => t.outcome)).toEqual([
    "credited",
  ]);
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
      "No se pudo guardar esta recarga. Libera espacio de almacenamiento del navegador e intenta de nuevo.",
    ),
  ).toBeInTheDocument();
  expect(chargeCalls(fetchMock)).toHaveLength(0);
  expect(screen.getByLabelText("Número de tarjeta")).toHaveValue(
    "1234 1234 1234 1234",
  );
});

test("keeps submit disabled while the server is waking", async () => {
  stubFetch(healthy, () => new Promise<Response>(() => {}));
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  expect(screen.getByText("Despertando el servidor.")).toBeInTheDocument();
  expect(
    screen.getByText("Esto puede tardar hasta un minuto."),
  ).toBeInTheDocument();
  await fill(ue);
  expect(
    screen.getByRole("button", { name: "Recargar $150.00" }),
  ).toBeDisabled();
});

test("offers Try again when the server can't be reached", async () => {
  let reachable = false;
  stubFetch(healthy, (input, init) =>
    reachable
      ? healthy(input, init)
      : Promise.reject(new TypeError("Failed to fetch")),
  );
  const ue = userEvent.setup();
  renderDialog(
    new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } }),
  );
  await open(ue);
  expect(
    await screen.findByText("No se puede conectar con el servidor."),
  ).toBeInTheDocument();
  expect(screen.getByText("Revisa tu conexión.")).toBeInTheDocument();
  await fill(ue);
  const submit = screen.getByRole("button", { name: "Recargar $150.00" });
  expect(submit).toBeDisabled();

  reachable = true;
  await ue.click(screen.getByRole("button", { name: "Intentar de nuevo" }));
  await waitFor(() => expect(submit).toBeEnabled());
  expect(
    screen.queryByText("No se puede conectar con el servidor."),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("Despertando el servidor."),
  ).not.toBeInTheDocument();
});

test("checks the server again each time the dialog opens", async () => {
  const fetchMock = stubFetch(healthy);
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await waitFor(() =>
    expect(
      screen.queryByText("Despertando el servidor."),
    ).not.toBeInTheDocument(),
  );
  const first = healthCalls(fetchMock).length;
  await ue.click(screen.getByRole("button", { name: "Cancelar" }));
  await open(ue);
  await waitFor(() => expect(healthCalls(fetchMock)).toHaveLength(first + 1));
  await ue.click(screen.getByRole("button", { name: "Cancelar" }));
  await open(ue);
  await waitFor(() => expect(healthCalls(fetchMock)).toHaveLength(first + 2));
});

function declineWith(status_detail: string, card_number = "1234123412340002") {
  return stubFetch((_input, init) =>
    Promise.resolve(
      Response.json(
        {
          ...approvedExample,
          status: "rejected",
          status_detail,
          authorization_code: null,
          card: { ...approvedExample.card, card_number, security_code: null },
          reference: keyOf(init),
        },
        { status: 402 },
      ),
    ),
  );
}

test("names a card-number decline and marks the field", async () => {
  declineWith("cc_rejected_bad_filled_card_number", "111122******4444");
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await pay(ue, "1111222233334444");
  expect(
    await screen.findByText("Rechazada: tarjeta no reconocida"),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Tu saldo no cambió. Revisa el número de tarjeta e intenta de nuevo.",
    ),
  ).toBeInTheDocument();
  const cardNumber = screen.getByLabelText("Número de tarjeta");
  await waitFor(() =>
    expect(cardNumber).toHaveAttribute("aria-invalid", "true"),
  );
  expect(screen.getByText("No coincide con esta tarjeta.")).toBeInTheDocument();
  const declined = await screen.findByText("$150.00 · Tarjeta no reconocida");
  expect(declined.closest("[data-sonner-toast]")).toHaveTextContent(
    "Recarga rechazada",
  );
  await ue.type(cardNumber, "{backspace}5");
  await waitFor(() =>
    expect(
      screen.queryByText("No coincide con esta tarjeta."),
    ).not.toBeInTheDocument(),
  );
});

test("marks the expiry and the CVV for their declines", async () => {
  for (const [detail, title, label] of [
    [
      "cc_rejected_bad_filled_date",
      "Rechazada: fecha de vencimiento incorrecta",
      "Vencimiento",
    ],
    [
      "cc_rejected_bad_filled_security_code",
      "Rechazada: código de seguridad incorrecto",
      "CVV",
    ],
  ] as const) {
    declineWith(detail, "1234123412341234");
    const ue = userEvent.setup();
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient()}>
        <TopUpDialog user={user} />
      </QueryClientProvider>,
    );
    await open(ue);
    await pay(ue);
    expect(await screen.findByText(title)).toBeInTheDocument();
    const field = screen.getByLabelText(label);
    await waitFor(() => expect(field).toHaveAttribute("aria-invalid", "true"));
    expect(
      screen.getByText("No coincide con esta tarjeta."),
    ).toBeInTheDocument();
    unmount();
  }
});

test("shows insufficient funds without marking a field", async () => {
  declineWith("cc_rejected_insufficient_amount");
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await pay(ue, "1234123412340002");
  expect(
    await screen.findByText("Rechazada: fondos insuficientes"),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Tu saldo no cambió. La tarjeta no tiene fondos suficientes. Prueba con un monto menor o con otra tarjeta.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("No coincide con esta tarjeta."),
  ).not.toBeInTheDocument();
});

test("names SnailPay's outage on a Failed Top-up", async () => {
  stubFetch((_input, init) =>
    Promise.resolve(
      Response.json(
        {
          id: null,
          status: "error",
          status_detail: "service_unavailable",
          transaction_amount: 15000,
          date_created: null,
          authorization_code: null,
          reference: keyOf(init),
          payer_id: user.id,
          payer_email: user.email,
          card: {
            card_number: "1234123412341234",
            expiration_date: "12/26",
            security_code: null,
            cardholder_name: "Ana López",
          },
        },
        { status: 503 },
      ),
    ),
  );
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await pay(ue);
  expect(
    await screen.findByText("SnailPay no está disponible"),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "No se cobró nada y tu saldo no cambió. Intenta de nuevo en unos momentos.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Intentar de nuevo" }),
  ).toBeInTheDocument();
  const failed = await screen.findByText(
    "$150.00 · SnailPay no estaba disponible",
  );
  expect(failed.closest("[data-sonner-toast]")).toHaveTextContent(
    "Recarga fallida",
  );
  const ledger = readLedger(user.id);
  expect(ledger.balanceCents).toBe(0);
  expect(ledger.topUps).toHaveLength(1);
  expect(ledger.topUps[0]?.outcome).toBe("failed");
  expect(ledger.topUps[0]?.charge?.status_detail).toBe("service_unavailable");
});

test("Try again sends a new Top-up with a new key", async () => {
  const fetchMock = declineWith("cc_rejected_insufficient_amount");
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  await pay(ue, "1234123412340002");
  const again = await screen.findByRole("button", {
    name: "Intentar de nuevo",
  });
  await waitFor(() => expect(again).toBeEnabled());
  await ue.click(again);
  await waitFor(() => expect(chargeCalls(fetchMock)).toHaveLength(2));
  const [first, second] = chargeCalls(fetchMock).map(([, init]) => keyOf(init));
  expect(first).not.toBe(second);
  await waitFor(() =>
    expect(readLedger(user.id).topUps.map((t) => t.outcome)).toEqual([
      "declined",
      "declined",
    ]),
  );
});

test("lists the four test cards", async () => {
  stubFetch(healthy);
  const ue = userEvent.setup();
  renderDialog();
  await open(ue);
  for (const text of [
    "Todas usan vencimiento 12/26 y CVV 543.",
    "1234 1234 1234 1234 · Aprobada",
    "1234 1234 1234 0002 · Rechazada: fondos insuficientes",
    "1234 1234 1234 0003 · Rechazada: seguridad",
    "1234 1234 1234 0004 · Sin respuesta a tiempo (tiempo agotado)",
  ])
    expect(screen.getByText(text)).toBeInTheDocument();
});
