import Link from "next/link";
import { HeroStrip } from "@/components/HeroStrip";
import { DecisionMark, Wordmark } from "@/components/ui";
import type { Outcome } from "@/lib/engine/types";

const REPO = "https://github.com/anjolagithub/cleared";

const CHECKS: Array<{ name: string; asks: string }> = [
  { name: "Duplicate guard", asks: "Is any of this money already on its way, or listed twice in the export?" },
  { name: "Bank details", asks: "Does Airwallex accept these details for this country and currency?" },
  { name: "Bank response", asks: "Did this bank return our last payment? Then nothing goes until a person fixes it." },
  { name: "Bank-change quarantine", asks: "Did the details change recently, or did someone email asking to change them?" },
  { name: "Refund reserve", asks: "Which orders can still be returned or disputed, and how much should stay back?" },
  { name: "Approval limit", asks: "Is this bigger than Cleared is allowed to send on its own?" },
  { name: "Funding", asks: "Does the wallet stay above its floor after this payout?" },
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
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark className="text-lg" />
        <nav className="flex items-center gap-1 text-sm">
          <a href={`${REPO}/blob/main/docs/PRD.md`} className="hidden rounded-md px-3 py-2 font-medium text-ink-2 hover:bg-rule-soft sm:inline-block">
            Product brief
          </a>
          <Link href="/run" className="rounded-md bg-tower px-3.5 py-2 font-semibold text-white hover:bg-tower-hi">
            Open the payout run
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <h1 className="text-[2.6rem] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance sm:text-6xl">
              Every payout cleared before it moves.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-2">
              Cleared sits between your marketplace and Airwallex. Before a seller is paid, it checks for refunds still in play, bank details
              that just changed and money already on its way, then clears, reduces, holds or blocks the payout with a reason anyone can read.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/run" className="rounded-md bg-tower px-5 py-3 font-semibold text-white hover:bg-tower-hi">
                Open the payout run
              </Link>
              <a href={REPO} className="rounded-md border border-rule bg-panel px-5 py-3 font-semibold hover:border-ink-3">
                See the code
              </a>
            </div>
          </div>
          <HeroStrip />
        </section>

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
            <ol className="divide-y divide-rule rounded-xl border border-rule bg-panel">
              {CHECKS.map((c, i) => (
                <li key={c.name} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 px-5 py-4">
                  <span className="num pt-0.5 text-sm font-semibold text-ink-3">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="mt-0.5 text-sm text-ink-2">{c.asks}</p>
                  </div>
                </li>
              ))}
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
