# Cleared: product requirements

> **Every payout cleared before it moves.**
>
> Cleared is a pre-execution gate for marketplaces that pay sellers across
> borders on Airwallex. Before any payout reaches the Airwallex Transfer API,
> Cleared decides **CLEAR**, **REDUCE**, **HOLD** or **BLOCK**, and records why.

| | |
|---|---|
| Status | Hackathon build (Airwallex Agentic Banking Hackathon, Oct–Nov 2026) |
| Owners | Anjola Adeyemi (product, Airwallex integration, policy engine, app); GRAMMYboy (allocation and route optimiser) |
| Design rule | The model reads. The code decides. Airwallex moves the money. |

---

## 1. Problem

A marketplace collects money from buyers and pays it out to sellers later.
Between the two, three things go wrong on every payout run:

1. **Paying money that may come back.** A buyer can still return an item or
   open a dispute. If the marketplace has already paid the seller in full, it
   has to claw money back from someone in another country, which rarely works.
2. **Paying the wrong account.** Bank details are wrong (name order, bank
   code, closed account) or a scammer emails "please pay my new account".
   - Problems with beneficiary name and address details are the most common
     cause of cross-border payment failure (21%), and each rejected or repaired
     payment costs about US$12.10 (LexisNexis Risk Solutions, *True Impact of
     Failed Payments*, 2023).
   - Business email compromise caused about US$2.8B of reported losses in
     2024 (FBI IC3, via Nacha, April 2025).
3. **Paying twice.** A transfer request times out, someone retries, the seller
   is paid twice.

Payout platforms (Airwallex, Tipalti, Payouts.com, Stripe Connect) execute
payouts once you have decided. **None of them decides whether a specific
payout should go out right now, in full.** Today that decision is a
spreadsheet and a tired operations analyst.

## 2. Who it is for

| Role | Need |
|---|---|
| **Buyer:** Head of Finance or Payments Ops at a marketplace on Airwallex | Pay sellers on time without losing money to refunds, fraud or double payment |
| **Daily user:** payouts operations analyst | Run the weekly payout, handle exceptions, approve holds |
| **Affected party:** the seller | Know what they are being paid, when, and why anything is held |

**First vertical:** cross-border goods and services marketplaces with sellers
in several countries (fashion, electronics, digital goods, freelance services).
**Later:** gig platforms, creator platforms, contractor platforms. Same engine,
different rules.

## 3. Positioning against Airwallex's own stack

| Airwallex already has | What it does | Where Cleared sits |
|---|---|---|
| Transfers API + `transfers/validate` | Checks a payout **can** be sent | Cleared decides whether it **should** be sent, and how much |
| Batch transfers | Sends many payouts at once | Cleared decides what goes into the batch |
| Expense Policy Agent | Reviews card spend and reimbursements | Cleared gates outbound payouts before they move |
| Leapfin (acquired June 2026) | Accounting after money moves | Cleared works before money moves |

> **Before:** Cleared checks the payout. **During:** Airwallex moves it.
> **After:** Leapfin books it.

## 4. Goals and non-goals

### Goals (hackathon)

- G1. Every payout in a run gets exactly one decision with a plain-language reason.
- G2. Money only moves through Airwallex when the deterministic policy allows it.
- G3. The agent changes decisions when new information arrives (a refund, a
  bank-change email, a failure, a timeout) and only re-evaluates the payouts
  affected.
- G4. No payout is ever sent twice, including after a timeout.
- G5. No bank details are ever changed by the AI.
- G6. A full audit trail exists for every decision.
- G7. Works against the real Airwallex sandbox when keys are present, and in a
  clearly labelled simulation when they are not.

### Non-goals

- Predicting FX rates.
- Editing beneficiary records automatically.
- Building payout rails, KYC or tax forms.
- Accounting and reconciliation (Leapfin's lane).
- A seller-facing app (sellers receive messages only).

## 5. Decisions

| Decision | Meaning | Example |
|---|---|---|
| **CLEAR** | Send the full amount now | All checks pass |
| **REDUCE** | Send part now, hold the rest as a reserve | €3,800 of orders are still inside the return window |
| **HOLD** | Send nothing yet; a human or an event must release it | Bank change requested by email 6 hours ago |
| **BLOCK** | Must not be sent; requires correction | Same payout already processing; bank rejected the name |

Precedence when several checks fire: **BLOCK > HOLD > REDUCE > CLEAR**.

## 6. Checks (all deterministic code)

| # | Check | Input | Outcome when it fires |
|---|---|---|---|
| C1 | **Duplicate guard** | Seller, period, amount; existing transfers by `request_id` | BLOCK |
| C2 | **Beneficiary validity** | Airwallex beneficiary validation | BLOCK |
| C3 | **Bank rejected** | Transfer `FAILED` with beneficiary failure reason | BLOCK until corrected and re-validated |
| C4 | **Bank-change quarantine** | Beneficiary changed within cooling-off window, or an unverified change request | HOLD |
| C5 | **Refund reserve** | Orders inside the return window × seller's refund rate; open disputes at 100% | REDUCE (or HOLD if reserve ≥ owed) |
| C6 | **Autonomy limit** | Payout amount vs policy limit | HOLD for human approval |
| C7 | **Funding** | Wallet balance minus platform floor | HOLD if insufficient |
| C8 | **Route** | Country, currency, amount | Chooses LOCAL or SWIFT and estimates fees; never blocks |

### Policy defaults (editable)

| Setting | Default |
|---|---|
| Return window | 14 days |
| Dispute reserve | 100% of disputed amount |
| Bank-change cooling-off | 72 hours |
| Autonomous payout limit | US$10,000 equivalent |
| Platform balance floor | US$25,000 |
| Duplicate window | 7 days (matches Airwallex `request_id` window) |

## 7. Agent loop

```
OBSERVE  →  READ  →  DECIDE  →  EXECUTE  →  RECONCILE  →  (event)  →  RE-DECIDE affected only
```

1. **Observe:** load sellers, orders, refunds, beneficiaries, balances, existing transfers.
2. **Read (model):** classify inbound seller messages into typed intents
   (`BANK_CHANGE_REQUEST`, `DISPUTE`, `PAYOUT_QUERY`, `OTHER`) with evidence.
   The model never produces amounts, thresholds or bank details.
3. **Decide (code):** run C1–C8, produce a decision, reason codes and a sendable amount.
4. **Execute (Airwallex):** create transfers for CLEAR and REDUCE (and approved
   HOLDs) with a deterministic `request_id`.
5. **Reconcile:** poll status to a terminal state. A timeout becomes **UNKNOWN**,
   never "retry". UNKNOWN triggers a lookup by `request_id`.
6. **Re-decide:** an event only re-opens the payouts it touches.

## 8. Key flows (detail in `USER_FLOWS.md`)

1. Prepare run → review plan → approve holds → execute.
2. Refund filed mid-run → affected seller REDUCE grows → next payout adjusted.
3. Bank-change email → model reads intent → seller HOLD → out-of-band
   confirmation → released.
4. Bank rejects name → BLOCK → ops corrects beneficiary → re-validate → retry
   with a **new** `request_id`.
5. Timeout → UNKNOWN → lookup by the **same** `request_id` → found → no duplicate.
6. Return window closes → reserve released → follow-up payout.

## 9. Seller communication

Every decision produces a seller message, for example:

- **CLEAR:** "Your payout of ₦1,240,000 is on its way. Expected in 1 business day."
- **REDUCE:** "We've sent €11,200 today. €3,800 is held until your return window closes on 21 Oct."
- **HOLD:** "We received a request to change your bank details. For your safety, we'll confirm it with you before paying."
- **BLOCK:** "Your bank rejected the payment because the account name didn't match. Please check your payout details."

## 10. Success metrics

| Metric | Hackathon target | Product target |
|---|---|---|
| Payouts with a recorded reason | 100% | 100% |
| Duplicate payouts | 0 | 0 |
| Bank details changed by AI | 0 | 0 |
| Failed payouts caught before send | Shown in demo | > 50% of would-be failures |
| Clawback exposure avoided | Shown in demo | Measured per run |
| "Where's my money?" tickets | — | −40% |

## 11. Business model (post-hackathon)

- Platform fee per marketplace per month (by seller count).
- Basis-point fee on volume gated.
- Expansion: more rails beyond Airwallex, more verticals.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Airwallex adds this natively | Stay vertical: marketplace rules (returns, disputes, seller risk) are platform-specific |
| Name verification only covers SEPA, UK and Vietnam | Use it where available; elsewhere rely on validation, history and quarantine |
| NGN payouts may need compliance review in sandbox | Test early; demo with currencies that work |
| Refund data lives in the marketplace, not Airwallex | Cleared ingests it; this is expected |

## 13. Milestones

| Date | Milestone |
|---|---|
| Oct 23 | Idea submission |
| Oct 25–31 | Live sandbox: validation, transfers, simulated failures, request-ID lookup |
| Nov 1–7 | Optimiser (reserve sizing, route cost), model reading, seller messages |
| Nov 8–13 | Polish, video under 5 minutes, repository |
