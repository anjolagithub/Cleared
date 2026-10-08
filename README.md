# Holdpoint

**Pay sellers every day. Hold only what needs a person.**

Holdpoint is a payout autopilot for marketplaces that pay sellers across borders on Airwallex. It checks every seller payout before it reaches the Airwallex Transfers API, sends the safe ones on its own, and stops the rest with a reason anyone can read: **Clear**, **Reduce**, **Hold** or **Block**.

The name comes from aviation. A holding point is the painted line where an aircraft waits until the tower clears it onto the runway. Most payouts roll straight through; a few wait at the line.

Built for the Airwallex Agentic Banking Hackathon.

- **Live demo:** import this repo at vercel.com/new (no settings or keys needed)
- **Product brief:** [docs/PRD.md](docs/PRD.md) · **User flows:** [docs/USER_FLOWS.md](docs/USER_FLOWS.md) · **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Policy:** [docs/POLICY.md](docs/POLICY.md) · **Safety:** [docs/SAFETY.md](docs/SAFETY.md) · **Airwallex integration:** [docs/AIRWALLEX.md](docs/AIRWALLEX.md)
- **Demo script:** [docs/DEMO.md](docs/DEMO.md) · **Decisions:** [docs/DECISIONS.md](docs/DECISIONS.md)

## Why it matters

Marketplaces want to pay sellers fast and often: sellers stay, list more and sell more, and more money moves. What stops them is risk. Every run has a few payouts that shouldn't go yet, so a person reviews **all** of them, and payouts slow to once a week.

Three things go wrong:

1. **Money that comes back.** A buyer returns the item after the seller was paid in full.
2. **The wrong account.** Bad bank details, or a fake "please pay my new account" email.
3. **Paying twice.** A request times out, someone retries, the seller is paid twice.

Payout tools send what you tell them to. Holdpoint decides whether each payout should go out right now, and how much, so that the safe majority can go out with nobody reviewing them. In the demo run, **10 of 14 payouts go out on their own**; the other 4 wait, each with its reason.

## How it decides

Eight checks on every payout. The strictest result wins (Block over Hold over Reduce over Clear).

| Check | Can lead to |
|---|---|
| Duplicate guard | Block |
| Bank details (Airwallex validation) | Block |
| Bank response (previous payment returned) | Block |
| Bank-change quarantine | Hold |
| Refund reserve (returns, refunds, disputes) | Reduce, or Hold if everything is at risk |
| Approval limit | Hold until a person approves |
| Funding (wallet floor) | Hold |
| Route (local vs SWIFT) | Picks the cheapest route the details support |

**The model reads. The code decides. Airwallex moves the money.** Claude (or a rules-based reader) turns seller emails into an intent with a quoted sentence. That can pause a payout. It can never release one or change bank details. Full rules in [docs/POLICY.md](docs/POLICY.md).

## Where it sits

| | Answers |
|---|---|
| **Holdpoint**, before money moves | Should this payout go now, in full, to this account? |
| **Airwallex Transfers**, while it moves | Can it be sent, and did it land? |
| **Leapfin / the books**, after it lands | How is it recorded? |

Airwallex's Marketplace Settlement starter kit sets seller reserves and pays net. Holdpoint's refund reserve is one of eight checks; the other seven (fake bank changes, duplicates, bank rejections, timeouts without double pay, approval limits, funding floor, route) decide whether each payout should move at all. Holdpoint runs on a plain Airwallex sandbox account: transfers, beneficiaries, validation and balances, no platform access needed.

## Try the demo

Open the payout run and use **Payout day**:

1. A buyer asks for a refund: one seller moves from Clear to Reduce, and nothing else is re-checked.
2. An email asks to change bank details: the seller is held; the details are untouched.
3. Arm a bank rejection and a dropped response, approve the large payout, then **Send**.
4. The rejected payout is blocked until someone fixes it; the timed-out one is found by its request ID, with no second payment.
5. Fix the bank details: re-validated and retried with a new request ID.
6. Close a return window: the reserve that was kept back is released.

Kora Market and its sellers are fictional.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine and rail safety tests
```

### Modes

Without keys, payouts go to a simulated rail that behaves like the Airwallex sandbox (reused request IDs rejected, responses can be lost, transfers move Processing → Sent → Paid or Failed). Copy `.env.example` to `.env.local` to enable:

| Variable | Effect |
|---|---|
| `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY` | Adds an "Airwallex sandbox" mode that sends real sandbox transfers |
| `AIRWALLEX_BENEFICIARY_MAP` | Maps demo sellers to sandbox beneficiary IDs |
| `ANTHROPIC_API_KEY` | Seller emails are read by Claude instead of rules |

The sandbox adapter is written against Airwallex's public API reference and has not yet been run against a live sandbox account. See [docs/AIRWALLEX.md](docs/AIRWALLEX.md).

## Team

- **Anjola Adeyemi:** product, policy engine, Airwallex integration, app
- **GRAMMYboy:** controls (dry run, reconciliation that halts on drift, proof view) and the reserve and route optimiser, adapted from his Ringfence design
