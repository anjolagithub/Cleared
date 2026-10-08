import { chooseRoute, fmt, fmtUsd, round2, toUsd } from "./money";
import type {
  CheckResult,
  Decision,
  Order,
  Outcome,
  PayoutLine,
  Policy,
  Seller,
  Transfer,
} from "./types";

const RANK: Record<Outcome, number> = { CLEAR: 0, REDUCE: 1, HOLD: 2, BLOCK: 3 };

export function worst(a: Outcome, b: Outcome): Outcome {
  return RANK[a] >= RANK[b] ? a : b;
}

const ACTIVE: Transfer["status"][] = ["PROCESSING", "SENT", "PAID", "UNKNOWN"];

const HOURS = 3600 * 1000;

export interface EvalContext {
  now: string;
  policy: Policy;
  sellers: Record<string, Seller>;
  orders: Record<string, Order>;
  lines: PayoutLine[];
  transfers: Transfer[];
  approvals: Record<string, boolean>;
  balanceUsd: number;
}

function sameOrders(a: PayoutLine, b: PayoutLine): boolean {
  if (a.orderIds.length === 0 || b.orderIds.length === 0) return false;
  const set = new Set(a.orderIds);
  return b.orderIds.some((id) => set.has(id));
}

/** Owed and reserve for a line, in the seller's currency. */
export function owedAndReserve(
  line: PayoutLine,
  seller: Seller,
  orders: Record<string, Order>,
  policy: Policy,
  now: string,
): { owed: number; reserve: number; parts: string[] } {
  if (line.kind === "RELEASE") {
    return { owed: line.fixedAmount ?? 0, reserve: 0, parts: [] };
  }
  let owed = 0;
  let refunds = 0;
  let disputes = 0;
  let inWindow = 0;
  const t = Date.parse(now);
  for (const id of line.orderIds) {
    const o = orders[id];
    if (!o || o.status === "REFUNDED") continue;
    owed += o.amount;
    if (o.status === "REFUND_REQUESTED") refunds += o.amount;
    else if (o.status === "DISPUTED") disputes += o.amount * (policy.disputeReservePct / 100);
    else if (o.status === "DELIVERED" && Date.parse(o.returnWindowEndsAt) > t) inWindow += o.amount * seller.refundRate;
  }
  const parts: string[] = [];
  const c = seller.currency;
  if (refunds > 0) parts.push(`${fmt(refunds, c)} in requested refunds`);
  if (disputes > 0) parts.push(`${fmt(disputes, c)} under dispute`);
  if (inWindow > 0)
    parts.push(`${fmt(inWindow, c)} expected returns (${Math.round(seller.refundRate * 100)}% of orders still in the return window)`);
  const reserve = Math.min(owed, round2(refunds + disputes + inWindow));
  return { owed: round2(owed), reserve, parts };
}

/**
 * Evaluate one payout line. Pure and deterministic: same inputs, same decision.
 * `committedUsd` is what earlier lines in the run have already claimed from the balance.
 */
export function evaluateLine(
  line: PayoutLine,
  ctx: EvalContext,
  committedUsd: number,
  previous?: Decision,
): Decision {
  const seller = ctx.sellers[line.sellerId];
  const { policy } = ctx;
  const b = seller.beneficiary;
  const c = seller.currency;
  const checks: CheckResult[] = [];
  let outcome = "CLEAR" as Outcome;
  const fire = (r: CheckResult) => {
    checks.push(r);
    if (r.status === "fire" && r.outcome) outcome = worst(outcome, r.outcome);
  };

  // C1 duplicate guard
  const earlier = ctx.lines.slice(0, ctx.lines.indexOf(line));
  const dupLine = earlier.find((l) => l.sellerId === line.sellerId && l.kind === line.kind && sameOrders(l, line));
  const dupTransfer = ctx.transfers.find(
    (t) =>
      t.sellerId === line.sellerId &&
      t.lineId !== line.id &&
      ACTIVE.includes(t.status) &&
      (() => {
        const other = ctx.lines.find((l) => l.id === t.lineId);
        return other ? sameOrders(other, line) : false;
      })(),
  );
  if (dupLine || dupTransfer) {
    fire({
      id: "duplicate",
      label: "Duplicate guard",
      status: "fire",
      outcome: "BLOCK",
      detail: dupLine
        ? `Same orders already appear in payout ${dupLine.id} in this run.`
        : `These orders were already sent in transfer ${dupTransfer!.requestId}.`,
    });
  } else {
    fire({ id: "duplicate", label: "Duplicate guard", status: "pass", detail: "No other payout covers these orders." });
  }

  // C2 beneficiary validity
  if (!b.valid) {
    fire({
      id: "beneficiary",
      label: "Bank details",
      status: "fire",
      outcome: "BLOCK",
      detail: b.validationNote ?? "Airwallex validation rejected these bank details.",
    });
  } else {
    fire({ id: "beneficiary", label: "Bank details", status: "pass", detail: `${b.bankName} ${b.accountMasked} passed validation.` });
  }

  // C3 bank rejected a previous transfer
  if (b.rejection) {
    fire({
      id: "bankRejected",
      label: "Bank response",
      status: "fire",
      outcome: "BLOCK",
      detail: `The bank rejected the last payment: ${b.rejection.reason}. No retry until the details are corrected.`,
    });
  } else {
    fire({ id: "bankRejected", label: "Bank response", status: "pass", detail: "No rejected payments on these details." });
  }

  // C4 bank-change quarantine
  const hoursSinceChange = (Date.parse(ctx.now) - Date.parse(b.lastChangedAt)) / HOURS;
  if (b.pendingChange && b.pendingChange.status === "UNVERIFIED") {
    fire({
      id: "bankChange",
      label: "Bank-change quarantine",
      status: "fire",
      outcome: "HOLD",
      detail: `A request to change bank details arrived by ${b.pendingChange.channel}. Payouts wait until the seller confirms through a verified channel.`,
    });
  } else if (hoursSinceChange < policy.bankChangeCoolingHours) {
    fire({
      id: "bankChange",
      label: "Bank-change quarantine",
      status: "fire",
      outcome: "HOLD",
      detail: `Bank details changed ${Math.max(1, Math.round(hoursSinceChange))}h ago. Cooling-off is ${policy.bankChangeCoolingHours}h.`,
    });
  } else {
    fire({ id: "bankChange", label: "Bank-change quarantine", status: "pass", detail: "Bank details unchanged in the cooling-off window." });
  }

  // C5 refund reserve
  const { owed, reserve, parts } = owedAndReserve(line, seller, ctx.orders, policy, ctx.now);
  if (owed <= 0) {
    fire({ id: "reserve", label: "Refund reserve", status: "fire", outcome: "HOLD", detail: "Nothing is owed on this payout." });
  } else if (reserve >= owed) {
    fire({
      id: "reserve",
      label: "Refund reserve",
      status: "fire",
      outcome: "HOLD",
      detail: `All ${fmt(owed, c)} could still be refunded: ${parts.join("; ")}.`,
    });
  } else if (reserve > 0) {
    fire({
      id: "reserve",
      label: "Refund reserve",
      status: "fire",
      outcome: "REDUCE",
      detail: `Keep ${fmt(reserve, c)} back: ${parts.join("; ")}.`,
    });
  } else {
    fire({ id: "reserve", label: "Refund reserve", status: "pass", detail: "No open refunds, disputes or return windows." });
  }

  let sendable = outcome === "CLEAR" || outcome === "REDUCE" ? round2(owed - reserve) : 0;
  let sendableUsd = round2(toUsd(sendable, c));
  const route = chooseRoute(c, sendableUsd || toUsd(owed, c), b.localRail);

  // C6 autonomy limit
  const approved = !!ctx.approvals[line.id];
  let needsApproval = false;
  if (sendableUsd > policy.autonomousLimitUsd) {
    needsApproval = true;
    if (approved) {
      fire({
        id: "autonomy",
        label: "Approval limit",
        status: "pass",
        detail: `${fmtUsd(sendableUsd)} is above the ${fmtUsd(policy.autonomousLimitUsd)} limit and was approved by a person.`,
      });
    } else {
      fire({
        id: "autonomy",
        label: "Approval limit",
        status: "fire",
        outcome: "HOLD",
        detail: `${fmtUsd(sendableUsd)} is above the ${fmtUsd(policy.autonomousLimitUsd)} limit Holdpoint may send on its own.`,
      });
    }
  } else {
    fire({ id: "autonomy", label: "Approval limit", status: "pass", detail: `Within the ${fmtUsd(policy.autonomousLimitUsd)} limit.` });
  }

  // C7 funding
  const available = ctx.balanceUsd - policy.balanceFloorUsd - committedUsd;
  if (sendable > 0 && sendableUsd + route.feeUsd > available) {
    fire({
      id: "funding",
      label: "Funding",
      status: "fire",
      outcome: "HOLD",
      detail: `Sending ${fmtUsd(sendableUsd)} would take the wallet below its ${fmtUsd(policy.balanceFloorUsd)} floor.`,
    });
  } else {
    fire({
      id: "funding",
      label: "Funding",
      status: "pass",
      detail: `${fmtUsd(Math.max(0, available))} available above the ${fmtUsd(policy.balanceFloorUsd)} floor.`,
    });
  }

  if (outcome === "HOLD" || outcome === "BLOCK") {
    sendable = 0;
    sendableUsd = 0;
  }

  // C8 route (informational)
  checks.push({
    id: "route",
    label: "Route",
    status: "info",
    detail:
      route.kind === "LOCAL"
        ? `Local transfer in ${c}, about ${fmtUsd(route.feeUsd)} fee, ${route.etaDays}.`
        : `SWIFT, about ${fmtUsd(route.feeUsd)} fee, ${route.etaDays}. No local route on these details.`,
  });

  const firing = checks.filter((r) => r.status === "fire" && r.outcome === outcome);
  const headline =
    outcome === "CLEAR"
      ? "All checks passed."
      : firing.map((r) => r.label).join(", ");

  const changed = !!previous && previous.outcome !== outcome;
  const version = previous ? previous.version + (changed ? 1 : 0) : 1;

  return {
    lineId: line.id,
    sellerId: seller.id,
    outcome,
    owed,
    reserve,
    sendable,
    sendableUsd,
    checks,
    headline,
    route,
    needsApproval,
    approved,
    version,
    changedFrom: changed ? previous!.outcome : previous?.changedFrom,
  };
}

/** Lines that already have money in motion keep their decision. */
export function isSettledLine(lineId: string, transfers: Transfer[]): boolean {
  return transfers.some((t) => t.lineId === lineId && ACTIVE.includes(t.status));
}

/**
 * Evaluate the run. Only lines in `only` are re-evaluated; others keep their
 * previous decision (but still count against the balance).
 */
export function evaluateRun(
  ctx: EvalContext,
  previous: Record<string, Decision>,
  only?: Set<string>,
): Record<string, Decision> {
  const out: Record<string, Decision> = {};
  let committed = 0;
  for (const line of ctx.lines) {
    const prev = previous[line.id];
    const frozen = isSettledLine(line.id, ctx.transfers);
    const skip = frozen || (only && prev && !only.has(line.id));
    const d = skip && prev ? prev : evaluateLine(line, ctx, committed, prev);
    out[line.id] = d;
    if (!frozen) committed += d.sendableUsd + (d.sendable > 0 ? d.route.feeUsd : 0);
  }
  return out;
}

export function summarize(decisions: Record<string, Decision>) {
  const s = {
    CLEAR: { count: 0, usd: 0 },
    REDUCE: { count: 0, usd: 0 },
    HOLD: { count: 0, usd: 0 },
    BLOCK: { count: 0, usd: 0 },
    sendableUsd: 0,
    reserveUsd: 0,
    feesUsd: 0,
  };
  for (const d of Object.values(decisions)) {
    s[d.outcome].count += 1;
    s[d.outcome].usd += d.sendableUsd;
    s.sendableUsd += d.sendableUsd;
    s.reserveUsd += d.reserve / d.route.rateToUsd;
    if (d.sendable > 0) s.feesUsd += d.route.feeUsd;
  }
  return s;
}
