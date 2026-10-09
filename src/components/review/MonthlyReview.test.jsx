import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import MonthlyReview from "./MonthlyReview";
import { buildSlides, importedUpTo } from "./reviewSlides";
import * as api from "../../services/finance-service";

jest.mock("../../services/finance-service");

const REVIEW = {
  month: "2026-09",
  dataThrough: "2026-10-03",
  totals: {
    spend: 300, income: 5000, net: 4700, savingsRatePercent: 94, spendTarget: 12000,
    lastMonthSpend: 250, lastMonthIncome: 4000, averageSpend: 316.67, averageIncome: 1333.33, averageMonths: 3,
  },
  history: [
    { month: "2026-08", spend: 250, income: 4000 },
    { month: "2026-09", spend: 300, income: 5000 },
  ],
  categories: [
    { category: "Groceries", spend: 200, budget: 180, lastMonth: 100, average: 100, trend: "UP", history: [100, 200] },
    { category: "Dining", spend: 100, budget: null, lastMonth: 150, average: 216.67, trend: "DOWN", history: [150, 100] },
  ],
  topMerchants: [{ merchant: "Woolworths", amount: 150, count: 1 }],
  newMerchants: [{ merchant: "New Cafe", amount: 50, count: 1 }],
  biggestTransactions: [{ date: "2026-09-05", merchant: "WOOLWORTHS", category: "Groceries", amount: 150 }],
  subscriptionChanges: { started: [], priceChanges: [], trialsEnded: [] },
  cumulative: { thisMonth: [0, 100, 300], lastMonth: [0, 250] },
  wealth: {
    opening: { asOf: "2026-09-01", netWorth: 1000, totalAssets: 1000, totalLiabilities: 0, breakdown: { SHARES: 500 } },
    closing: { asOf: "2026-10-01", netWorth: 1300, totalAssets: 1300, totalLiabilities: 0, breakdown: { SHARES: 700 } },
    netWorthChange: 300,
    netWorthChangePercent: 30,
    waterfall: { opening: 1000, savings: 20, investmentGrowth: 50, equityComp: 0, other: 230, closing: 1300 },
    allocation: [{ assetClass: "SHARES", opening: 500, closing: 700, change: 200 }],
    holdings: [{ ticker: "VAS", name: "Vanguard", value: 700, gain: 50, returnPercent: 7.7, priceEstimated: false }],
    trend: [{ month: "2026-09", value: 1300, breakdown: { SHARES: 700 } }],
    kids: [
      { owner: "CHLOE", openingValue: 40, closingValue: 55, contributions: 10, growth: 5, holdings: [], trend: [] },
      { owner: "MILLIE", openingValue: 0, closingValue: 0, contributions: 0, growth: 0, holdings: [], trend: [] },
    ],
    fxMissing: false,
  },
};

describe("buildSlides", () => {
  it("leaves out slides with nothing to show", () => {
    const ids = buildSlides(REVIEW).map((s) => s.id);

    expect(ids).toContain("waterfall");
    expect(ids).toContain("kid-CHLOE");
    expect(ids).not.toContain("subscriptions"); // no changes this month
    expect(ids).not.toContain("kid-MILLIE"); // empty portfolio
    expect(ids[0]).toBe("intro");
    expect(ids[ids.length - 1]).toBe("outro");
  });

  it("skips every wealth slide when there is no wealth data", () => {
    const ids = buildSlides({ ...REVIEW, wealth: { ...REVIEW.wealth, closing: null, waterfall: null, allocation: [], holdings: [], kids: [] } })
      .map((s) => s.id);

    expect(ids).not.toContain("networth");
    expect(ids).not.toContain("waterfall");
  });
});

describe("importedUpTo", () => {
  it("flags a month whose transactions stop before its last day", () => {
    expect(importedUpTo({ month: "2026-09", dataThrough: "2026-09-24" })).toBe("2026-09-24");
    expect(importedUpTo({ month: "2026-09", dataThrough: "2026-09-30" })).toBeNull();
    expect(importedUpTo({ month: "2026-02", dataThrough: "2026-02-28" })).toBeNull();
  });
});

describe("MonthlyReview", () => {
  beforeEach(() => api.getMonthlyReview.mockResolvedValue(REVIEW));

  it("opens on last month and lists the overview sections", async () => {
    render(<MonthlyReview />);

    expect(await screen.findByText("Spend by category")).toBeInTheDocument();
    expect(screen.getByText("What moved net worth")).toBeInTheDocument();
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    expect(api.getMonthlyReview).toHaveBeenCalledWith(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  });

  it("drops the previous month's review when the next one fails to load", async () => {
    render(<MonthlyReview />);
    await screen.findByText("Spend by category");
    api.getMonthlyReview.mockRejectedValueOnce(new Error("offline"));

    fireEvent.click(screen.getByRole("button", { name: /previous month/i }));

    expect(await screen.findByText(/couldn't load the review: offline/i)).toBeInTheDocument();
    expect(screen.queryByText("Spend by category")).not.toBeInTheDocument();
  });

  it("ignores held-down and modified arrow keys", async () => {
    render(<MonthlyReview />);
    fireEvent.click(await screen.findByRole("button", { name: /play the/i }));
    const dialog = screen.getByRole("dialog");

    fireEvent.keyDown(window, { key: "ArrowRight", repeat: true });
    fireEvent.keyDown(window, { key: "ArrowRight", altKey: true });
    expect(within(dialog).getByText("Your month in review")).toBeInTheDocument();
  });

  it("steps through the walkthrough with the keyboard and closes on Done", async () => {
    render(<MonthlyReview />);
    fireEvent.click(await screen.findByRole("button", { name: /play the/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Your month in review")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(within(dialog).getByText("You spent")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(within(dialog).getByText("Your month in review")).toBeInTheDocument();

    const total = buildSlides(REVIEW).length;
    for (let i = 1; i < total; i++) fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.click(within(dialog).getByRole("button", { name: /done/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
