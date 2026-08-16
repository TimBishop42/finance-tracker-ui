import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import WealthTracker from "./WealthTracker";
import * as api from "../../services/finance-service";
import { addMonthsClamped } from "./vestingSchedule";

jest.mock("../../services/finance-service");

// Snapshot dates are relative to now: the timeframe filter is driven by the
// real clock, so hardcoded dates would quietly fall out of range over time.
const monthsAgo = (n) =>
  addMonthsClamped(new Date().toISOString().slice(0, 10), -n);

const snap = (date, breakdown) => ({
  asOfDate: date,
  totalAssets: 2350,
  totalLiabilities: 0,
  netWorth: 2350,
  breakdown,
});

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
  netWorth: 2350,
  totalAssets: 2350,
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
  items: [
    {
      id: 7,
      name: "Everyday account",
      assetClass: "CASH",
      kind: "ASSET",
      currency: "AUD",
      currentValueNative: 2000,
      valueDisplay: 2000,
      note: "",
    },
  ],
  options: [
    // 8 quarterly tranches of 1,000 units; 4 vested. $0.03/unit -> $30 a tranche.
    {
      id: 11,
      name: "2023 Grant",
      grantType: "OPTION",
      underlyingTicker: "ACME",
      currency: "AUD",
      strike: 2,
      quantity: 8000,
      vestedQuantity: 4000,
      unvestedQuantity: 4000,
      vestStartDate: "2024-09-01",
      vestIntervalMonths: 3,
      totalTranches: 8,
      vestedTranches: 4,
      nextVestDate: "2026-12-01",
      nextVestValueDisplay: 30,
      priceMissing: false,
      expired: false,
      vestedValueDisplay: 120,
      unvestedValueDisplay: 120,
    },
    // 4 quarterly tranches of 900 units; 1 vested. $0.20/unit -> $180 a tranche.
    {
      id: 12,
      name: "FY25 RSU",
      grantType: "RSU",
      underlyingTicker: "ACME",
      currency: "AUD",
      strike: 0,
      quantity: 3600,
      vestedQuantity: 900,
      unvestedQuantity: 2700,
      vestStartDate: "2026-06-01",
      vestIntervalMonths: 3,
      totalTranches: 4,
      vestedTranches: 1,
      nextVestDate: "2026-09-01",
      nextVestValueDisplay: 180,
      priceMissing: false,
      expired: false,
      vestedValueDisplay: 180,
      unvestedValueDisplay: 540,
    },
  ],
  unvestedOptionsValue: 660,
  allocation: [
    { assetClass: "SHARES", value: 50, pct: 2.13 },
    { assetClass: "OPTIONS", value: 300, pct: 12.77 },
    { assetClass: "CASH", value: 2000, pct: 85.11 },
  ],
  snapshots: [
    // The first predates per-category capture, so it has no breakdown.
    snap(monthsAgo(5), null),
    snap(monthsAgo(4), { SHARES: 40, OPTIONS: 200, CASH: 2000 }),
    snap(monthsAgo(3), { SHARES: 50, OPTIONS: 300, CASH: 2000 }),
  ],
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

test("clicking the Equity Comp legend opens a breakdown split by grant type", async () => {
  render(<WealthTracker />);
  await screen.findByText("VUG");

  fireEvent.click(await screen.findByRole("button", { name: /Equity Comp/i }));

  const dialog = await screen.findByRole("dialog");

  // Both grant types are listed, under their own sub-sections.
  expect(within(dialog).getByText("Options")).toBeInTheDocument();
  expect(within(dialog).getByText("RSU / equity")).toBeInTheDocument();
  expect(within(dialog).getByText("2023 Grant")).toBeInTheDocument();
  expect(within(dialog).getByText("FY25 RSU")).toBeInTheDocument();

  // Vested quantities, and a total matching the OPTIONS allocation slice.
  expect(within(dialog).getByText("4,000 / 8,000")).toBeInTheDocument();
  expect(within(dialog).getByText("900 / 3,600")).toBeInTheDocument();
  expect(within(dialog).getAllByText("$300").length).toBeGreaterThan(0);

  // Equity-comp-only header line: unvested memo and the soonest vest.
  expect(within(dialog).getByText(/Unvested \$660/)).toBeInTheDocument();
  expect(
    within(dialog).getByText(/next \$180 on 2026-09-01/),
  ).toBeInTheDocument();

  // Snapshots without a per-class breakdown are excluded, and said so.
  expect(
    within(dialog).getByText(
      /1 earlier snapshot predates per-category capture/,
    ),
  ).toBeInTheDocument();

  // No drift warning, because the rows reconcile to the slice.
  expect(within(dialog).queryByText(/but the allocation slice/i)).toBeNull();
});

test("a grant with a missing price is flagged rather than silently zeroed", async () => {
  api.getWealthSummary.mockResolvedValue({
    ...SUMMARY,
    options: [
      {
        ...SUMMARY.options[0],
        id: 13,
        name: "Unpriced Grant",
        priceMissing: true,
        vestedValueDisplay: 0,
        unvestedValueDisplay: 0,
      },
    ],
    allocation: [{ assetClass: "OPTIONS", value: 0, pct: 0 }],
  });
  render(<WealthTracker />);
  await screen.findByText("VUG");

  fireEvent.click(await screen.findByRole("button", { name: /Equity Comp/i }));
  const dialog = await screen.findByRole("dialog");

  expect(within(dialog).getByText("Unpriced Grant")).toBeInTheDocument();
  expect(within(dialog).getByText("no price")).toBeInTheDocument();
  // It contributes nothing, so it is left off the timeline — and said so.
  expect(
    within(dialog).getByText(/worth nothing today \(expired or unpriced\)/i),
  ).toBeInTheDocument();
});

test("row totals that disagree with the allocation slice raise a warning", async () => {
  api.getWealthSummary.mockResolvedValue({
    ...SUMMARY,
    // Slice claims more than the grants account for.
    allocation: [{ assetClass: "OPTIONS", value: 999, pct: 42 }],
  });
  render(<WealthTracker />);
  await screen.findByText("VUG");

  fireEvent.click(await screen.findByRole("button", { name: /Equity Comp/i }));
  const dialog = await screen.findByRole("dialog");

  expect(
    within(dialog).getByText(/but the allocation slice reports/i),
  ).toBeInTheDocument();
});

test("drilling into a plain asset class lists its wealth items", async () => {
  render(<WealthTracker />);
  await screen.findByText("VUG");

  fireEvent.click(
    await screen.findByRole("button", { name: /Cash & Savings/i }),
  );

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Everyday account")).toBeInTheDocument();
  expect(within(dialog).getAllByText("$2,000").length).toBeGreaterThan(0);
});

test("net worth chart defaults to 1Y and says when it is hiding history", async () => {
  api.getWealthSummary.mockResolvedValue({
    ...SUMMARY,
    // One point outside 1Y, two inside.
    snapshots: [snap(monthsAgo(40)), snap(monthsAgo(4)), snap(monthsAgo(2))],
  });
  render(<WealthTracker />);
  await screen.findByText("VUG");

  expect(screen.getByRole("button", { name: "1Y" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    await screen.findByText(/Showing 2 of 3 snapshots/),
  ).toBeInTheDocument();

  // Widening to Max brings the older point back and drops the notice.
  fireEvent.click(screen.getByRole("button", { name: "Max" }));
  await waitFor(() =>
    expect(screen.queryByText(/Showing 2 of 3 snapshots/)).toBeNull(),
  );
});

test("timeframes without enough history are disabled, and Max is auto-selected", async () => {
  api.getWealthSummary.mockResolvedValue({
    ...SUMMARY,
    // Only one point inside a year, so 6M and 1Y can't draw a line.
    snapshots: [snap(monthsAgo(40)), snap(monthsAgo(30)), snap(monthsAgo(1))],
  });
  render(<WealthTracker />);
  await screen.findByText("VUG");

  expect(screen.getByRole("button", { name: "6M" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "1Y" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "5Y" })).toBeEnabled();

  // Rather than open on an empty 1Y chart, it falls back to the full history.
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Max" })).toHaveAttribute(
      "aria-pressed",
      "true",
    ),
  );
});

test("allocation renders as a composition bar with values and shares", async () => {
  render(<WealthTracker />);
  await screen.findByText("VUG");

  // Each category is a labelled, clickable entry carrying its own numbers —
  // and a share reads as "85.1%", never "+85.1%".
  const cash = screen.getByRole("button", { name: /Cash & Savings/ });
  expect(cash).toHaveTextContent("$2,000");
  expect(cash).toHaveTextContent("85.1%");
  expect(cash).not.toHaveTextContent("+85.1%");

  fireEvent.click(cash);
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
});

test("allocation over time renders with a value/share toggle", async () => {
  render(<WealthTracker />);
  await screen.findByText("VUG");

  expect(await screen.findByText("Allocation over time")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Value" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  fireEvent.click(screen.getByRole("button", { name: "Share %" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Share %" })).toHaveAttribute(
      "aria-pressed",
      "true",
    ),
  );

  // The snapshot with no breakdown can't be charted, and says so.
  expect(
    screen.getByText(/1 snapshot in this timeframe predates per-category/),
  ).toBeInTheDocument();
});

test("says how much history exists when a timeframe hides nothing", async () => {
  render(<WealthTracker />);
  await screen.findByText("VUG");

  // All three fixture snapshots are recent, so every range shows the same
  // thing — the caption explains that rather than leaving it a mystery.
  expect(
    await screen.findByText(/3 snapshots, all of your history/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Wider timeframes will look identical/),
  ).toBeInTheDocument();
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
