import Link from "next/link";
import { HeroStrip } from "@/components/HeroStrip";
import { DecisionMark, OUTCOME_STYLE, OutcomeGlyph, Wordmark } from "@/components/ui";
import type { Outcome } from "@/lib/engine/types";

const REPO = "https://github.com/anjolagithub/cleared";

const CHECKS: Array<{ name: string; asks: string; leads?: Outcome }> = [
  { name: "Duplicate guard", leads: "BLOCK", asks: "Is any of this money already on its way, or listed twice in the export?" },
  { name: "Bank details", leads: "BLOCK", asks: "Does Airwallex accept these details for this country and currency?" },
  { name: "Bank response", leads: "BLOCK", asks: "Did this bank return our last payment? Then nothing goes until a person fixes it." },
  { name: "Bank-change quarantine", leads: "HOLD", asks: "Did the details change recently, or did someone email asking to change them?" },
  { name: "Refund reserve", leads: "REDUCE", asks: "Which orders can still be returned or disputed, and how much should stay back?" },
  { name: "Approval limit", leads: "HOLD", asks: "Is this bigger than Cleared is allowed to send on its own?" },
  { name: "Funding", leads: "HOLD", asks: "Does the wallet stay above its floor after this payout?" },
  { name: "Route", asks: "Local transfer or SWIFT? The cheapest route the details support." },
];

const ANSWERS: Array<{ o: Outcome; line: string }> = [
  { o: "CLEAR", line: "Nothing at risk. The full amount goes today, by the cheapest route." },
  { o: "REDUCE", line: "Send what's safe now. Keep back what a buyer could still claw back, and release it when the window closes." },
  { o: "HOLD", line: "Wait for a person or an event: an approval, a confirmed bank change, money in the wallet." },
  { o: "BLOCK", line: "Never send as is. A duplicate, details the bank rejected, details Airwallex won't accept." },
];

export default function Home() {
  return (
    <div className="min-h-dvh">
      <div className="relative overflow-hidden bg-tower-deep text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 88px), repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 88px)",
          }}
        />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <span className="rounded-md bg-white/95 px-2 py-1">
            <Wordmark className="text-lg" />
          </span>
          <nav className="flex items-center gap-1 text-sm">
            <a href={`${REPO}/blob/main/docs/PRD.md`} className="hidden rounded-md px-3 py-2 font-medium text-white/75 hover:bg-white/10 sm:inline-block">
              Product brief
            </a>
            <Link href="/run" className="rounded-md bg-white px-3.5 py-2 font-semibold text-tower-deep hover:bg-[#e6f4ee]">
              Open the payout run
            </Link>
          </nav>
        </header>

        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-24 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22a374]" aria-hidden />
              A pre-send gate for marketplace payouts on Airwallex
            </p>
            <h1 className="mt-6 text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance sm:text-[4.25rem]">
              Every payout cleared before it moves.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-white/70">
              Before a seller is paid, Cleared checks for refunds still in play, bank details that just changed and money already on its way.
              Then it clears, reduces, holds or blocks the payout, with a reason anyone can read.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/run" className="rounded-lg bg-white px-5 py-3 font-bold text-tower-deep hover:bg-[#e6f4ee]">
                Open the payout run
              </Link>
              <a href={REPO} className="rounded-lg px-5 py-3 font-semibold text-white ring-1 ring-white/25 hover:bg-white/10">
                See the code
              </a>
            </div>
          </div>
          <div className="text-ink lg:translate-y-6">
            <HeroStrip />
          </div>
        </section>
      </div>

      <main>
        <section className="border-y border-rule bg-panel">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Paying sellers goes wrong in three ways.</h2>
              <p className="mt-4 text-ink-2">
                Payout tools send what you tell them to. None of them asks whether this payout should go out right now, in full.
              </p>
            </div>
            <dl className="grid gap-8 sm:grid-cols-3">
              <div>
                <dt className="font-semibold">Money that comes back</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-2">
                  A buyer returns the item after the seller was paid in full. Clawing it back from another country rarely works.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">The wrong account</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-2">
                  Wrong names and bank details are the most common reason cross-border payments fail. A fake “new account” email is worse.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Paying twice</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-2">
                  A request times out, someone presses retry, the seller is paid twice and the money is hard to get back.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <h2 className="text-3xl font-bold tracking-tight">Eight checks, in order, on every payout.</h2>
              <p className="mt-4 text-ink-2">
                Each check is plain code with a written reason. The strictest result wins: block, then hold, then reduce, then clear.
              </p>
            </div>
            <ol className="space-y-2 rounded-xl bg-bay p-3">
              {CHECKS.map((c, i) => {
                const st = c.leads ? OUTCOME_STYLE[c.leads] : undefined;
                return (
                  <li
                    key={c.name}
                    className="grid grid-cols-[3rem_minmax(0,1fr)_6.5rem] overflow-hidden rounded-md border border-rule bg-panel shadow-[0_6px_14px_-12px_rgba(19,34,48,0.5)]"
                  >
                    <span className="num flex items-center justify-center border-r border-rule-soft text-sm font-bold text-ink-3">{i + 1}</span>
                    <div className="px-4 py-3">
                      <p className="font-semibold">{c.name}</p>
                      <p className="mt-0.5 text-sm text-ink-2">{c.asks}</p>
                    </div>
                    <span
                      className={`flex flex-col items-center justify-center gap-1 text-xs font-bold ${st ? `${st.bar} text-white` : "bg-wash text-ink-2"}`}
                    >
                      {c.leads ? <OutcomeGlyph outcome={c.leads} className="h-4 w-4" /> : null}
                      {c.leads ? `Can ${st!.word.toLowerCase()}` : "Picks route"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight">Four possible answers. Each one comes with its reason.</h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-xl bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
              {ANSWERS.map((a) => (
                <div key={a.o} className="bg-ink p-6">
                  <DecisionMark outcome={a.o} />
                  <p className="mt-4 text-sm leading-relaxed text-white/80">{a.line}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">The model reads. The code decides. Airwallex moves the money.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border-2 border-tower bg-panel p-6">
              <p className="text-sm font-semibold text-tower">Before the money moves</p>
              <p className="mt-2 text-xl font-bold">Cleared</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                Reads seller emails, checks every payout, decides what may go, how much, and by which route.
              </p>
            </div>
            <div className="rounded-xl border border-rule bg-panel p-6">
              <p className="text-sm font-semibold text-ink-2">While it moves</p>
              <p className="mt-2 text-xl font-bold">Airwallex</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                Validates details, converts currency and pays out locally in the seller's country, with a request ID that can only land once.
              </p>
            </div>
            <div className="rounded-xl border border-rule bg-panel p-6">
              <p className="text-sm font-semibold text-ink-2">After it lands</p>
              <p className="mt-2 text-xl font-bold">Your books</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                Every decision and transfer is in the record, ready for reconciliation and audit.
              </p>
            </div>
          </div>
          <ul className="mt-12 grid gap-6 border-t border-rule pt-10 md:grid-cols-3">
            <li>
              <p className="font-semibold">The AI never edits bank details.</p>
              <p className="mt-1 text-sm text-ink-2">An email asking for a new account can pause a payout. Only a person can change where money goes.</p>
            </li>
            <li>
              <p className="font-semibold">Nothing is paid twice.</p>
              <p className="mt-1 text-sm text-ink-2">If Airwallex doesn't answer, the outcome is unknown, not failed. Cleared looks the payment up before doing anything else.</p>
            </li>
            <li>
              <p className="font-semibold">Every decision is written down.</p>
              <p className="mt-1 text-sm text-ink-2">What was seen, what fired, who approved, what was sent. Sellers are told in plain words.</p>
            </li>
          </ul>
        </section>

        <section className="border-t border-rule bg-panel">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-14 sm:px-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Run a payout day yourself.</h2>
              <p className="mt-1 text-ink-2">Fourteen payouts, seven countries, and the things that go wrong on a real Friday.</p>
            </div>
            <Link href="/run" className="rounded-md bg-tower px-5 py-3 font-semibold text-white hover:bg-tower-hi">
              Open the payout run
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-8 text-sm text-ink-3 sm:px-8">
        Built for the Airwallex Agentic Banking Hackathon. Kora Market and its sellers are fictional.
      </footer>
    </div>
  );
}
