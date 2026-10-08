import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { HeroStrip } from "@/components/HeroStrip";
import { DecisionMark, OUTCOME_STYLE, OutcomeGlyph, Wordmark } from "@/components/ui";
import type { Outcome } from "@/lib/engine/types";

const REPO = "https://github.com/anjolagithub/holdpoint";

const CHECKS: Array<{ name: string; asks: string; leads?: Outcome }> = [
  { name: "Duplicate guard", leads: "BLOCK", asks: "Is any of this money already on its way, or listed twice in the export?" },
  { name: "Bank details", leads: "BLOCK", asks: "Does Airwallex accept these details for this country and currency?" },
  { name: "Bank response", leads: "BLOCK", asks: "Did this bank return our last payment? Then nothing goes until a person fixes it." },
  { name: "Bank-change quarantine", leads: "HOLD", asks: "Did the details change recently, or did someone email asking to change them?" },
  { name: "Refund reserve", leads: "REDUCE", asks: "Which orders can still be returned or disputed, and how much should stay back?" },
  { name: "Approval limit", leads: "HOLD", asks: "Is this bigger than Holdpoint is allowed to send on its own?" },
  { name: "Funding", leads: "HOLD", asks: "Does the wallet stay above its floor after this payout?" },
  { name: "Route", asks: "Local transfer or SWIFT? The cheapest route the details support." },
];

const ANSWERS: Array<{ o: Outcome; line: string }> = [
  { o: "CLEAR", line: "Nothing at risk. The full amount goes today, by the cheapest route." },
  { o: "REDUCE", line: "Send what's safe now. Keep back what a buyer could still claw back, and release it when the window closes." },
  { o: "HOLD", line: "Wait for a person or an event: an approval, a confirmed bank change, money in the wallet." },
  { o: "BLOCK", line: "Never send as is. A duplicate, details the bank rejected, details Airwallex won't accept." },
];

const FACTS: Array<{ figure: string; title: string; body: string; source: string }> = [
  {
    figure: "21%",
    title: "of failed cross-border payments",
    body: "come down to the beneficiary's name or address details, the single most common cause.",
    source: "LexisNexis Risk Solutions, True Impact of Failed Payments, 2023",
  },
  {
    figure: "$12.10",
    title: "average cost of each rejected or repaired payment",
    body: "before counting the seller who is still waiting for their money.",
    source: "LexisNexis Risk Solutions, 2023",
  },
  {
    figure: "$2.8B",
    title: "lost to business email compromise in 2024",
    body: "including the classic “please pay my new account” message.",
    source: "FBI IC3, reported US losses, via Nacha",
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh">
      <div className="bg-tower-deep text-white">
        <header className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <span className="rounded-lg bg-white/95 px-2 py-1">
            <Wordmark className="text-lg" />
          </span>
          <nav className="flex items-center gap-1 text-sm">
            <a href={`${REPO}/blob/main/docs/PRD.md`} className="hidden rounded-lg px-3 py-2 font-medium text-white/75 hover:bg-white/10 sm:inline-block">
              Product brief
            </a>
            <Link href="/run" className="rounded-lg bg-white px-3.5 py-2 font-semibold text-tower-deep hover:bg-[#e6f4ee]">
              Open the payout run
            </Link>
          </nav>
        </header>

        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-12 pb-24 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-28">
          <div>
            <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm text-white/80 ring-1 ring-white/15">
              Payout autopilot for marketplaces on Airwallex
            </p>
            <h1 className="mt-6 text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance sm:text-[4.25rem]">
              Pay sellers every day.
            </h1>
            <p className="mt-6 max-w-[32rem] text-lg leading-relaxed text-white/70">
              Holdpoint checks every payout for open refunds, changed bank details and duplicates. The safe ones go through Airwallex on their own. Only the rest wait for a person.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/run" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-bold text-tower-deep hover:bg-[#e6f4ee]">
                Open the payout run
                <ArrowRight weight="bold" className="h-4 w-4" aria-hidden />
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
        {/* The cost of getting it wrong: stacked figures, each with its source. */}
        <section className="bg-panel">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.4fr]">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">Payout tools send what you tell them to.</h2>
              <p className="mt-4 max-w-[28rem] text-ink-2">
                None of them asks whether this payout should go out right now, in full, to this account.
              </p>
            </div>
            <dl className="divide-y divide-rule">
              {FACTS.map((f) => (
                <div key={f.figure} className="grid gap-x-8 gap-y-1 py-6 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <dt className="num text-4xl font-extrabold tracking-[-0.03em] text-tower">{f.figure}</dt>
                  <dd>
                    <p className="font-semibold">{f.title}</p>
                    <p className="mt-1 text-ink-2">{f.body}</p>
                    <p className="mt-2 text-xs text-ink-3">{f.source}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* The checks, rendered as the same strips the product uses. */}
        <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">Eight checks, in order, on every payout.</h2>
              <p className="mt-4 max-w-[28rem] text-ink-2">
                Each check is plain code with a written reason. The strictest result wins: block, then hold, then reduce, then clear.
              </p>
            </div>
            <ol className="space-y-2 rounded-xl bg-bay p-3">
              {CHECKS.map((c, i) => {
                const st = c.leads ? OUTCOME_STYLE[c.leads] : undefined;
                return (
                  <li
                    key={c.name}
                    className="grid grid-cols-[2.75rem_minmax(0,1fr)_6.5rem] overflow-hidden rounded-lg border border-rule bg-panel shadow-[0_6px_14px_-12px_rgba(19,34,48,0.5)]"
                  >
                    <span className="num flex items-center justify-center border-r border-rule-soft text-sm font-bold text-ink-3">{i + 1}</span>
                    <div className="px-4 py-3">
                      <p className="font-semibold">{c.name}</p>
                      <p className="mt-0.5 text-sm text-ink-2">{c.asks}</p>
                    </div>
                    <span className={`flex flex-col items-center justify-center gap-1 text-xs font-bold ${st ? `${st.bar} text-white` : "bg-wash text-ink-2"}`}>
                      {c.leads ? <OutcomeGlyph outcome={c.leads} className="h-4 w-4" /> : null}
                      {c.leads ? `Can ${st!.word.toLowerCase()}` : "Picks route"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Four outcomes on the tower colour. */}
        <section className="bg-tower-deep text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">Four possible answers, each with its reason.</h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-xl bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
              {ANSWERS.map((a) => (
                <div key={a.o} className="bg-tower-deep p-6">
                  <DecisionMark outcome={a.o} />
                  <p className="mt-4 text-sm leading-relaxed text-white/75">{a.line}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The real product, full width. */}
        <section className="overflow-hidden bg-bay">
          <div className="mx-auto max-w-6xl px-5 pt-20 sm:px-8">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">One screen for payout day.</h2>
            <p className="mt-4 max-w-[34rem] text-ink-2">
              What can move, what is kept back and why, in bays your ops team can read at a glance.
            </p>
            <div className="mt-10 overflow-hidden rounded-t-xl border border-b-0 border-rule shadow-[0_30px_80px_-40px_rgba(15,42,68,0.55)]">
              <Image
                src="/run-preview.png"
                alt="The Holdpoint payout run: money that can move today, split by decision, above bays of payout strips."
                width={1440}
                height={900}
                className="block h-auto w-full"
                loading="eager"
              />
            </div>
          </div>
        </section>

        {/* Where it sits: one flow, Holdpoint first. */}
        <section className="bg-panel">
          <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
            <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              The model reads. The code decides. Airwallex moves the money.
            </h2>
            <ol className="mt-12 grid overflow-hidden rounded-xl border border-rule md:grid-cols-[1.3fr_1fr_1fr]">
              <li className="bg-tower-deep p-7 text-white">
                <p className="text-sm text-white/60">Before the money moves</p>
                <p className="mt-1 text-2xl font-bold">Holdpoint</p>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  Reads seller emails, runs eight checks and decides what may go, how much, and by which route.
                </p>
              </li>
              <li className="border-t border-rule p-7 md:border-t-0 md:border-l">
                <p className="text-sm text-ink-3">While it moves</p>
                <p className="mt-1 text-2xl font-bold">Airwallex</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">Converts and pays out locally, with a request ID that can only land once.</p>
              </li>
              <li className="border-t border-rule p-7 md:border-t-0 md:border-l">
                <p className="text-sm text-ink-3">After it lands</p>
                <p className="mt-1 text-2xl font-bold">Your books</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">Every decision and transfer is on record for reconciliation.</p>
              </li>
            </ol>

            <div className="mt-20 space-y-5 text-2xl leading-snug font-bold tracking-tight sm:text-[2rem]">
              <p>
                The AI never edits bank details.{" "}
                <span className="text-ink-3">An email can pause a payout. Only a person changes where money goes.</span>
              </p>
              <p>
                Nothing is paid twice.{" "}
                <span className="text-ink-3">No reply from Airwallex means unknown, so Holdpoint looks the payment up first.</span>
              </p>
              <p>
                Every decision is written down. <span className="text-ink-3">What was seen, what fired, who approved, what was sent.</span>
              </p>
            </div>
          </div>
        </section>

        <section className="bg-tower-deep text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-14 sm:px-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Run a payout day yourself.</h2>
              <p className="mt-1 text-white/70">Fourteen payouts, eight countries, and the things that go wrong on a real Friday.</p>
            </div>
            <Link href="/run" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-bold text-tower-deep hover:bg-[#e6f4ee]">
              Open the payout run
              <ArrowRight weight="bold" className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-tower-deep">
        <p className="mx-auto max-w-6xl border-t border-white/10 px-5 py-8 text-sm text-white/50 sm:px-8">
          Built for the Airwallex Agentic Banking Hackathon. Kora Market and its sellers are fictional.
        </p>
      </footer>
    </div>
  );
}
