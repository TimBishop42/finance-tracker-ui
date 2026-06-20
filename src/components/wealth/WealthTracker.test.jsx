import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WealthTracker from "./WealthTracker";
import * as api from "../../services/finance-service";

jest.mock("../../services/finance-service");

// recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const SUMMARY = {
  displayCurrency: "AUD",
  netWorth: 50,
  totalAssets: 50,
  totalLiabilities: 0,
  deltaVsPrevious: null,
  deltaPct: null,
  fxRateUsdAud: null,
  fxMissing: false,
  holdings: [
    {
      securityId: 1,
      ticker: "VUG",
      name: "",
      exchange: "NASDAQ",
      currency: "AUD",
      quantity: 10,
      avgCost: 5,
      lastPrice: null,
      lastPriceDate: null,
      priceIsEstimated: true,
      marketValueNative: 50,
      unrealisedPlNative: 0,
      realisedPlNative: 0,
      marketValueDisplay: 50,
      unrealisedPlDisplay: 0,
      realisedPlDisplay: 0,
      unrealisedPlPct: 0,
    },
  ],
  items: [],
  allocation: [],
  snapshots: [],
  asOf: "2026-06-19",
};

const SECURITIES = [
  {
    id: 1,
    ticker: "VUG",
    name: "",
    exchange: "NASDAQ",
    currency: "AUD",
    priceSource: "MANUAL",
    priceSymbol: null,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  api.getWealthSummary.mockResolvedValue(SUMMARY);
  api.getSecurities.mockResolvedValue(SECURITIES);
  api.getTrades.mockResolvedValue([]);
  api.getSplits.mockResolvedValue([]);
  api.setSecurityPrice.mockResolvedValue({ id: 99 });
});

test("per-row inline price edit fires setSecurityPrice on blur", async () => {
  render(<WealthTracker />);

  // Holdings loaded.
  await screen.findByText("VUG");

  // Click the price cell to start inline editing (no dialog).
  fireEvent.click(screen.getByRole("button", { name: /set price VUG/i }));

  // An inline input appears; type a price and commit by blurring.
  const priceInput = await screen.findByLabelText(/set price VUG/i);
  fireEvent.change(priceInput, { target: { value: "8" } });
  fireEvent.blur(priceInput);

  // The actual service call (i.e. the network request) must fire.
  await waitFor(() =>
    expect(api.setSecurityPrice).toHaveBeenCalledWith(
      expect.objectContaining({ securityId: 1, price: 8 }),
    ),
  );
});

test("Escape cancels inline edit without calling setSecurityPrice", async () => {
  render(<WealthTracker />);
  await screen.findByText("VUG");
  fireEvent.click(screen.getByRole("button", { name: /set price VUG/i }));
  const priceInput = await screen.findByLabelText(/set price VUG/i);
  fireEvent.change(priceInput, { target: { value: "8" } });
  fireEvent.keyDown(priceInput, { key: "Escape" });
  fireEvent.blur(priceInput);
  await new Promise((r) => setTimeout(r, 50));
  expect(api.setSecurityPrice).not.toHaveBeenCalled();
});
