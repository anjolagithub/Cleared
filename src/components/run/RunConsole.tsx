"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Wordmark } from "@/components/ui";
import { fmtUsd } from "@/lib/engine/money";
import { sendableLines, type RunState } from "@/lib/engine/run";
import { useRun } from "@/lib/use-run";
import { Ledger } from "./Ledger";
import { SellerDrawer } from "./SellerDrawer";
import { SidePanel } from "./SidePanel";
import { StripBoard } from "./StripBoard";

function runway(state: RunState) {
  const seg = { clear: 0, reduceSend: 0, kept: 0, hold: 0, block: 0 };
  for (const d of Object.values(state.decisions)) {
    const rate = d.route.rateToUsd;
    if (d.outcome === "CLEAR") seg.clear += d.sendableUsd;
    else if (d.outcome === "REDUCE") {
      seg.reduceSend += d.sendableUsd;
      seg.kept += d.reserve / rate;
    } else if (d.outcome === "HOLD") seg.hold += d.owed / rate;
    else seg.block += d.owed / rate;
  }
  const total = seg.clear + seg.reduceSend + seg.kept + seg.hold + seg.block;
  return { ...seg, total, moves: seg.clear + seg.reduceSend };
}

const SEGMENTS: Array<{ key: "clear" | "reduceSend" | "kept" | "hold" | "block"; label: string; color: string }> = [
  { key: "clear", label: "Cleared", color: "#22a374" },
  { key: "reduceSend", label: "Reduced, sending", color: "#7fcfae" },
  { key: "kept", label: "Kept back", color: "#d88a26" },
  { key: "hold", label: "Holding", color: "#5b8be0" },
  { key: "block", label: "Blocked", color: "#e0594d" },
];

export function RunConsole() {
  const { state, dispatch, send, busy, mode, switchMode, caps, reset, readInbound } = useRun();
  const [open, setOpen] = useState<string | undefined>();
  const close = useCallback(() => setOpen(undefined), []);
  const r = runway(state);
  const decisions = Object.values(state.decisions);
  // The growth number: payouts Holdpoint can send on its own, with no one reviewing them.
  const auto = decisions.filter((d) => d.outcome === "CLEAR" || d.outcome === "REDUCE").length;
  const ready = sendableLines(state);
  const readyUsd = ready.reduce((a, l) => a + state.decisions[l.id].sendableUsd, 0);
  const readyFees = ready.reduce((a, l) => a + state.decisions[l.id].route.feeUsd, 0);
  const paidUsd = state.transfers.filter((t) => t.status === "PAID").reduce((a, t) => a + t.sourceUsd, 0);
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
    <div className="min-h-dvh bg-bay">
      {/* Control tower */}
      <header className="relative overflow-hidden bg-tower-deep text-white">
        <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-4">
              <Link href="/" aria-label="Holdpoint home" className="rounded-lg bg-white/95 px-2 py-1">
                <Wordmark />
              </Link>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-tight">Kora Market</p>
                <p className="text-xs text-white/60">{state.label}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="num hidden text-white/60 md:inline" suppressHydrationWarning>
                {time} UTC
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${mode === "sandbox" ? "bg-[#22a374]/20 text-[#8fe3c0]" : "bg-white/10 text-white/80"}`}
                title={mode === "sandbox" ? "Payouts go to the Airwallex sandbox" : "Payouts go to a local stand-in for the Airwallex sandbox"}
              >
                {mode === "sandbox" ? "Airwallex sandbox" : "Simulated rail"}
              </span>
              {caps.airwallex && (
                <button className="rounded-lg px-2.5 py-1.5 font-medium text-white/80 hover:bg-white/10" onClick={() => switchMode(mode === "sandbox" ? "simulation" : "sandbox")}>
                  Use {mode === "sandbox" ? "simulation" : "Airwallex sandbox"}
                </button>
              )}
              <button className="rounded-lg px-2.5 py-1.5 font-medium text-white/80 hover:bg-white/10" onClick={reset}>
                Start over
              </button>
            </div>
          </div>

          <div className="grid gap-6 pt-6 pb-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div>
              <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
                <div>
                  <p className="text-sm text-white/60">Can move today</p>
                  <p className="num mt-1 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
                    {fmtUsd(r.moves)}
                    <span className="ml-2 text-xl font-semibold tracking-normal text-white/50 sm:text-2xl">of {fmtUsd(r.total)} owed</span>
                  </p>
                </div>
                <div className="border-l-2 border-[#22a374] pl-4">
                  <p className="text-sm text-white/60">Go out with no one reviewing</p>
                  <p className="num mt-1 text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">
                    {auto} <span className="text-lg font-semibold text-white/50">of {decisions.length} payouts</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-white/10" role="img" aria-label="How the money owed is split by decision">
                {SEGMENTS.map((s) => {
                  const w = r.total ? (r[s.key] / r.total) * 100 : 0;
                  return w > 0 ? (
                    <span key={s.key} className="h-full transition-[width] duration-700 ease-out first:rounded-l-full last:rounded-r-full" style={{ width: `${w}%`, background: s.color }} />
                  ) : null;
                })}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                {SEGMENTS.map((s) => (
                  <li key={s.key} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
                    <span className="text-white/70">{s.label}</span>
                    <span className="num font-semibold">{fmtUsd(r[s.key])}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-white/[0.07] p-4 ring-1 ring-white/10">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-white/55">Wallet</dt>
                  <dd className="num font-semibold">{fmtUsd(state.balanceUsd)}</dd>
                </div>
                <div>
                  <dt className="text-white/55">Floor</dt>
                  <dd className="num font-semibold">{fmtUsd(state.policy.balanceFloorUsd)}</dd>
                </div>
                <div>
                  <dt className="text-white/55">Paid so far</dt>
                  <dd className="num font-semibold">
                    {fmtUsd(paidUsd)} <span className="font-normal text-white/55">({paid})</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-white/55">In flight</dt>
                  <dd className="num font-semibold">{moving}</dd>
                </div>
              </dl>
              <button
                onClick={send}
                disabled={busy || ready.length === 0}
                className="mt-4 w-full rounded-lg bg-white px-4 py-3 text-base font-bold text-tower-deep transition-colors hover:bg-[#e6f4ee] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/50"
              >
                {busy ? "Sending…" : ready.length > 0 ? `Send ${ready.length} cleared payout${ready.length === 1 ? "" : "s"}` : moving > 0 ? "Payouts in flight" : "Nothing ready to send"}
              </button>
              <p className="num mt-2 text-center text-xs text-white/55">
                {ready.length > 0 ? `${fmtUsd(readyUsd)} plus about ${fmtUsd(readyFees)} in fees` : "Held and blocked payouts never move."}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-8 px-4 py-7 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <StripBoard state={state} onOpen={setOpen} selected={open} />
          <SidePanel state={state} dispatch={dispatch} readInbound={readInbound} onOpen={setOpen} modelLive={caps.model} />
        </div>

        <Ledger state={state} />

        <p className="pb-6 text-xs text-ink-3">
          Kora Market and its sellers are fictional.{" "}
          {mode === "simulation"
            ? "Payments in this view go to a local stand-in that behaves like the Airwallex sandbox; no money moves."
            : "Payments go to the Airwallex sandbox; no real money moves."}
        </p>
      </main>

      {open && <SellerDrawer state={state} lineId={open} dispatch={dispatch} onClose={close} />}
    </div>
  );
}
