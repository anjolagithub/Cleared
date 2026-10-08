# Holdpoint: user flows

Actors: **Ops** (payouts analyst), **Approver** (finance lead), **Holdpoint**
(agent + policy engine), **Airwallex**, **Seller**.

---

## Flow 1: Weekly payout run

```
Ops opens run "Week 41"
  → Holdpoint loads sellers, orders, refunds, beneficiaries, balance
  → Holdpoint runs checks C1–C8 for every seller
  → Run board shows: CLEAR n · REDUCE n · HOLD n · BLOCK n, total sendable
Ops reviews any row → drawer shows each check, inputs, outcome
Approver approves HOLDs that only need approval (C6)
Ops presses "Send cleared payouts"
  → Holdpoint creates one Airwallex transfer per payout (request_id = run:seller:period)
  → statuses update: PROCESSING → SENT → PAID
  → each seller gets a message
Run summary: sent, held, blocked, reserve kept, fees, duplicates prevented
```

**Acceptance:** nothing moves before "Send". Every row has a reason. Total
sent equals the sum of CLEAR plus the sendable part of REDUCE plus approved HOLDs.

## Flow 2: Refund filed mid-run

```
Event: buyer files refund on seller S order O
  → Holdpoint marks only S as affected
  → C5 recomputes reserve for S
  → decision moves (e.g. CLEAR → REDUCE) with diff shown
  → ledger: "Refund O filed, S re-evaluated, reserve +€X"
  → if S already paid: reserve carried to next run (no clawback attempt)
```

## Flow 3: Bank-change email (fraud guard)

```
Inbound email: "Hi, please send this week's payout to my new account …"
  → model classifies: BANK_CHANGE_REQUEST, seller S, confidence, quoted evidence
  → model output never touches the beneficiary record
  → C4 fires: S → HOLD "bank-change quarantine (72h)"
  → seller message sent to the existing verified contact
Ops confirms with seller out-of-band → marks "confirmed" or "rejected"
  → confirmed: beneficiary updated by a human, re-validated, cooling-off applies
  → rejected: flagged as suspected fraud, payout to the old account released
```

## Flow 4: Bank rejects the beneficiary

```
Transfer for S → FAILED (BENEFICIARY_NAME_MISMATCH)
  → C3 fires: S → BLOCK "bank rejected account name"
  → no automatic retry
Ops corrects the name → Holdpoint re-validates with Airwallex
  → valid: S → CLEAR, new transfer with a NEW request_id (attempt 2)
```

## Flow 5: Timeout, unknown outcome

```
Create transfer for S → network timeout, no response
  → S → UNKNOWN (never "retry")
  → Holdpoint looks up transfers by the SAME request_id
     → found: adopt that transfer, status continues, no new payment
     → not found: safe to re-send with the same request_id
       (Airwallex rejects a reused request_id within 7 days, so a
        duplicate can't be created even if the first one appears later)
```

## Flow 6: Return window closes

```
Event: return window closes for S's held orders, no refunds
  → C5 reserve drops
  → held amount becomes a follow-up payout (new request_id)
  → seller message: "Your held €3,800 has been released."
```

## Screens

| Screen | Purpose |
|---|---|
| **Landing** | Story, how it works, link to the live run |
| **Run console** | Summary tiles, decision board, filters, "Send" |
| **Seller drawer** | Checks with inputs, decision history, transfer timeline, seller message |
| **Events panel** | Inject real-world events (refund, bank-change email, failure, timeout, window close) |
| **Approvals** | HOLDs waiting on a human, with the exact action being approved |
| **Ledger** | Append-only audit of every observation, decision and API call |
| **Policy** | Current thresholds |
