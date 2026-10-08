# Holdpoint: policy

Every payout line is checked against eight rules. Each rule returns an outcome and a sentence a person can read. The line's decision is the strictest outcome: **Block > Hold > Reduce > Clear**. The engine is pure and deterministic (`src/lib/engine/evaluate.ts`): the same inputs always give the same decision.

## Settings the marketplace controls

| Setting | Default | Used by |
|---|---|---|
| Return window | 14 days | Refund reserve |
| Dispute reserve | 100% of the disputed amount | Refund reserve |
| Bank-change cooling-off | 72 hours | Bank-change quarantine |
| Autonomous limit | US$10,000 per payout | Approval limit |
| Wallet floor | US$25,000 | Funding |
| Duplicate window | 7 days | Duplicate guard |

## The eight checks

| # | Check | Fires when | Outcome |
|---|---|---|---|
| 1 | Duplicate guard | The same orders appear in another line in this run, or were already paid in the duplicate window | Block |
| 2 | Bank details | Airwallex beneficiary validation rejects the details | Block |
| 3 | Bank response | The bank returned the last payment (for example a name mismatch). Stays until a person corrects the details | Block |
| 4 | Bank-change quarantine | Details changed inside the cooling-off window, or a bank-change request arrived that nobody has verified | Hold |
| 5 | Refund reserve | Some orders can still come back (see below) | Reduce; Hold if everything owed is at risk |
| 6 | Approval limit | The amount Holdpoint would send is above the autonomous limit | Hold until a named approver approves that exact amount and account |
| 7 | Funding | Sending would take the wallet below the floor, counting earlier lines in the run | Hold |
| 8 | Route | Always | Informational: local transfer where the details support it, otherwise SWIFT, with fee and timing |

## Refund reserve

For each order in a payout line:

- **Refund requested:** keep back the full amount.
- **Disputed:** keep back the dispute reserve (default 100%).
- **Delivered, still inside the return window:** keep back the order amount times the seller's trailing refund rate.
- **Refunded:** not owed, not counted.
- **Delivered, window closed:** owed in full.

`reserve = min(owed, refunds + disputes + expected returns)`. Holdpoint sends `owed - reserve`. When a window closes, a release line pays out what was kept back, and it passes through the same checks.

## What the model may and may not do

| May | May not |
|---|---|
| Read a seller email and label it (bank-change request, dispute, payout question, other) with a confidence and a quoted sentence | Change an amount |
| Pause a payout by raising a bank-change request | Release a payout |
| | Edit or approve bank details |

If either the model or the rules reader sees a bank-change request, it is treated as one. The safer reading wins.

## Re-checking

When something changes (a refund, an email, a bank response, a window closing), only the lines that event touches are re-checked. Everything else keeps its decision, and the record says why each changed line changed.
