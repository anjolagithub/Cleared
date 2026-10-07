// Core domain types for Cleared.
// Rule: the model reads, the code decides, the rail moves the money.

export type Currency = "USD" | "NGN" | "KES" | "GBP" | "EUR" | "INR" | "PHP" | "BRL";

export type Outcome = "CLEAR" | "REDUCE" | "HOLD" | "BLOCK";

export type CheckId =
  | "duplicate"
  | "beneficiary"
  | "bankRejected"
  | "bankChange"
  | "reserve"
  | "autonomy"
  | "funding"
  | "route";

export type CheckStatus = "pass" | "fire" | "info";

export interface CheckResult {
  id: CheckId;
  label: string;
  status: CheckStatus;
  /** Outcome this check pushes toward when it fires. */
  outcome?: Outcome;
  /** Plain-language explanation shown to ops. */
  detail: string;
}

export type OrderStatus = "DELIVERED" | "REFUND_REQUESTED" | "DISPUTED" | "SETTLED" | "REFUNDED";

export interface Order {
  id: string;
  sellerId: string;
  /** Net amount owed to the seller for this order, in the seller's currency. */
  amount: number;
  deliveredAt: string;
  returnWindowEndsAt: string;
  status: OrderStatus;
  item: string;
}

export interface BankChangeRequest {
  requestedAt: string;
  channel: "email";
  evidence: string;
  status: "UNVERIFIED" | "CONFIRMED" | "REJECTED";
}

export interface Beneficiary {
  id: string;
  accountName: string;
  bankName: string;
  accountMasked: string;
  localRail: boolean;
  /** Result of Airwallex beneficiary validation. */
  valid: boolean;
  validationNote?: string;
  lastChangedAt: string;
  pendingChange?: BankChangeRequest;
  /** Set when a bank rejected a transfer for this beneficiary. Cleared only when a human corrects it. */
  rejection?: { reason: string; at: string; transferRequestId: string };
}

export interface Seller {
  id: string;
  name: string;
  shop: string;
  country: string;
  countryCode: string;
  currency: Currency;
  email: string;
  /** Trailing refund rate, 0..1. */
  refundRate: number;
  beneficiary: Beneficiary;
}

export type LineKind = "WEEKLY" | "RELEASE";

/** One payout obligation in a run. Usually one per seller; duplicates can appear in imports. */
export interface PayoutLine {
  id: string;
  sellerId: string;
  kind: LineKind;
  orderIds: string[];
  /** Fixed amount for RELEASE lines (reserve being released). */
  fixedAmount?: number;
  source: string;
}

export interface Policy {
  returnWindowDays: number;
  disputeReservePct: number;
  bankChangeCoolingHours: number;
  autonomousLimitUsd: number;
  balanceFloorUsd: number;
  duplicateWindowDays: number;
}

export type TransferStatus = "PROCESSING" | "SENT" | "PAID" | "FAILED" | "UNKNOWN";

export interface Transfer {
  requestId: string;
  lineId: string;
  sellerId: string;
  attempt: number;
  amount: number;
  currency: Currency;
  sourceUsd: number;
  feeUsd: number;
  route: RouteKind;
  status: TransferStatus;
  railTransferId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type RouteKind = "LOCAL" | "SWIFT";

export interface RouteChoice {
  kind: RouteKind;
  feeUsd: number;
  etaDays: string;
  rateToUsd: number;
}

export interface Decision {
  lineId: string;
  sellerId: string;
  outcome: Outcome;
  /** Gross owed for this line, seller currency. */
  owed: number;
  reserve: number;
  /** Amount that may move now, seller currency. */
  sendable: number;
  sendableUsd: number;
  checks: CheckResult[];
  headline: string;
  route: RouteChoice;
  needsApproval: boolean;
  approved: boolean;
  version: number;
  changedFrom?: Outcome;
}

export type LedgerKind = "observe" | "read" | "decide" | "approve" | "execute" | "reconcile" | "event" | "notify" | "human";

export interface LedgerEntry {
  id: number;
  at: string;
  kind: LedgerKind;
  actor: "Cleared" | "Model" | "Airwallex" | "Ops" | "Approver" | "Marketplace" | "Seller";
  text: string;
  lineId?: string;
  sellerId?: string;
}

export interface SellerMessage {
  id: number;
  sellerId: string;
  at: string;
  tone: Outcome | "PAID" | "INFO";
  text: string;
}

export interface Inbound {
  id: number;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  reading?: ModelReading;
}

export type Intent = "BANK_CHANGE_REQUEST" | "DISPUTE" | "PAYOUT_QUERY" | "OTHER";

export interface ModelReading {
  intent: Intent;
  sellerId?: string;
  confidence: number;
  evidence: string;
  reader: "claude" | "rules";
}
