import { evaluateRun, owedAndReserve } from "./evaluate";
import { decisionMessage, paidMessage } from "./messages";
import { fmt, fmtUsd } from "./money";
import { buildSeed, DEFAULT_POLICY, OPENING_BALANCE_USD, RUN_ID, RUN_LABEL, RUN_NOW } from "./seed";
import type {
  Decision,
  Inbound,
  LedgerEntry,
  ModelReading,
  Order,
  PayoutLine,
  Policy,
  Seller,
  SellerMessage,
  Transfer,
} from "./types";

export type RailMode = "simulation" | "sandbox";

export interface RunState {
  runId: string;
  label: string;
  mode: RailMode;
  now: string;
  policy: Policy;
  balanceUsd: number;
  sellers: Record<string, Seller>;
  orders: Record<string, Order>;
  lines: PayoutLine[];
  decisions: Record<string, Decision>;
  transfers: Transfer[];
  approvals: Record<string, boolean>;
  ledger: LedgerEntry[];
  messages: SellerMessage[];
  inbound: Inbound[];
  armed: { timeout?: string; reject?: string };
  /** Lines whose decision changed on the last evaluation, for highlighting. */
  changed: string[];
  seq: number;
}

export type Action =
  | { type: "RESET"; mode: RailMode }
  | { type: "APPROVE"; lineId: string }
  | { type: "UNAPPROVE"; lineId: string }
  | { type: "REFUND_FILED"; orderId: string }
  | { type: "DISPUTE_OPENED"; orderId: string }
  | { type: "INBOUND"; from: string; subject: string; body: string; reading: ModelReading }
  | { type: "BANK_CHANGE_RESOLVED"; sellerId: string; confirmed: boolean }
  | { type: "BANK_REJECTED"; sellerId: string; reason: string; requestId: string }
  | { type: "BENEFICIARY_CORRECTED"; sellerId: string }
  | { type: "WINDOW_CLOSED"; sellerId: string }
  | { type: "ARM"; kind: "timeout" | "reject"; lineId: string | undefined }
  | { type: "TRANSFER_UPSERT"; transfer: Transfer; note?: string }
  | { type: "LOG"; entry: Omit<LedgerEntry, "id" | "at"> }
  | { type: "BALANCE"; balanceUsd: number }
  | { type: "TICK"; minutes: number };

function byId<T extends { id: string }>(xs: T[]): Record<string, T> {
  return Object.fromEntries(xs.map((x) => [x.id, x]));
}

function ctxOf(s: RunState) {
  return {
    now: s.now,
    policy: s.policy,
    sellers: s.sellers,
    orders: s.orders,
    lines: s.lines,
    transfers: s.transfers,
    approvals: s.approvals,
    balanceUsd: s.balanceUsd,
  };
}

function log(s: RunState, e: Omit<LedgerEntry, "id" | "at">): RunState {
  const entry: LedgerEntry = { ...e, id: s.seq + 1, at: s.now };
  return { ...s, seq: s.seq + 1, ledger: [entry, ...s.ledger] };
}

function message(s: RunState, sellerId: string, tone: SellerMessage["tone"], text: string): RunState {
  if (!text) return s;
  const m: SellerMessage = { id: s.seq + 1, sellerId, at: s.now, tone, text };
  return { ...s, seq: s.seq + 1, messages: [m, ...s.messages] };
}

function releaseDate(s: RunState, line: PayoutLine): string | undefined {
  const ends = line.orderIds
    .map((id) => s.orders[id])
    .filter((o) => o && o.status === "DELIVERED" && Date.parse(o.returnWindowEndsAt) > Date.parse(s.now))
    .map((o) => o.returnWindowEndsAt)
    .sort();
  return ends[ends.length - 1];
}

/**
 * Re-evaluate the given lines (or all), record what changed in the ledger and
 * notify affected sellers. Unaffected lines keep their decision.
 */
function reevaluate(s: RunState, reason: string, only?: string[]): RunState {
  const set = only ? new Set(only) : undefined;
  const next = evaluateRun(ctxOf(s), s.decisions, set);
  const changed: string[] = [];
  let out: RunState = { ...s, decisions: next };
  for (const line of s.lines) {
    const before = s.decisions[line.id];
    const after = next[line.id];
    if (!after) continue;
    const moved = !before || before.outcome !== after.outcome || before.sendable !== after.sendable;
    if (!moved) continue;
    changed.push(line.id);
    if (before) {
      const seller = s.sellers[line.sellerId];
      out = log(out, {
        kind: "decide",
        actor: "Cleared",
        lineId: line.id,
        sellerId: line.sellerId,
        text:
          before.outcome !== after.outcome
            ? `${seller.shop}: ${before.outcome} → ${after.outcome}. ${after.headline}`
            : `${seller.shop}: sendable now ${fmt(after.sendable, seller.currency)} (was ${fmt(before.sendable, seller.currency)}).`,
      });
      out = message(out, line.sellerId, after.outcome, decisionMessage(after, seller, releaseDate(s, line)));
    }
  }
  if (only) {
    out = log(out, {
      kind: "observe",
      actor: "Cleared",
      text: `${reason} Re-checked ${only.length} of ${s.lines.length} payouts; ${changed.length} changed.`,
    });
  }
  return { ...out, changed };
}

export function initialState(mode: RailMode): RunState {
  const { sellers, orders, lines } = buildSeed();
  let s: RunState = {
    runId: RUN_ID,
    label: RUN_LABEL,
    mode,
    now: RUN_NOW,
    policy: DEFAULT_POLICY,
    balanceUsd: OPENING_BALANCE_USD,
    sellers: byId(sellers),
    orders: byId(orders),
    lines,
    decisions: {},
    transfers: [],
    approvals: {},
    ledger: [],
    messages: [],
    inbound: [],
    armed: {},
    changed: [],
    seq: 0,
  };
  s = log(s, {
    kind: "observe",
    actor: "Cleared",
    text: `Loaded ${lines.length} payouts for ${sellers.length} sellers from the Kora order export, ${orders.length} orders, wallet ${fmtUsd(OPENING_BALANCE_USD)}.`,
  });
  s = { ...s, decisions: evaluateRun(ctxOf(s), {}) };
  const counts = { CLEAR: 0, REDUCE: 0, HOLD: 0, BLOCK: 0 };
  for (const d of Object.values(s.decisions)) counts[d.outcome] += 1;
  s = log(s, {
    kind: "decide",
    actor: "Cleared",
    text: `Checked every payout before sending: ${counts.CLEAR} clear, ${counts.REDUCE} reduce, ${counts.HOLD} hold, ${counts.BLOCK} block.`,
  });
  return s;
}

function linesForOrder(s: RunState, orderId: string): PayoutLine[] {
  return s.lines.filter((l) => l.orderIds.includes(orderId));
}

function linesForSeller(s: RunState, sellerId: string): string[] {
  return s.lines.filter((l) => l.sellerId === sellerId).map((l) => l.id);
}

function setSeller(s: RunState, sellerId: string, f: (x: Seller) => Seller): RunState {
  return { ...s, sellers: { ...s.sellers, [sellerId]: f(s.sellers[sellerId]) } };
}

export function reducer(s: RunState, a: Action): RunState {
  switch (a.type) {
    case "RESET":
      return initialState(a.mode);

    case "TICK":
      return { ...s, now: new Date(Date.parse(s.now) + a.minutes * 60000).toISOString() };

    case "BALANCE":
      return { ...s, balanceUsd: a.balanceUsd };

    case "LOG":
      return log(s, a.entry);

    case "APPROVE":
    case "UNAPPROVE": {
      const approvals = { ...s.approvals, [a.lineId]: a.type === "APPROVE" };
      const line = s.lines.find((l) => l.id === a.lineId)!;
      const seller = s.sellers[line.sellerId];
      let n = log({ ...s, approvals }, {
        kind: "approve",
        actor: "Approver",
        lineId: a.lineId,
        sellerId: seller.id,
        text:
          a.type === "APPROVE"
            ? `Approved ${fmt(s.decisions[a.lineId].owed - s.decisions[a.lineId].reserve, seller.currency)} to ${seller.shop} (${seller.beneficiary.bankName} ${seller.beneficiary.accountMasked}).`
            : `Withdrew approval for ${seller.shop}.`,
      });
      n = reevaluate(n, "Approval recorded.", [a.lineId]);
      return n;
    }

    case "REFUND_FILED":
    case "DISPUTE_OPENED": {
      const o = s.orders[a.orderId];
      const status = a.type === "REFUND_FILED" ? "REFUND_REQUESTED" : "DISPUTED";
      let n: RunState = { ...s, orders: { ...s.orders, [o.id]: { ...o, status } } };
      const seller = s.sellers[o.sellerId];
      n = log(n, {
        kind: "event",
        actor: "Marketplace",
        sellerId: seller.id,
        text: `${a.type === "REFUND_FILED" ? "Buyer requested a refund" : "Buyer opened a dispute"} on ${o.id} (${o.item}, ${fmt(o.amount, seller.currency)}).`,
      });
      const affected = linesForOrder(s, o.id);
      const sent = affected.filter((l) => s.transfers.some((t) => t.lineId === l.id && t.status !== "FAILED"));
      if (sent.length) {
        n = log(n, {
          kind: "decide",
          actor: "Cleared",
          sellerId: seller.id,
          text: `${seller.shop} was already paid this week. ${fmt(o.amount, seller.currency)} will be held from their next payout instead of clawing it back.`,
        });
      }
      return reevaluate(n, "Order changed.", affected.map((l) => l.id));
    }

    case "INBOUND": {
      const inbound: Inbound = {
        id: s.seq + 1,
        from: a.from,
        subject: a.subject,
        body: a.body,
        receivedAt: s.now,
        reading: a.reading,
      };
      let n: RunState = { ...s, seq: s.seq + 1, inbound: [inbound, ...s.inbound] };
      const r = a.reading;
      const seller = r.sellerId ? s.sellers[r.sellerId] : undefined;
      n = log(n, {
        kind: "read",
        actor: "Model",
        sellerId: seller?.id,
        text: `Read email from ${a.from}: ${r.intent.replaceAll("_", " ").toLowerCase()} (${Math.round(r.confidence * 100)}% confidence). Evidence: "${r.evidence}"`,
      });
      if (r.intent === "BANK_CHANGE_REQUEST" && seller) {
        n = setSeller(n, seller.id, (x) => ({
          ...x,
          beneficiary: {
            ...x.beneficiary,
            pendingChange: { requestedAt: s.now, channel: "email", evidence: r.evidence, status: "UNVERIFIED" },
          },
        }));
        n = log(n, {
          kind: "decide",
          actor: "Cleared",
          sellerId: seller.id,
          text: `Bank details for ${seller.shop} were not changed. The request is quarantined until the seller confirms on their registered contact.`,
        });
        return reevaluate(n, "Bank-change request received.", linesForSeller(n, seller.id));
      }
      if (r.intent === "PAYOUT_QUERY" && seller) {
        const line = s.lines.find((l) => l.sellerId === seller.id);
        const d = line ? s.decisions[line.id] : undefined;
        if (d) n = message(n, seller.id, d.outcome, decisionMessage(d, seller));
      }
      return { ...n, changed: [] };
    }

    case "BANK_CHANGE_RESOLVED": {
      const seller = s.sellers[a.sellerId];
      let n = setSeller(s, a.sellerId, (x) => ({
        ...x,
        beneficiary: {
          ...x.beneficiary,
          pendingChange: undefined,
          lastChangedAt: a.confirmed ? s.now : x.beneficiary.lastChangedAt,
        },
      }));
      n = log(n, {
        kind: "human",
        actor: "Ops",
        sellerId: a.sellerId,
        text: a.confirmed
          ? `Seller confirmed the new account by phone. Details updated by Ops; cooling-off of ${s.policy.bankChangeCoolingHours}h starts now.`
          : `Seller says they never asked for a change. Request marked as suspected fraud; payouts continue to the verified ${seller.beneficiary.bankName} account.`,
      });
      if (!a.confirmed)
        n = message(n, a.sellerId, "INFO", `Hi ${seller.name.split(" ")[0]}, someone asked us to change your bank details. We blocked it. If this wasn't you, please reset your Kora Market password.`);
      return reevaluate(n, "Bank-change request resolved.", linesForSeller(n, a.sellerId));
    }

    case "BANK_REJECTED": {
      let n = setSeller(s, a.sellerId, (x) => ({
        ...x,
        beneficiary: { ...x.beneficiary, rejection: { reason: a.reason, at: s.now, transferRequestId: a.requestId } },
      }));
      return reevaluate(n, "Bank returned a payment.", linesForSeller(n, a.sellerId));
    }

    case "BENEFICIARY_CORRECTED": {
      const seller = s.sellers[a.sellerId];
      let n = setSeller(s, a.sellerId, (x) => ({
        ...x,
        beneficiary: { ...x.beneficiary, rejection: undefined, valid: true, validationNote: undefined },
      }));
      n = log(n, {
        kind: "human",
        actor: "Ops",
        sellerId: a.sellerId,
        text: `Ops corrected the account details for ${seller.shop}. Airwallex validation passed. A retry will use a new request ID.`,
      });
      return reevaluate(n, "Bank details corrected.", linesForSeller(n, a.sellerId));
    }

    case "WINDOW_CLOSED": {
      const seller = s.sellers[a.sellerId];
      const closedAt = new Date(Date.parse(s.now) - 1000).toISOString();
      const orders = { ...s.orders };
      const touched: Order[] = [];
      for (const o of Object.values(s.orders)) {
        if (o.sellerId !== a.sellerId) continue;
        if (o.status === "DELIVERED" && Date.parse(o.returnWindowEndsAt) > Date.parse(s.now)) {
          orders[o.id] = { ...o, returnWindowEndsAt: closedAt };
          touched.push(o);
        }
      }
      let n: RunState = { ...s, orders };
      n = log(n, {
        kind: "event",
        actor: "Marketplace",
        sellerId: a.sellerId,
        text: `Return window closed on ${touched.length} ${seller.shop} order${touched.length === 1 ? "" : "s"} with no returns.`,
      });
      // If the weekly payout already went out reduced, release the part no longer at risk.
      const weekly = s.lines.find((l) => l.sellerId === a.sellerId && l.kind === "WEEKLY");
      const paid = weekly && s.transfers.some((t) => t.lineId === weekly.id && t.status !== "FAILED");
      if (weekly && paid) {
        const before = s.decisions[weekly.id].reserve;
        const after = owedAndReserve(weekly, seller, orders, s.policy, s.now).reserve;
        const release = Math.round((before - after) * 100) / 100;
        if (release > 0 && !s.lines.some((l) => l.id === `${weekly.id}-R`)) {
          const rl: PayoutLine = {
            id: `${weekly.id}-R`,
            sellerId: a.sellerId,
            kind: "RELEASE",
            orderIds: [],
            fixedAmount: release,
            source: "Reserve release",
          };
          n = { ...n, lines: [...n.lines, rl] };
          n = log(n, {
            kind: "decide",
            actor: "Cleared",
            sellerId: a.sellerId,
            text: `Releasing ${fmt(release, seller.currency)} held back from ${seller.shop}'s payout.`,
          });
          return reevaluate(n, "Reserve released.", [rl.id]);
        }
      }
      return reevaluate(n, "Return window closed.", linesForSeller(n, a.sellerId));
    }

    case "ARM":
      return { ...s, armed: { ...s.armed, [a.kind]: a.lineId } };

    case "TRANSFER_UPSERT": {
      const t = a.transfer;
      const prev = s.transfers.find((x) => x.requestId === t.requestId);
      const transfers = prev ? s.transfers.map((x) => (x.requestId === t.requestId ? t : x)) : [...s.transfers, t];
      let n: RunState = { ...s, transfers };
      const seller = s.sellers[t.sellerId];
      if (a.note) n = log(n, { kind: "reconcile", actor: "Airwallex", lineId: t.lineId, sellerId: t.sellerId, text: a.note });
      if (!prev && t.status !== "UNKNOWN") {
        n = { ...n, balanceUsd: n.balanceUsd - t.sourceUsd - t.feeUsd };
      }
      if (prev?.status === "UNKNOWN" && t.status !== "UNKNOWN") {
        n = { ...n, balanceUsd: n.balanceUsd - t.sourceUsd - t.feeUsd };
      }
      if (t.status === "PAID" && prev?.status !== "PAID") n = message(n, t.sellerId, "PAID", paidMessage(t, seller));
      if (t.status === "FAILED" && prev?.status !== "FAILED") {
        n = { ...n, balanceUsd: n.balanceUsd + t.sourceUsd + t.feeUsd };
      }
      return { ...n, changed: [] };
    }
  }
}

export function lineTransfers(s: RunState, lineId: string): Transfer[] {
  return s.transfers.filter((t) => t.lineId === lineId).sort((a, b) => a.attempt - b.attempt);
}

/** Lines that may be sent now: sendable, and no transfer in motion or done. */
export function sendableLines(s: RunState): PayoutLine[] {
  return s.lines.filter((l) => {
    const d = s.decisions[l.id];
    if (!d || d.sendable <= 0) return false;
    if (d.outcome !== "CLEAR" && d.outcome !== "REDUCE") return false;
    return !s.transfers.some((t) => t.lineId === l.id && t.status !== "FAILED");
  });
}

export function nextAttempt(s: RunState, lineId: string): number {
  return lineTransfers(s, lineId).length + 1;
}

export function requestIdFor(s: RunState, lineId: string, attempt: number): string {
  return `${s.runId}-${lineId}-a${attempt}`.toLowerCase();
}
