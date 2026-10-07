"use client";

import { OUTCOME_HEX, OUTCOME_STYLE, OutcomeGlyph } from "@/components/ui";
import { fmt, fmtUsd } from "@/lib/engine/money";
import { lineTransfers, type RunState } from "@/lib/engine/run";
import type { Decision, Outcome, Seller, Transfer } from "@/lib/engine/types";

const BAYS: Array<{ o: Outcome; title: string; note: string }> = [
  { o: "CLEAR", title: "Cleared", note: "Goes in full" },
  { o: "REDUCE", title: "Reduced", note: "Part goes, the rest is kept back" },
  { o: "HOLD", title: "Holding", note: "Waits for a person or an event" },
  { o: "BLOCK", title: "Blocked", note: "Will not be sent as it is" },
];

const AVATAR_TONES = ["#1d3a57", "#5b3a8c", "#0f6a74", "#8a4b1f", "#3c5a1e", "#7a2945", "#2c4a8a"];

export function SellerMark({ seller, size = 36 }: { seller: Seller; size?: number }) {
  const initials = seller.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const tone = AVATAR_TONES[seller.id.length % AVATAR_TONES.length];
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }} aria-hidden>
      <span
        className="inline-flex h-full w-full items-center justify-center rounded-full text-[13px] font-bold text-white"
        style={{ background: tone }}
      >
        {initials}
      </span>
      <span className="absolute -right-1 -bottom-1 rounded-[4px] border border-white bg-panel px-[3px] text-[9px] leading-[13px] font-bold text-ink">
        {seller.countryCode}
      </span>
    </span>
  );
}

export function transferLabel(t?: Transfer): { text: string; tone: string } | undefined {
  if (!t) return undefined;
  switch (t.status) {
    case "PROCESSING":
      return { text: "Processing", tone: "text-ink-2" };
    case "SENT":
      return { text: "On its way", tone: "text-hold" };
    case "PAID":
      return { text: "Paid", tone: "text-clear" };
    case "FAILED":
      return { text: "Returned by bank", tone: "text-block" };
    case "UNKNOWN":
      return { text: "No reply, checking", tone: "text-reduce" };
  }
}

export function reasonOf(d: Decision): string {
  if (d.outcome === "CLEAR") return "All checks passed";
  const fired = d.checks.find((c) => c.status === "fire" && c.outcome === d.outcome);
  return fired ? fired.detail : d.headline;
}

function Strip({ state, lineId, selected, onOpen }: { state: RunState; lineId: string; selected: boolean; onOpen: () => void }) {
  const line = state.lines.find((l) => l.id === lineId)!;
  const d = state.decisions[lineId];
  const s = state.sellers[line.sellerId];
  const c = s.currency;
  const st = OUTCOME_STYLE[d.outcome];
  const t = lineTransfers(state, lineId).at(-1);
  const tl = transferLabel(t);
  const changed = state.changed.includes(lineId);
  const tag = line.kind === "RELEASE" ? "Reserve release" : line.id.endsWith("-2") ? "Duplicate row" : undefined;

  return (
    <li>
      <button
        onClick={onOpen}
        aria-label={`${s.shop}: ${st.word}. ${reasonOf(d)}`}
        className={`group grid w-full grid-cols-1 overflow-hidden md:grid-cols-[4.25rem_minmax(0,1fr)] rounded-md border bg-panel text-left shadow-[0_1px_0_rgba(19,34,48,0.06),0_6px_14px_-12px_rgba(19,34,48,0.5)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_1px_0_rgba(19,34,48,0.06),0_14px_24px_-16px_rgba(19,34,48,0.55)] ${
          selected ? "border-tower" : "border-rule"
        } ${changed ? "strip-changed" : ""}`}
        style={{ ["--flash" as string]: OUTCOME_HEX[d.outcome] }}
      >
        {/* The strip holder: its colour is the decision. */}
        <span className={`flex items-center gap-1.5 px-3.5 py-1 text-white md:flex-col md:justify-center md:gap-1 md:px-0 md:py-0 ${st.bar}`}>
          <OutcomeGlyph outcome={d.outcome} className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="text-[11px] font-bold">{st.word}</span>
        </span>

        <span className="grid min-w-0 grid-cols-1 divide-y divide-rule-soft md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.9fr))_minmax(0,1.5fr)] md:divide-y-0">
          <span className="flex min-w-0 items-center gap-3 px-3.5 py-3">
            <SellerMark seller={s} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{s.shop}</span>
              <span className="flex items-center gap-2 text-[13px] text-ink-2">
                {tag ? (
                  <span className={`shrink-0 rounded px-1.5 text-[11px] font-semibold ${tag === "Duplicate row" ? "bg-block-bg text-block" : "bg-reduce-bg text-reduce"}`}>
                    {tag}
                  </span>
                ) : (
                  <span className="truncate">{s.country}</span>
                )}
              </span>
            </span>
          </span>

          <span className="grid grid-cols-3 divide-rule-soft max-md:divide-x md:contents">
            <Cell label="Owed" value={fmt(d.owed, c)} />
            <Cell label="Kept back" value={d.reserve > 0 && d.outcome !== "CLEAR" && d.outcome !== "BLOCK" ? fmt(d.reserve, c) : "–"} muted />
            <Cell label="Sends now" value={d.sendable > 0 ? fmt(d.sendable, c) : "–"} strong />
          </span>

          <span className="flex min-w-0 flex-col justify-center border-rule-soft px-3.5 py-2.5 md:border-l">
            <span className={`line-clamp-2 text-[13px] leading-snug ${d.outcome === "CLEAR" ? "text-ink-2" : st.fg}`}>{reasonOf(d)}</span>
            <span className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3">
              <span>{d.route.kind === "LOCAL" ? `Local ${c}` : "SWIFT"}</span>
              {tl && (
                <>
                  <span aria-hidden className="h-1 w-1 rounded-full bg-rule" />
                  <span className={`font-semibold ${tl.tone}`}>{tl.text}</span>
                </>
              )}
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

function Cell({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col justify-center border-rule-soft px-2.5 py-2 md:border-l md:px-3.5 md:py-2.5">
      <span className="text-[11px] text-ink-3">{label}</span>
      <span className={`num truncate text-[13px] md:text-[15px] ${strong ? "font-bold text-ink" : muted ? "text-ink-2" : "font-medium"}`}>{value}</span>
    </span>
  );
}

export function StripBoard({ state, onOpen, selected }: { state: RunState; onOpen: (lineId: string) => void; selected?: string }) {
  return (
    <section aria-label="Payout bays" className="space-y-6">
      {BAYS.map((bay) => {
        const ids = state.lines.filter((l) => state.decisions[l.id]?.outcome === bay.o).map((l) => l.id);
        const st = OUTCOME_STYLE[bay.o];
        const usd = ids.reduce((a, id) => {
          const d = state.decisions[id];
          return a + (bay.o === "CLEAR" || bay.o === "REDUCE" ? d.sendableUsd : d.owed / d.route.rateToUsd);
        }, 0);
        return (
          <div key={bay.o}>
            <div className="mb-2 flex items-end justify-between gap-3 px-1">
              <h2 className="flex items-baseline gap-2">
                <span className={`text-lg font-bold tracking-tight ${st.fg}`}>{bay.title}</span>
                <span className="num rounded-full bg-panel px-2 text-sm font-semibold text-ink-2">{ids.length}</span>
                <span className="hidden text-sm text-ink-3 sm:inline">{bay.note}</span>
              </h2>
              <span className="num text-sm font-semibold text-ink-2">
                {fmtUsd(usd)} {bay.o === "CLEAR" || bay.o === "REDUCE" ? "moves" : "stays"}
              </span>
            </div>
            {ids.length === 0 ? (
              <p className="rounded-md border border-dashed border-rule px-4 py-4 text-sm text-ink-3">Empty bay.</p>
            ) : (
              <ul className="space-y-2">
                {ids.map((id) => (
                  <Strip key={id} state={state} lineId={id} selected={selected === id} onOpen={() => onOpen(id)} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
