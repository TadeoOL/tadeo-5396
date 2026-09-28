import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { SimulationControls } from "./SimulationControls";

function stubFetch(put: (init: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn((_input: string, init: RequestInit) =>
    init.method === "PUT"
      ? put(init)
      : Promise.resolve(Response.json({ active: false })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderControls() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SimulationControls />
    </QueryClientProvider>,
  );
}

test("reads the Outage and turns it on", async () => {
  const fetchMock = stubFetch((init) =>
    Promise.resolve(Response.json(JSON.parse(init.body as string))),
  );
  const ue = userEvent.setup();
  renderControls();
  const off = screen.getByRole("switch", { name: "SnailPay outage: off" });
  await waitFor(() => expect(off).toBeEnabled());
  await ue.click(off);
  const on = await screen.findByRole("switch", { name: "SnailPay outage: on" });
  expect(on).toBeChecked();
  const put = fetchMock.mock.calls.find(([, init]) => init.method === "PUT");
  expect(put?.[0]).toBe("/api/snailpay/outage");
  expect(put?.[1].body).toBe('{"active":true}');
});

test("keeps the last value when SnailPay can't be reached", async () => {
  stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
  const ue = userEvent.setup();
  renderControls();
  const off = screen.getByRole("switch", { name: "SnailPay outage: off" });
  await waitFor(() => expect(off).toBeEnabled());
  await ue.click(off);
  expect(
    await screen.findByText("Couldn't reach SnailPay. Try again."),
  ).toBeInTheDocument();
  const still = screen.getByRole("switch", { name: "SnailPay outage: off" });
  expect(still).not.toBeChecked();
});
