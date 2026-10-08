"use client";

import { useEffect, useRef } from "react";
import { Button, DecisionMark, OUTCOME_STYLE } from "@/components/ui";
import { fmt, fmtUsd } from "@/lib/engine/money";
import { lineTransfers, type Action, type RunState } from "@/lib/engine/run";
import type { CheckResult } from "@/lib/engine/types";
import { transferLabel } from "./StripBoard";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function CheckRow({ c, i }: { c: CheckResult; i: number }) {
  const tone =
    c.status === "pass" ? "text-clear" : c.status === "info" ? "text-ink-3" : c.outcome ? OUTCOME_STYLE[c.outcome].fg : "text-ink";
  return (
    <li className="check-in flex gap-3 py-2.5" style={{ animationDelay: `${i * 30}ms` }}>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${c.status === "pass" ? "bg-clear" : c.status === "info" ? "bg-rule" : "bg-current"} ${tone}`} aria-hidden />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold">{c.label}</span>
          <span className={`text-xs font-medium ${tone}`}>
            {c.status === "pass" ? "Passed" : c.status === "info" ? "Chosen" : `Fired: ${OUTCOME_STYLE[c.outcome!].word.toLowerCase()}`}
          </span>
        </div>
        <p className="text-sm text-ink-2">{c.detail}</p>
      </div>
    </li>
  );
}

export function SellerDrawer({
  state,
  lineId,
  dispatch,
  onClose,
}: {
  state: RunState;
  lineId: string;
  dispatch: (a: Action) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const line = state.lines.find((l) => l.id === lineId);
  if (!line) return null;
  const d = state.decisions[lineId];
  const seller = state.sellers[line.sellerId];
  const b = seller.beneficiary;
  const c = seller.currency;
  const orders = line.orderIds.map((id) => state.orders[id]).filter(Boolean);
  const transfers = lineTransfers(state, lineId);
  const messages = state.messages.filter((m) => m.sellerId === seller.id);
  const now = Date.parse(state.now);
  const inWindow = orders.some((o) => o.status === "DELIVERED" && Date.parse(o.returnWindowEndsAt) > now);
  const autonomy = d.checks.find((x) => x.id === "autonomy");
  const sent = transfers.some((t) => t.status !== "FAILED");

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button className="absolute inset-0 bg-ink/25" aria-label="Close details" onClick={onClose} tabIndex={-1} />
      <aside className="drawer-in relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-panel shadow-[-12px_0_40px_-20px_rgba(19,34,48,0.45)]">
        <header className="sticky top-0 z-10 border-b border-rule-soft bg-panel px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-ink-2">
                {line.id} from {line.source}
              </p>
              <h2 id="drawer-title" className="truncate text-xl font-bold tracking-tight">
                {seller.shop}
              </h2>
              <p className="text-sm text-ink-2">
                {seller.name}, {seller.country}
              </p>
            </div>
            <button ref={closeRef} onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-medium text-ink-2 hover:bg-rule-soft">
              Close
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <DecisionMark outcome={d.outcome} size="lg" />
            <span className="text-sm text-ink-2">{d.outcome === "CLEAR" ? "All checks passed." : d.headline}</span>
          </div>
        </header>

        <div className="space-y-7 px-6 py-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-3">Owed</dt>
              <dd className="num font-semibold">{fmt(d.owed, c)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Kept back</dt>
              <dd className="num font-semibold">{d.reserve > 0 ? fmt(d.reserve, c) : "None"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Sends now</dt>
              <dd className="num font-semibold">{d.sendable > 0 ? fmt(d.sendable, c) : "None"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Route</dt>
              <dd className="font-semibold">
                {d.route.kind === "LOCAL" ? "Local" : "SWIFT"} <span className="num text-sm font-normal text-ink-2">~{fmtUsd(d.route.feeUsd)}</span>
              </dd>
            </div>
          </dl>

          {/* Actions that need a person */}
          {(b.pendingChange?.status === "UNVERIFIED" ||
            (autonomy?.status === "fire" || (d.needsApproval && d.approved && !sent)) ||
            b.rejection ||
            !b.valid ||
            (inWindow && line.kind === "WEEKLY")) && (
            <section aria-label="Actions" className="space-y-3 rounded-lg border border-rule bg-wash p-4">
              {b.pendingChange?.status === "UNVERIFIED" && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Bank-change request, not applied</p>
                  <blockquote className="border-l-2 border-hold pl-3 text-sm text-ink-2">“{b.pendingChange.evidence}”</blockquote>
                  <p className="text-sm text-ink-2">
                    Call {seller.name.split(" ")[0]} on the number you already have, not one in the email.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => dispatch({ type: "BANK_CHANGE_RESOLVED", sellerId: seller.id, confirmed: true })}>
                      Seller confirmed the change
                    </Button>
                    <Button variant="danger" onClick={() => dispatch({ type: "BANK_CHANGE_RESOLVED", sellerId: seller.id, confirmed: false })}>
                      Seller didn't ask: mark as fraud
                    </Button>
                  </div>
                </div>
              )}
              {autonomy?.status === "fire" && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Needs approval</p>
                  <p className="text-sm text-ink-2">{autonomy.detail}</p>
                  <Button onClick={() => dispatch({ type: "APPROVE", lineId })}>
                    Approve {fmt(d.owed - d.reserve, c)} to {b.bankName} {b.accountMasked}
                  </Button>
                </div>
              )}
              {d.needsApproval && d.approved && !sent && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-ink-2">Approved. It will go out with the next send.</p>
                  <Button variant="quiet" onClick={() => dispatch({ type: "UNAPPROVE", lineId })}>
                    Withdraw approval
                  </Button>
                </div>
              )}
              {(b.rejection || !b.valid) && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Bank details need fixing</p>
                  <p className="text-sm text-ink-2">
                    {b.rejection ? `The bank said: ${b.rejection.reason}.` : b.validationNote} Holdpoint never edits bank details itself.
                  </p>
                  <Button variant="secondary" onClick={() => dispatch({ type: "BENEFICIARY_CORRECTED", sellerId: seller.id })}>
                    Mark details corrected and re-validate
                  </Button>
                </div>
              )}
              {inWindow && line.kind === "WEEKLY" && !b.pendingChange && !b.rejection && b.valid && autonomy?.status !== "fire" && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-ink-2">Some orders are still inside their return window.</p>
                  <Button variant="secondary" onClick={() => dispatch({ type: "WINDOW_CLOSED", sellerId: seller.id })}>
                    Close return window
                  </Button>
                </div>
              )}
            </section>
          )}

          <section aria-labelledby="why">
            <h3 id="why" className="text-sm font-semibold">
              Why {OUTCOME_STYLE[d.outcome].word.toLowerCase()}
            </h3>
            <ul className="mt-1 divide-y divide-rule-soft">
              {d.checks.map((ch, i) => (
                <CheckRow key={ch.id} c={ch} i={i} />
              ))}
            </ul>
          </section>

          {orders.length > 0 && (
            <section aria-labelledby="orders">
              <h3 id="orders" className="text-sm font-semibold">
                Orders in this payout
              </h3>
              <ul className="mt-2 divide-y divide-rule-soft rounded-lg border border-rule-soft">
                {orders.map((o) => {
                  const open = o.status === "DELIVERED" && Date.parse(o.returnWindowEndsAt) > now;
                  return (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{o.item}</p>
                        <p className="text-xs text-ink-2">
                          {o.id},{" "}
                          {o.status === "REFUND_REQUESTED"
                            ? "refund requested"
                            : o.status === "DISPUTED"
                              ? "under dispute"
                              : open
                                ? `returnable until ${shortDate(o.returnWindowEndsAt)}`
                                : "return window closed"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="num text-sm">{fmt(o.amount, c)}</span>
                        {o.status === "DELIVERED" && (
                          <button
                            onClick={() => dispatch({ type: "REFUND_FILED", orderId: o.id })}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-tower hover:bg-rule-soft"
                          >
                            Buyer asks for refund
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="bank">
            <h3 id="bank" className="text-sm font-semibold">
              Bank details on file
            </h3>
            <p className="mt-1 text-sm text-ink-2">
              {b.accountName}, {b.bankName} {b.accountMasked}. Last changed {shortDate(b.lastChangedAt)}.
              {b.localRail ? " Local transfer available." : " No local route; pays by SWIFT."}
            </p>
          </section>

          <section aria-labelledby="attempts">
            <h3 id="attempts" className="text-sm font-semibold">
              Payment attempts
            </h3>
            {transfers.length === 0 ? (
              <p className="mt-1 text-sm text-ink-2">Nothing sent yet.</p>
            ) : (
              <ol className="mt-2 space-y-2">
                {transfers.map((t) => {
                  const l = transferLabel(t)!;
                  return (
                    <li key={t.requestId} className="rounded-lg border border-rule-soft px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">Attempt {t.attempt}</span>
                        <span className={`text-sm font-semibold ${l.tone}`}>{l.text}</span>
                      </div>
                      <p className="num text-xs text-ink-2">
                        {fmt(t.amount, t.currency)}, request {t.requestId}
                        {t.railTransferId ? `, ${t.railTransferId}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-labelledby="msgs">
            <h3 id="msgs" className="text-sm font-semibold">
              What {seller.name.split(" ")[0]} has been told
            </h3>
            {messages.length === 0 ? (
              <p className="mt-1 text-sm text-ink-2">No messages yet. Sellers hear from Holdpoint when their payout changes or is paid.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {messages.map((m) => (
                  <li key={m.id} className="rounded-lg bg-wash px-3 py-2 text-sm">
                    {m.text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
