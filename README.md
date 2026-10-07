# Cleared

**Every payout cleared before it moves.**

Cleared is a pre-send gate for marketplaces that pay sellers across borders on
Airwallex. Before a payout reaches the Airwallex Transfers API, Cleared checks
it and answers **Clear**, **Reduce**, **Hold** or **Block**, with a reason
anyone can read.

Built for the Airwallex Agentic Banking Hackathon.

- **Live demo:** deploy with one click: import this repo at vercel.com/new (no settings or keys needed)
- **Product brief:** [docs/PRD.md](docs/PRD.md)
- **User flows:** [docs/USER_FLOWS.md](docs/USER_FLOWS.md)
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## The problem

Paying marketplace sellers goes wrong in three ways:

1. **Money that comes back.** A buyer returns the item after the seller was paid in full.
2. **The wrong account.** Bad bank details, or a fake "please pay my new account" email.
3. **Paying twice.** A request times out, someone retries, the seller is paid twice.

Payout tools send what you tell them to. Cleared decides whether a payout
should go out right now, and how much.

## How it decides

Eight checks, in order, on every payout. The strictest result wins.

| Check | Can lead to |
|---|---|
| Duplicate guard | Block |
| Bank details (Airwallex validation) | Block |
| Bank response (previous payment returned) | Block |
| Bank-change quarantine | Hold |
| Refund reserve (returns, refunds, disputes) | Reduce or Hold |
| Approval limit | Hold until a person approves |
| Funding (wallet floor) | Hold |
| Route (local vs SWIFT) | Chooses the cheapest route |

**The model reads. The code decides. Airwallex moves the money.** Claude (or
a rules-based reader) classifies seller emails into an intent. That can pause
a payout. It can never release one or change bank details.

## Try the demo

Open the payout run and use **Try it**:

1. A buyer asks for a refund → one seller moves from Clear to Reduce.
2. An email asks to change bank details → the seller is held; details are untouched.
3. Arm a bank rejection and a dropped response, approve the large payout, then **Send**.
4. Watch the rejected payout get blocked, and the timed-out one get found by its request ID with no second payment.
5. Fix the bank details → retry with a new request ID.
6. Close a return window → the held reserve is released.

Kora Market and its sellers are fictional.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine and rail safety tests
```

### Modes

Without keys, payouts go to a simulated rail that behaves like the Airwallex
sandbox (duplicate request IDs rejected, responses can be lost, transfers move
Processing → Sent → Paid or Failed). Copy `.env.example` to `.env.local` to
enable:

| Variable | Effect |
|---|---|
| `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY` | Adds an "Airwallex sandbox" mode that sends real sandbox transfers |
| `AIRWALLEX_BENEFICIARY_MAP` | Maps demo sellers to sandbox beneficiary IDs |
| `ANTHROPIC_API_KEY` | Seller emails are read by Claude instead of rules |

The sandbox adapter is written against Airwallex's public API reference and
has not yet been run against a live sandbox account.

## Team

- Anjola Adeyemi: product, Airwallex integration, policy engine, app
- GRAMMYboy: allocation and route optimiser
