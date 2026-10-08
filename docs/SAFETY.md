# Holdpoint: safety

Holdpoint sends real money on its own, so these properties matter more than any feature. Each one is enforced in code; the ones marked **tested** have a test in `test/engine.test.ts`.

## Invariants

1. **No double payment.** Every attempt carries a deterministic request ID (`run:seller:period:attempt`). Airwallex rejects a reused request ID. A transfer with no response is **unknown**, never "failed": Holdpoint looks the request ID up before doing anything else, and only retries if the lookup proves nothing was created. **Tested.**
2. **The model never moves money or edits identity.** Its output is an intent with quoted evidence. It can hold a payout; it cannot release one or touch bank details. **Tested.**
3. **Unverified bank changes never get paid.** A changed account waits out the cooling-off period, and a change request from email waits for a person. **Tested.**
4. **The strictest rule wins.** Block beats Hold beats Reduce beats Clear, whatever order the checks run in. **Tested.**
5. **Totals tie out.** For every run: owed = sent + kept back + held + blocked. **Tested.**
6. **Approvals are bound.** An approval covers one amount to one account. If either changes, the approval no longer applies.

## Failure handling

| What happens | What Holdpoint does |
|---|---|
| Airwallex accepts but the response is lost | Marks the transfer unknown, looks it up by request ID, adopts what it finds |
| The bank returns a payment | Blocks the seller until a person corrects the details, then re-validates and retries with a new request ID |
| A refund arrives mid-run | Re-checks only that seller; nothing already sent is touched |
| The wallet would drop below the floor | Holds the lines that would cross it, in run order |

## Known gaps (being closed during the build)

- Amounts are floating-point in the engine today; they move to integer minor units.
- Run state lives in the browser; it moves to a server-side executor with a database so a refresh or a second tab can't resend.
- The Airwallex routes are not yet authenticated; they will be before any non-sandbox use.
- No maker/checker roles or explicit send confirmation yet.
- Reconciliation that **halts on drift** (internal record vs Airwallex balances and transfer states) is designed but not built. It comes from GRAMMYboy's Ringfence design.
