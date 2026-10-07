"use client";

import { useState } from "react";
import { Button, OUTCOME_STYLE } from "@/components/ui";
import { fmt } from "@/lib/engine/money";
import { lineTransfers, type Action, type RunState } from "@/lib/engine/run";
import type { ModelReading } from "@/lib/engine/types";

type Tab = "walkthrough" | "approvals" | "inbox" | "sellers";

const FAKE_EMAIL = {
  subject: "Urgent: payout details",
  body:
    "Hello Kora team,\n\nI have changed banks. Please send this week's payout to my new account at Opay, account 812 004 9917, name C. Nwosu Ventures. My Zenith account is closed.\n\nThanks,\nChidi",
};

function Step({
  n,
  title,
  body,
  done,
  children,
}: {
  n: number;
  title: string;
  body: string;
  done?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 py-3">
      <span
        className={`num mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done ? "bg-clear text-white" : "border border-rule text-ink-2"
        }`}
      >
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm text-ink-2">{body}</p>
        </div>
        {children}
      </div>
    </li>
  );
}

export function SidePanel({
  state,
  dispatch,
  readInbound,
  onOpen,
  modelLive,
}: {
  state: RunState;
  dispatch: (a: Action) => void;
  readInbound: (from: string, subject: string, body: string) => Promise<ModelReading>;
  onOpen: (lineId: string) => void;
  modelLive: boolean;
}) {
  const [tab, setTab] = useState<Tab>("walkthrough");
  const pending = state.lines.filter((l) => {
    const d = state.decisions[l.id];
    return d?.checks.some((c) => c.id === "autonomy" && c.status === "fire");
  });
  const tabs: Array<{ key: Tab; label: string; badge?: number }> = [
    { key: "walkthrough", label: "Try it" },
    { key: "approvals", label: "Approvals", badge: pending.length },
    { key: "inbox", label: "Inbox", badge: state.inbound.length || undefined },
    { key: "sellers", label: "Sellers", badge: state.messages.length || undefined },
  ];

  return (
    <section className="rounded-lg border border-rule bg-panel lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto" aria-label="Run tools">
      <div role="tablist" className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-rule-soft bg-panel px-2 py-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-md px-2.5 py-1 text-sm font-medium ${
              tab === t.key ? "bg-ink text-white" : "text-ink-2 hover:bg-rule-soft"
            }`}
          >
            {t.label}
            {t.badge ? <span className="num ml-1.5 opacity-70">{t.badge}</span> : null}
          </button>
        ))}
      </div>
      <div className="px-4 pb-4">
        {tab === "walkthrough" && <Walkthrough state={state} dispatch={dispatch} readInbound={readInbound} onOpen={onOpen} />}
        {tab === "approvals" && <Approvals state={state} dispatch={dispatch} lines={pending.map((l) => l.id)} onOpen={onOpen} />}
        {tab === "inbox" && <Inbox state={state} readInbound={readInbound} modelLive={modelLive} />}
        {tab === "sellers" && <SellerMessages state={state} />}
      </div>
    </section>
  );
}

function Walkthrough({
  state,
  dispatch,
  readInbound,
  onOpen,
}: {
  state: RunState;
  dispatch: (a: Action) => void;
  readInbound: (from: string, subject: string, body: string) => Promise<ModelReading>;
  onOpen: (lineId: string) => void;
}) {
  const [reading, setReading] = useState(false);
  const ada = state.lines.find((l) => l.id === "P-ADA")!;
  const adaOrder = state.orders[ada.orderIds[0]];
  const chidi = state.sellers["s-chidi"];
  const sentAny = state.transfers.length > 0;
  const arjunT = lineTransfers(state, "P-ARJUN");
  const mariaT = lineTransfers(state, "P-MARIA");
  const tunde = state.lines.find((l) => l.id === "P-TUNDE-R");

  return (
    <div>
      <p className="pt-3 text-sm text-ink-2">
        Real things that happen on payout day. Each one changes only the payouts it touches.
      </p>
      <p className="mt-4 text-xs font-semibold text-ink-3">Before you send</p>
      <ol className="divide-y divide-rule-soft">
        <Step
          n={1}
          title="A buyer asks for a refund"
          body={`${adaOrder.item} from Ada's Ankara House, ${fmt(adaOrder.amount, "NGN")}.`}
          done={adaOrder.status !== "DELIVERED"}
        >
          <Button variant="secondary" disabled={adaOrder.status !== "DELIVERED"} onClick={() => dispatch({ type: "REFUND_FILED", orderId: adaOrder.id })}>
            File the refund request
          </Button>
        </Step>
        <Step
          n={2}
          title="An email asks to change bank details"
          body="“Chidi” asks for this week's payout to go to a new account. The model reads it; the code decides."
          done={state.inbound.length > 0}
        >
          <Button
            variant="secondary"
            disabled={reading || !!chidi.beneficiary.pendingChange}
            onClick={async () => {
              setReading(true);
              await readInbound(chidi.email, FAKE_EMAIL.subject, FAKE_EMAIL.body);
              setReading(false);
            }}
          >
            {reading ? "Reading…" : "Deliver the email"}
          </Button>
        </Step>
        <Step
          n={3}
          title="A bank will reject a payment"
          body="Mehta Brass's bank will return the payment because the account name doesn't match."
          done={state.armed.reject === "P-ARJUN" || arjunT.length > 0}
        >
          <Button
            variant="secondary"
            disabled={state.armed.reject === "P-ARJUN" || arjunT.length > 0}
            onClick={() => dispatch({ type: "ARM", kind: "reject", lineId: "P-ARJUN" })}
          >
            {state.armed.reject === "P-ARJUN" ? "Armed for the next send" : "Arm the bank rejection"}
          </Button>
        </Step>
        <Step
          n={4}
          title="The network drops a response"
          body="Airwallex accepts Santos Weaves's payout, but the reply never reaches Cleared."
          done={state.armed.timeout === "P-MARIA" || mariaT.length > 0}
        >
          <Button
            variant="secondary"
            disabled={state.armed.timeout === "P-MARIA" || mariaT.length > 0}
            onClick={() => dispatch({ type: "ARM", kind: "timeout", lineId: "P-MARIA" })}
          >
            {state.armed.timeout === "P-MARIA" ? "Armed for the next send" : "Arm the timeout"}
          </Button>
        </Step>
      </ol>
      <p className="mt-2 text-xs font-semibold text-ink-3">After you send</p>
      <ol className="divide-y divide-rule-soft">
        <Step
          n={5}
          title="Fix the rejected bank details"
          body="Ops corrects the name; Cleared re-validates and retries with a new request ID."
          done={arjunT.length > 1}
        >
          <Button variant="secondary" disabled={!state.sellers["s-arjun"].beneficiary.rejection} onClick={() => onOpen("P-ARJUN")}>
            Open Mehta Brass
          </Button>
        </Step>
        <Step
          n={6}
          title="A return window closes"
          body="Bakare Leatherworks's held amount is no longer at risk, so it's released."
          done={!!tunde}
        >
          <Button
            variant="secondary"
            disabled={!sentAny || !!tunde}
            onClick={() => dispatch({ type: "WINDOW_CLOSED", sellerId: "s-tunde" })}
            title={!sentAny ? "Send the run first" : undefined}
          >
            Close the return window
          </Button>
        </Step>
      </ol>
    </div>
  );
}

function Approvals({
  state,
  dispatch,
  lines,
  onOpen,
}: {
  state: RunState;
  dispatch: (a: Action) => void;
  lines: string[];
  onOpen: (lineId: string) => void;
}) {
  if (lines.length === 0)
    return <p className="py-6 text-sm text-ink-2">Nothing is waiting for approval. Payouts above the limit will appear here.</p>;
  return (
    <ul className="divide-y divide-rule-soft">
      {lines.map((id) => {
        const d = state.decisions[id];
        const s = state.sellers[d.sellerId];
        const amount = d.owed - d.reserve;
        return (
          <li key={id} className="space-y-2 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <button onClick={() => onOpen(id)} className="truncate text-left text-sm font-semibold hover:underline">
                {s.shop}
              </button>
              <span className="num text-sm font-semibold">{fmt(amount, s.currency)}</span>
            </div>
            <p className="text-sm text-ink-2">
              To {s.beneficiary.accountName}, {s.beneficiary.bankName} {s.beneficiary.accountMasked}, by {d.route.kind === "LOCAL" ? "local transfer" : "SWIFT"}.
              Your approval covers exactly this amount and account.
            </p>
            <Button onClick={() => dispatch({ type: "APPROVE", lineId: id })}>Approve {fmt(amount, s.currency)}</Button>
          </li>
        );
      })}
    </ul>
  );
}

function Inbox({
  state,
  readInbound,
  modelLive,
}: {
  state: RunState;
  readInbound: (from: string, subject: string, body: string) => Promise<ModelReading>;
  modelLive: boolean;
}) {
  const sellers = Object.values(state.sellers);
  const [from, setFrom] = useState(sellers[0].email);
  const [subject, setSubject] = useState("Where is my payout?");
  const [body, setBody] = useState("Hi, when will I get paid for last week's orders?");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4 pt-3">
      <p className="text-sm text-ink-2">
        Messages from sellers are read by {modelLive ? "Claude" : "the rules-based reader (add a model key to use Claude)"}. A reading can
        quarantine a payout. It can never release one or change bank details.
      </p>
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await readInbound(from, subject, body);
          setBusy(false);
        }}
      >
        <label className="block text-xs font-medium text-ink-2">
          From
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-md border border-rule bg-panel px-2 py-1.5 text-sm text-ink">
            {sellers.map((s) => (
              <option key={s.id} value={s.email}>
                {s.name} ({s.shop})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-ink-2">
          Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-md border border-rule px-2 py-1.5 text-sm text-ink" />
        </label>
        <label className="block text-xs font-medium text-ink-2">
          Message
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="mt-1 w-full rounded-md border border-rule px-2 py-1.5 text-sm text-ink" />
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Reading…" : "Read message"}
        </Button>
      </form>
      <ul className="divide-y divide-rule-soft">
        {state.inbound.map((m) => (
          <li key={m.id} className="py-3 text-sm">
            <p className="font-semibold">{m.subject}</p>
            <p className="text-ink-2">{m.from}</p>
            {m.reading && (
              <p className="mt-1">
                <span className="font-medium">{m.reading.intent.replaceAll("_", " ").toLowerCase()}</span>{" "}
                <span className="text-ink-2">
                  ({Math.round(m.reading.confidence * 100)}%, read by {m.reading.reader === "claude" ? "Claude" : "rules"})
                </span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SellerMessages({ state }: { state: RunState }) {
  if (state.messages.length === 0)
    return <p className="py-6 text-sm text-ink-2">Sellers hear from Cleared when their payout changes or lands. Nothing sent yet.</p>;
  return (
    <ul className="divide-y divide-rule-soft">
      {state.messages.map((m) => {
        const s = state.sellers[m.sellerId];
        const tone = m.tone === "PAID" ? "text-clear" : m.tone === "INFO" ? "text-ink-2" : OUTCOME_STYLE[m.tone].fg;
        return (
          <li key={m.id} className="py-3 text-sm">
            <p className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{s.name}</span>
              <span className={`text-xs font-medium ${tone}`}>{m.tone === "PAID" ? "Paid" : m.tone === "INFO" ? "Notice" : OUTCOME_STYLE[m.tone].word}</span>
            </p>
            <p className="text-ink-2">{m.text}</p>
          </li>
        );
      })}
    </ul>
  );
}
