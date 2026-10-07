"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button, OUTCOME_STYLE, OutcomeGlyph, Wordmark } from "@/components/ui";
import { summarize } from "@/lib/engine/evaluate";
import { fmtUsd } from "@/lib/engine/money";
import { sendableLines } from "@/lib/engine/run";
import type { Outcome } from "@/lib/engine/types";
import { useRun } from "@/lib/use-run";
import { Ledger } from "./Ledger";
import { SellerDrawer } from "./SellerDrawer";
import { SidePanel } from "./SidePanel";
import { StripBoard } from "./StripBoard";

const ORDER: Outcome[] = ["CLEAR", "REDUCE", "HOLD", "BLOCK"];

export function RunConsole() {
  const { state, dispatch, send, busy, mode, switchMode, caps, reset, readInbound } = useRun();
  const [open, setOpen] = useState<string | undefined>();
  const close = useCallback(() => setOpen(undefined), []);
  const sum = summarize(state.decisions);
  const ready = sendableLines(state);
  const readyUsd = ready.reduce((a, l) => a + state.decisions[l.id].sendableUsd, 0);
  const readyFees = ready.reduce((a, l) => a + state.decisions[l.id].route.feeUsd, 0);
  const paid = state.transfers.filter((t) => t.status === "PAID").length;
  const moving = state.transfers.filter((t) => t.status === "PROCESSING" || t.status === "SENT" || t.status === "UNKNOWN").length;
  const time = new Date(state.now).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-panel">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Cleared home">
              <Wordmark />
            </Link>
            <span className="hidden h-5 w-px bg-rule sm:block" aria-hidden />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight">Kora Market</p>
              <p className="text-xs text-ink-2">{state.label}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="num hidden text-ink-2 md:inline" suppressHydrationWarning>{time} UTC</span>
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ${mode === "sandbox" ? "bg-clear-bg text-clear" : "bg-hold-bg text-hold"}`}
              title={mode === "sandbox" ? "Payouts go to the Airwallex sandbox" : "Payouts go to a local stand-in for the Airwallex sandbox"}
            >
              {mode === "sandbox" ? "Airwallex sandbox" : "Simulated rail"}
            </span>
            {caps.airwallex && (
              <Button variant="quiet" onClick={() => switchMode(mode === "sandbox" ? "simulation" : "sandbox")}>
                Switch to {mode === "sandbox" ? "simulation" : "Airwallex sandbox"}
              </Button>
            )}
            <Button variant="quiet" onClick={reset}>
              Start over
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 sm:px-6">
        <section aria-label="Run summary" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-4">
            {ORDER.map((o) => {
              const st = OUTCOME_STYLE[o];
              const moves = o === "CLEAR" || o === "REDUCE";
              return (
                <div key={o} className="bg-panel px-4 py-3">
                  <p className={`flex items-center gap-1.5 text-sm font-semibold ${st.fg}`}>
                    <OutcomeGlyph outcome={o} />
                    {st.word}
                  </p>
                  <p className="num mt-1 text-3xl font-bold tracking-tight">{sum[o].count}</p>
                  <p className="num text-sm text-ink-2">{moves ? `${fmtUsd(sum[o].usd)} to send` : "Nothing moves"}</p>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-rule bg-panel px-4 py-3">
            <div>
              <p className="text-sm text-ink-2">Wallet {fmtUsd(state.balanceUsd)}, floor {fmtUsd(state.policy.balanceFloorUsd)}</p>
              {ready.length > 0 ? (
                <p className="num mt-1 text-sm">
                  <span className="font-semibold">{ready.length} ready</span>, {fmtUsd(readyUsd)} plus about {fmtUsd(readyFees)} in fees
                </p>
              ) : (
                <p className="mt-1 text-sm font-semibold">
                  {moving > 0 ? `${moving} in flight, ${paid} paid` : paid > 0 ? `${paid} paid. Nothing else is ready.` : "Nothing is ready to send."}
                </p>
              )}
            </div>
            <Button onClick={send} disabled={busy || ready.length === 0} className="w-full py-2.5 text-base">
              {busy ? "Sending…" : ready.length > 0 ? `Send ${ready.length} cleared payout${ready.length === 1 ? "" : "s"}` : "Send cleared payouts"}
            </Button>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <StripBoard state={state} onOpen={setOpen} selected={open} />
          <SidePanel state={state} dispatch={dispatch} readInbound={readInbound} onOpen={setOpen} modelLive={caps.model} />
        </div>

        <Ledger state={state} />

        <p className="pb-6 text-xs text-ink-3">
          Kora Market and its sellers are fictional. {mode === "simulation" ? "Payments in this view go to a local stand-in that behaves like the Airwallex sandbox; no money moves." : "Payments go to the Airwallex sandbox; no real money moves."}
        </p>
      </main>

      {open && <SellerDrawer state={state} lineId={open} dispatch={dispatch} onClose={close} />}
    </div>
  );
}
