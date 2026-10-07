import type { Currency, RouteChoice } from "./types";

/**
 * Indicative units of currency per 1 USD. Used for planning only.
 * In sandbox mode the real rate comes from the Airwallex transfer quote.
 */
export const RATE_PER_USD: Record<Currency, number> = {
  USD: 1,
  NGN: 1530,
  KES: 129,
  GBP: 0.79,
  EUR: 0.92,
  INR: 84.2,
  PHP: 57.4,
  BRL: 5.42,
};

export const SYMBOL: Record<Currency, string> = {
  USD: "$",
  NGN: "₦",
  KES: "KSh ",
  GBP: "£",
  EUR: "€",
  INR: "₹",
  PHP: "₱",
  BRL: "R$",
};

export function toUsd(amount: number, currency: Currency): number {
  return amount / RATE_PER_USD[currency];
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function fmt(amount: number, currency: Currency): string {
  const s = Math.round(amount).toLocaleString("en-US");
  return `${SYMBOL[currency]}${s}`;
}

export function fmtUsd(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * Estimated route costs. Placeholder figures for planning; Airwallex returns
 * the actual fee on the transfer. The optimiser picks the cheapest route the
 * beneficiary supports.
 */
const LOCAL_FEE_USD: Partial<Record<Currency, number>> = {
  NGN: 1.5,
  KES: 1.5,
  GBP: 0.5,
  EUR: 0.5,
  INR: 1,
  PHP: 1,
  BRL: 1.5,
  USD: 0.5,
};
const SWIFT_FEE_USD = 15;
const SWIFT_SPREAD = 0.004;

export function chooseRoute(currency: Currency, amountUsd: number, localRail: boolean): RouteChoice {
  const rate = RATE_PER_USD[currency];
  const local = LOCAL_FEE_USD[currency];
  if (localRail && local !== undefined) {
    return { kind: "LOCAL", feeUsd: local, etaDays: "0-1 days", rateToUsd: rate };
  }
  return {
    kind: "SWIFT",
    feeUsd: round2(SWIFT_FEE_USD + amountUsd * SWIFT_SPREAD),
    etaDays: "1-3 days",
    rateToUsd: rate,
  };
}

/** What SWIFT would have cost, for showing the saving of a local route. */
export function swiftCost(amountUsd: number): number {
  return round2(SWIFT_FEE_USD + amountUsd * SWIFT_SPREAD);
}
