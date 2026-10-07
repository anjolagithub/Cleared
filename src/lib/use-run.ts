"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { initialState, reducer, requestIdFor, nextAttempt, sendableLines, type Action, type RailMode, type RunState } from "./engine/run";
import type { ModelReading, Transfer } from "./engine/types";
import { AirwallexSandboxRail } from "./rail/airwallex-client";
import { SimulatedRail } from "./rail/simulated";
import { RailTimeout, type PayoutRail, type RailTransfer } from "./rail/types";
import { fmt } from "./engine/money";

const FAILURE_LABEL: Record<string, string> = {
  BENEFICIARY_NAME_MISMATCH: "account name does not match the bank's records",
  BENEFICIARY_BANK_RETURNED: "the beneficiary bank returned the payment",
};

export interface Capabilities {
  airwallex: boolean;
  model: boolean;
}

export function useRun() {
  const [mode, setMode] = useState<RailMode>("simulation");
  const [state, rawDispatch] = useReducer(reducer, mode, initialState);
  const [caps, setCaps] = useState<Capabilities>({ airwallex: false, model: false });
  const [busy, setBusy] = useState(false);
  const ref = useRef<RunState>(state);
  ref.current = state;

  const rail = useMemo<PayoutRail & { dropResponse: Set<string> }>(
    () => (mode === "sandbox" ? new AirwallexSandboxRail() : new SimulatedRail()),
    [mode],
  );

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setCaps)
      .catch(() => undefined);
  }, []);

  const dispatch = useCallback((a: Action) => {
    if (a.type !== "TRANSFER_UPSERT" && a.type !== "LOG" && a.type !== "ARM") rawDispatch({ type: "TICK", minutes: 1 });
    rawDispatch(a);
  }, []);

  const switchMode = useCallback((m: RailMode) => {
    setMode(m);
    rawDispatch({ type: "RESET", mode: m });
  }, []);

  const reset = useCallback(() => rawDispatch({ type: "RESET", mode }), [mode]);

  const upsert = useCallback((base: Transfer, rt: Partial<Omit<RailTransfer, "status">> & { status: Transfer["status"] }, note?: string) => {
    const t: Transfer = {
      ...base,
      status: rt.status,
      railTransferId: rt.id ?? base.railTransferId,
      failureReason: rt.failureReason ?? base.failureReason,
      updatedAt: ref.current.now,
    };
    rawDispatch({ type: "TICK", minutes: 0.1 });
    rawDispatch({ type: "TRANSFER_UPSERT", transfer: t, note });
    return t;
  }, []);

  /** Send every payout the policy allows. Nothing else moves. */
  const send = useCallback(async () => {
    setBusy(true);
    rawDispatch({ type: "TICK", minutes: 2 });
    const s0 = ref.current;
    const lines = sendableLines(s0);
    rawDispatch({
      type: "LOG",
      entry: { kind: "execute", actor: "Cleared", text: `Sending ${lines.length} payouts that passed every check. Held and blocked payouts stay put.` },
    });
    await Promise.all(
      lines.map(async (line, i) => {
        await new Promise((r) => setTimeout(r, i * 140));
        const s = ref.current;
        const d = s.decisions[line.id];
        const seller = s.sellers[line.sellerId];
        const attempt = nextAttempt(s, line.id);
        const requestId = requestIdFor(s, line.id, attempt);
        const base: Transfer = {
          requestId,
          lineId: line.id,
          sellerId: seller.id,
          attempt,
          amount: d.sendable,
          currency: seller.currency,
          sourceUsd: d.sendableUsd,
          feeUsd: d.route.feeUsd,
          route: d.route.kind,
          status: "PROCESSING",
          createdAt: s.now,
          updatedAt: s.now,
        };
        if (s.armed.timeout === line.id) {
          rail.dropResponse.add(requestId);
          rawDispatch({ type: "ARM", kind: "timeout", lineId: undefined });
        }
        try {
          const rt = await rail.createTransfer({
            requestId,
            beneficiaryId: seller.beneficiary.id,
            beneficiaryName: seller.beneficiary.accountName,
            amount: d.sendable,
            currency: seller.currency,
            sourceCurrency: "USD",
            route: d.route.kind,
            reference: `Kora ${s.runId} ${seller.shop}`,
          });
          upsert(base, rt, `Accepted ${fmt(d.sendable, seller.currency)} to ${seller.shop} as ${rt.id} (request ${requestId}).`);
        } catch (e) {
          if (e instanceof RailTimeout) {
            upsert(base, { status: "UNKNOWN" }, `No response for ${seller.shop} (request ${requestId}). Outcome unknown, so Cleared will not retry yet.`);
            rawDispatch({
              type: "LOG",
              entry: { kind: "reconcile", actor: "Cleared", lineId: line.id, sellerId: seller.id, text: `Looking up request ${requestId} on Airwallex before doing anything else.` },
            });
            const found = await rail.findByRequestId(requestId);
            if (found) {
              upsert(base, found, `Found ${found.id} for request ${requestId}: the first attempt went through. No second payment created.`);
            } else {
              const rt = await rail.createTransfer({
                requestId,
                beneficiaryId: seller.beneficiary.id,
                beneficiaryName: seller.beneficiary.accountName,
                amount: d.sendable,
                currency: seller.currency,
                sourceCurrency: "USD",
                route: d.route.kind,
                reference: `Kora ${s.runId} ${seller.shop}`,
              });
              upsert(base, rt, `Nothing found for ${requestId}; re-sent with the same request ID so it can only land once.`);
            }
          } else {
            rawDispatch({
              type: "LOG",
              entry: { kind: "execute", actor: "Airwallex", lineId: line.id, sellerId: seller.id, text: `Rejected request for ${seller.shop}: ${(e as Error).message}` },
            });
          }
        }
      }),
    );
    setBusy(false);
  }, [rail, upsert]);

  // Move transfers through the rail's states and react to the result.
  useEffect(() => {
    const timer = setInterval(async () => {
      const s = ref.current;
      const moving = s.transfers.filter((t) => (t.status === "PROCESSING" || t.status === "SENT") && t.railTransferId);
      for (const t of moving) {
        const failWith = s.armed.reject === t.lineId && t.status === "SENT" ? "BENEFICIARY_NAME_MISMATCH" : undefined;
        try {
          const rt = await rail.advance(t.railTransferId!, failWith ? { failWith } : undefined);
          if (rt.status === t.status) continue;
          const seller = s.sellers[t.sellerId];
          if (rt.status === "FAILED") {
            const reason = FAILURE_LABEL[rt.failureReason ?? ""] ?? rt.failureReason ?? "unknown reason";
            upsert(t, rt, `${t.railTransferId} to ${seller.shop} failed: ${reason}. Funds returned to the wallet.`);
            rawDispatch({ type: "ARM", kind: "reject", lineId: undefined });
            rawDispatch({ type: "BANK_REJECTED", sellerId: t.sellerId, reason, requestId: t.requestId });
          } else {
            upsert(t, rt, rt.status === "PAID" ? `${t.railTransferId} paid to ${seller.shop}.` : undefined);
          }
        } catch {
          /* rail hiccup: try again next tick */
        }
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [rail, upsert]);

  const readInbound = useCallback(async (from: string, subject: string, body: string) => {
    const s = ref.current;
    let reading: ModelReading;
    try {
      const res = await fetch("/api/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from, subject, body, sellers: Object.values(s.sellers) }),
      });
      reading = await res.json();
    } catch {
      const { readByRules } = await import("./engine/reader");
      reading = readByRules(from, subject, body, Object.values(s.sellers));
    }
    dispatch({ type: "INBOUND", from, subject, body, reading });
    return reading;
  }, [dispatch]);

  return { state, dispatch, send, busy, mode, switchMode, caps, reset, readInbound };
}
