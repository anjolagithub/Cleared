"use client";

import { useState } from "react";
import type { RunState } from "@/lib/engine/run";
import type { LedgerKind } from "@/lib/engine/types";

const KIND_LABEL: Record<LedgerKind, string> = {
  observe: "Observed",
  read: "Read",
  decide: "Decided",
  approve: "Approved",
  execute: "Sent",
  reconcile: "Reconciled",
  event: "Event",
  notify: "Told seller",
  human: "Person",
};

const KIND_TONE: Record<LedgerKind, string> = {
  observe: "text-ink-3",
  read: "text-hold",
  decide: "text-tower",
  approve: "text-clear",
  execute: "text-tower",
  reconcile: "text-reduce",
  event: "text-ink-2",
  notify: "text-ink-2",
  human: "text-clear",
};

export function Ledger({ state }: { state: RunState }) {
  const [all, setAll] = useState(false);
  const rows = all ? state.ledger : state.ledger.slice(0, 12);
  return (
    <section aria-labelledby="ledger" className="rounded-lg border border-rule bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-rule-soft px-4 py-3">
        <div>
          <h2 id="ledger" className="text-base font-semibold">
            Decision record
          </h2>
          <p className="text-sm text-ink-2">Every observation, decision and payment, newest first. Nothing is edited after it's written.</p>
        </div>
        <span className="num shrink-0 text-sm text-ink-3">{state.ledger.length} entries</span>
      </div>
      <ol className="divide-y divide-rule-soft">
        {rows.map((e) => (
          <li key={e.id} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 px-4 py-2 text-sm sm:grid-cols-[4.5rem_7rem_6rem_minmax(0,1fr)]">
            <span className="num text-ink-3" suppressHydrationWarning>
              {new Date(e.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" })}
            </span>
            <span className={`font-medium ${KIND_TONE[e.kind]}`}>{KIND_LABEL[e.kind]}<span className="font-normal text-ink-3 sm:hidden">, {e.actor}</span></span>
            <span className="hidden text-ink-2 sm:block">{e.actor}</span>
            <span className="col-span-2 min-w-0 text-ink sm:col-span-1">{e.text}</span>
          </li>
        ))}
      </ol>
      {state.ledger.length > 12 && (
        <div className="border-t border-rule-soft px-4 py-2">
          <button onClick={() => setAll((x) => !x)} className="text-sm font-medium text-tower hover:underline">
            {all ? "Show latest only" : `Show all ${state.ledger.length}`}
          </button>
        </div>
      )}
    </section>
  );
}
