import type { Currency, Order, OrderStatus, PayoutLine, Policy, Seller } from "./types";

/**
 * Demo data for Kora Market, a fictional cross-border marketplace.
 * All people and shops are invented.
 */

export const RUN_NOW = "2026-10-16T09:00:00.000Z";
export const RUN_ID = "wk42";
export const RUN_LABEL = "Week 42 seller payouts";

export const DEFAULT_POLICY: Policy = {
  returnWindowDays: 14,
  disputeReservePct: 100,
  bankChangeCoolingHours: 72,
  autonomousLimitUsd: 10000,
  balanceFloorUsd: 25000,
  duplicateWindowDays: 7,
};

export const OPENING_BALANCE_USD = 168000;

const DAY = 24 * 3600 * 1000;
const iso = (daysAgo: number) => new Date(Date.parse(RUN_NOW) - daysAgo * DAY).toISOString();

type OrderSpec = [item: string, amount: number, daysAgo: number, status?: OrderStatus];

interface SellerSpec {
  id: string;
  name: string;
  shop: string;
  country: string;
  countryCode: string;
  currency: Currency;
  refundRate: number;
  bank: string;
  account: string;
  localRail?: boolean;
  valid?: boolean;
  validationNote?: string;
  changedDaysAgo?: number;
  orders: OrderSpec[];
}

const SPECS: SellerSpec[] = [
  {
    id: "s-ada", name: "Adaeze Okafor", shop: "Ada's Ankara House", country: "Lagos, Nigeria", countryCode: "NG",
    currency: "NGN", refundRate: 0.04, bank: "Access Bank", account: "•••• 4471",
    orders: [["Ankara wrap dress ×6", 1_860_000, 19], ["Adire two-piece ×4", 1_420_000, 22], ["Kaftan set ×5", 2_310_000, 25]],
  },
  {
    id: "s-tunde", name: "Tunde Bakare", shop: "Bakare Leatherworks", country: "Ibadan, Nigeria", countryCode: "NG",
    currency: "NGN", refundRate: 0.09, bank: "GTBank", account: "•••• 0918",
    orders: [["Leather tote ×8", 2_640_000, 20], ["Weekender bag ×3", 1_950_000, 6], ["Card holder ×20", 980_000, 4]],
  },
  {
    id: "s-chidi", name: "Chidi Nwosu", shop: "Nwosu Gadgets", country: "Enugu, Nigeria", countryCode: "NG",
    currency: "NGN", refundRate: 0.05, bank: "Zenith Bank", account: "•••• 2290",
    orders: [["Power bank 20k mAh ×30", 3_150_000, 18], ["Earbuds ×25", 2_410_000, 21]],
  },
  {
    id: "s-wanjiru", name: "Wanjiru Kamau", shop: "Nairobi Loom", country: "Nairobi, Kenya", countryCode: "KE",
    currency: "KES", refundRate: 0.03, bank: "Equity Bank", account: "•••• 6620",
    orders: [["Kikoy throw ×14", 238_000, 17], ["Woven basket ×20", 196_000, 23]],
  },
  {
    id: "s-brian", name: "Brian Otieno", shop: "Otieno Audio", country: "Mombasa, Kenya", countryCode: "KE",
    currency: "KES", refundRate: 0.07, bank: "KCB", account: "•••• 3105", changedDaysAgo: 0.8,
    orders: [["Bluetooth speaker ×12", 412_000, 16], ["Turntable ×2", 188_000, 24]],
  },
  {
    id: "s-priya", name: "Priya Raman", shop: "Raman Silks", country: "Chennai, India", countryCode: "IN",
    currency: "INR", refundRate: 0.05, bank: "HDFC Bank", account: "•••• 8812",
    orders: [["Kanjivaram saree ×3", 186_000, 8, "REFUND_REQUESTED"], ["Silk stole ×10", 142_000, 19], ["Saree ×4", 248_000, 9]],
  },
  {
    id: "s-arjun", name: "Arjun Mehta", shop: "Mehta Brass", country: "Jaipur, India", countryCode: "IN",
    currency: "INR", refundRate: 0.02, bank: "ICICI Bank", account: "•••• 5501",
    orders: [["Brass lamp ×9", 211_000, 20], ["Serving bowls ×12", 164_000, 26]],
  },
  {
    id: "s-grace", name: "Grace Whitfield", shop: "Whitfield Ceramics", country: "Bristol, UK", countryCode: "GB",
    currency: "GBP", refundRate: 0.02, bank: "Monzo", account: "•••• 7140",
    orders: [["Dinner set ×14", 6_440, 18], ["Vase collection ×9", 3_960, 22]],
  },
  {
    id: "s-tom", name: "Tom Ellery", shop: "Ellery & Co Prints", country: "Leeds, UK", countryCode: "GB",
    currency: "GBP", refundRate: 0.03, bank: "Barclays", account: "•••• ••••", valid: false,
    validationNote: "Airwallex validation failed: sort_code is required for GBP local transfers.",
    orders: [["Riso print set ×40", 2_280, 20]],
  },
  {
    id: "s-camille", name: "Camille Durand", shop: "Atelier Durand", country: "Lyon, France", countryCode: "FR",
    currency: "EUR", refundRate: 0.03, bank: "BNP Paribas", account: "FR76 •••• 0193",
    orders: [["Linen shirt ×18", 2_160, 19], ["Linen trousers ×12", 1_740, 24]],
  },
  {
    id: "s-lena", name: "Lena Vogel", shop: "Vogel Studio", country: "Berlin, Germany", countryCode: "DE",
    currency: "EUR", refundRate: 0.04, bank: "N26", account: "DE89 •••• 3000",
    orders: [["Desk lamp ×10", 2_890, 17, "DISPUTED"], ["Wall shelf ×16", 3_520, 21], ["Clock ×22", 1_980, 25]],
  },
  {
    id: "s-maria", name: "Maria Santos", shop: "Santos Weaves", country: "Cebu, Philippines", countryCode: "PH",
    currency: "PHP", refundRate: 0.03, bank: "BDO", account: "•••• 4418",
    orders: [["Abacá bag ×22", 198_000, 18], ["Placemat set ×30", 126_000, 23]],
  },
  {
    id: "s-rafael", name: "Rafael Lima", shop: "Lima Couro", country: "Recife, Brazil", countryCode: "BR",
    currency: "BRL", refundRate: 0.04, bank: "Banco Inter", account: "•••• 7720", localRail: false,
    orders: [["Leather sandals ×26", 9_880, 19], ["Belt ×30", 4_350, 22]],
  },
];

export function buildSeed(): { sellers: Seller[]; orders: Order[]; lines: PayoutLine[] } {
  const sellers: Seller[] = [];
  const orders: Order[] = [];
  const lines: PayoutLine[] = [];
  let n = 1000;
  for (const s of SPECS) {
    const orderIds: string[] = [];
    for (const [item, amount, daysAgo, status] of s.orders) {
      const id = `KM-${++n}`;
      orderIds.push(id);
      orders.push({
        id,
        sellerId: s.id,
        item,
        amount,
        deliveredAt: iso(daysAgo),
        returnWindowEndsAt: iso(daysAgo - DEFAULT_POLICY.returnWindowDays),
        status: status ?? "DELIVERED",
      });
    }
    sellers.push({
      id: s.id,
      name: s.name,
      shop: s.shop,
      country: s.country,
      countryCode: s.countryCode,
      currency: s.currency,
      email: `${s.name.split(" ")[0].toLowerCase()}@${s.shop.toLowerCase().replace(/[^a-z]/g, "")}.example`,
      refundRate: s.refundRate,
      beneficiary: {
        id: `ben_${s.id.slice(2)}`,
        accountName: s.name,
        bankName: s.bank,
        accountMasked: s.account,
        localRail: s.localRail ?? true,
        valid: s.valid ?? true,
        validationNote: s.validationNote,
        lastChangedAt: iso(s.changedDaysAgo ?? 210),
      },
    });
    lines.push({ id: `P-${s.id.slice(2).toUpperCase()}`, sellerId: s.id, kind: "WEEKLY", orderIds, source: "Kora order export" });
  }
  // The weekly export contains Camille twice (a known export bug). Holdpoint must not pay twice.
  const camille = lines.find((l) => l.sellerId === "s-camille")!;
  lines.push({ ...camille, id: "P-CAMILLE-2", source: "Kora order export (row 41)" });
  return { sellers, orders, lines };
}
