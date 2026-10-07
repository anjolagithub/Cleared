"use client";

import { useEffect, useMemo, useState } from "react";
import { DecisionMark, OUTCOME_STYLE } from "@/components/ui";
import { fmt } from "@/lib/engine/money";
import { initialState } from "@/lib/engine/run";

/**
 * One real payout from the demo run, evaluated by the real engine, revealed
 * check by check. This is the page's single orchestrated motion moment.
 */
export function HeroStrip() {
  const { d, seller } = useMemo(() => {
    const s = initialState("simulation");
    const d = s.decisions["P-LENA"];
    return { d, seller: s.sellers[d.sellerId] };
  }, []);
  const checks = d.checks;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(checks.length + 1);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setShown(i);
      if (i > checks.length) clearInterval(t);
    }, 420);
    return () => clearInterval(t);
  }, [checks.length]);

  const done = shown > checks.length;
  const c = seller.currency;
  const st = OUTCOME_STYLE[d.outcome];

  return (
    <figure className="relative overflow-hidden rounded-xl border border-rule bg-panel shadow-[0_24px_60px_-36px_rgba(19,34,48,0.5)]">
      <span
        className={`absolute inset-y-0 left-0 w-[7px] transition-colors duration-500 ${done ? st.bar : "bg-rule"}`}
        aria-hidden
      />
      <div className="border-b border-rule-soft py-4 pr-5 pl-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold tracking-tight">{seller.shop}</p>
            <p className="text-sm text-ink-2">
              {seller.name}, {seller.country}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-3">Owed this week</p>
            <p className="num text-lg font-bold">{fmt(d.owed, c)}</p>
          </div>
        </div>
      </div>
      <ol className="py-2 pr-5 pl-7" aria-live="polite">
        {checks.map((ch, i) => {
          const visible = i < shown;
          const fired = ch.status === "fire";
          return (
            <li
              key={ch.id}
              className={`flex items-baseline gap-3 py-1.5 text-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-25"}`}
            >
              <span
                className={`h-2 w-2 shrink-0 translate-y-[-1px] rounded-full ${
                  !visible ? "bg-rule" : ch.status === "pass" ? "bg-clear" : ch.status === "info" ? "bg-ink-3" : "bg-reduce"
                }`}
                aria-hidden
              />
              <span className={`w-40 shrink-0 font-medium ${fired && visible ? "text-reduce" : ""}`}>{ch.label}</span>
              <span className="hidden min-w-0 truncate text-ink-2 sm:block">
                {visible ? (fired ? "Keep back the disputed order" : ch.status === "info" ? `Local EUR, ${d.route.etaDays}` : "Passed") : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <figcaption
        className={`flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft py-4 pr-5 pl-7 transition-opacity duration-500 ${
          done ? "opacity-100" : "opacity-0"
        }`}
      >
        <DecisionMark outcome={d.outcome} size="lg" />
        <p className="num text-sm">
          Send <span className="font-bold">{fmt(d.sendable, c)}</span> now, keep <span className="font-bold">{fmt(d.reserve, c)}</span> until
          the dispute closes.
        </p>
      </figcaption>
    </figure>
  );
}
