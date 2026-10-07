"use client";

import { useState } from "react";
import { DecisionMark, OUTCOME_HEX, OUTCOME_STYLE } from "@/components/ui";
import { fmt } from "@/lib/engine/money";
import { lineTransfers, type RunState } from "@/lib/engine/run";
import type { Outcome, Transfer } from "@/lib/engine/types";

const FILTERS: Array<{ key: Outcome | "ALL"; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "CLEAR", label: "Clear" },
  { key: "REDUCE", label: "Reduce" },
  { key: "HOLD", label: "Hold" },
  { key: "BLOCK", label: "Block" },
];

export function transferLabel(t?: Transfer): { text: string; tone: string } | undefined {
  if (!t) return undefined;
  switch (t.status) {
    case "PROCESSING":
      return { text: "Processing", tone: "text-ink-2" };
    case "SENT":
      return { text: "Sent", tone: "text-hold" };
    case "PAID":
      return { text: "Paid", tone: "text-clear" };
    case "FAILED":
      return { text: "Returned by bank", tone: "text-block" };
    case "UNKNOWN":
      return { text: "No response, checking", tone: "text-reduce" };
  }
}

export function StripBoard({ state, onOpen, selected }: { state: RunState; onOpen: (lineId: string) => void; selected?: string }) {
  const [filter, setFilter] = useState<Outcome | "ALL">("ALL");
  const counts = { ALL: state.lines.length, CLEAR: 0, REDUCE: 0, HOLD: 0, BLOCK: 0 } as Record<Outcome | "ALL", number>;
  for (const d of Object.values(state.decisions)) counts[d.outcome] += 1;
  const lines = state.lines.filter((l) => filter === "ALL" || state.decisions[l.id]?.outcome === filter);

  return (
    <section aria-label="Payouts in this run" className="rounded-lg border border-rule bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft px-4 py-3">
        <h2 className="text-base font-semibold">Payouts</h2>
        <div role="tablist" aria-label="Filter by decision" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
                filter === f.key ? "bg-ink text-white" : "text-ink-2 hover:bg-rule-soft"
              }`}
            >
              {f.label} <span className="num opacity-70">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_0.8fr_1.1fr] gap-4 border-b border-rule-soft px-4 py-2 pl-7 text-xs font-medium text-ink-3 lg:grid">
        <span>Seller</span>
        <span className="text-right">Owed</span>
        <span className="text-right">Kept back</span>
        <span className="text-right">Sends now</span>
        <span>Route</span>
        <span>Decision</span>
      </div>

      <ul className="divide-y divide-rule-soft">
        {lines.map((line) => {
          const d = state.decisions[line.id];
          const seller = state.sellers[line.sellerId];
          if (!d) return null;
          const c = seller.currency;
          const st = OUTCOME_STYLE[d.outcome];
          const latest = lineTransfers(state, line.id).at(-1);
          const tl = transferLabel(latest);
          const changed = state.changed.includes(line.id);
          return (
            <li key={`${line.id}-${d.version}-${d.sendable}`}>
              <button
                onClick={() => onOpen(line.id)}
                aria-label={`${seller.shop}: ${st.word}. ${d.headline}`}
                className={`group relative grid w-full grid-cols-1 gap-2 py-3 pr-4 pl-7 text-left transition-colors hover:bg-wash lg:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_0.8fr_1.1fr] lg:items-center lg:gap-4 ${
                  selected === line.id ? "bg-wash" : ""
                } ${changed ? "strip-changed" : ""}`}
                style={{ ["--flash" as string]: OUTCOME_HEX[d.outcome] }}
              >
                <span className={`absolute inset-y-0 left-0 w-[5px] ${st.bar}`} aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {seller.shop}
                    {line.kind === "RELEASE" && <span className="ml-2 text-xs font-medium text-reduce">Reserve release</span>}
                    {line.id.endsWith("-2") && <span className="ml-2 text-xs font-medium text-block">Duplicate row</span>}
                  </span>
                  <span className="block truncate text-sm text-ink-2">
                    {seller.name}, {seller.country}
                  </span>
                </span>
                <span className="num flex justify-between text-sm lg:block lg:text-right">
                  <span className="text-ink-3 lg:hidden">Owed</span>
                  {fmt(d.owed, c)}
                </span>
                <span className="num flex justify-between text-sm text-ink-2 lg:block lg:text-right">
                  <span className="text-ink-3 lg:hidden">Kept back</span>
                  {d.outcome === "REDUCE" || (d.outcome === "HOLD" && d.reserve > 0) ? fmt(d.reserve, c) : "–"}
                </span>
                <span className="num flex justify-between text-sm font-semibold lg:block lg:text-right">
                  <span className="font-normal text-ink-3 lg:hidden">Sends now</span>
                  {d.sendable > 0 ? fmt(d.sendable, c) : "–"}
                </span>
                <span className="hidden text-sm text-ink-2 lg:block">{d.route.kind === "LOCAL" ? `Local ${c}` : "SWIFT"}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <DecisionMark outcome={d.outcome} size="sm" />
                  {tl && <span className={`text-xs font-medium ${tl.tone}`}>{tl.text}</span>}
                  {!tl && d.outcome !== "CLEAR" && (
                    <span className="w-full truncate text-xs text-ink-2 lg:hidden">{d.headline}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
        {lines.length === 0 && (
          <li className="px-7 py-10 text-sm text-ink-2">No payouts with this decision right now.</li>
        )}
      </ul>
    </section>
  );
}
