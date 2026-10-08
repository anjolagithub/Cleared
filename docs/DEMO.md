# Holdpoint: demo script (under 5 minutes)

**Setup:** Kora Market (fictional), week 42 payout run. 14 payouts to 13 sellers in 8 countries, US$72.2K owed, wallet US$168K, floor US$25K, autonomous limit US$10K.

| Time | Beat | What the viewer sees |
|---|---|---|
| 0:00 | The problem | "Amazon and eBay built their own rules for which seller payouts are safe to send. Most marketplaces can't, so they pay slowly or pay blind." |
| 0:20 | The run | The tower: **10 of 14 payouts go out with no one reviewing.** The other 4 wait at the line: a bank change (Brian), a large payout over the limit (Grace), an invalid account (Tom), a duplicate (Camille). Each has its reason. |
| 0:55 | A refund lands | Ada's buyer asks for a refund. Only Ada is re-checked: Clear becomes Reduce, and the refund amount is kept back. |
| 1:25 | The fake email | "Please pay my new account" from Chidi. The model reads it and quotes the sentence; Holdpoint holds Chidi. The bank details are untouched. |
| 2:00 | Send | Approve Grace. Arm a bank rejection on Arjun and a lost response on Maria. Send. |
| 2:30 | Things go wrong, safely | Arjun's bank returns the payment: blocked until fixed. Maria's response is lost: Holdpoint finds the transfer by its request ID, and **no second payment** is made. |
| 3:10 | Fix and retry | Ops corrects Arjun's name. Re-validated, retried with a new request ID, paid. |
| 3:35 | Window closes | Tunde's return window closes; the reserve kept back is released through the same checks. |
| 4:00 | The record | The decision record: every observation, decision and payment. Totals tie out. |
| 4:30 | Close | "Hold only what's at risk. Send the rest now." |

**Contrast beat (once GRAMMYboy's controls are in):** run the same inputs through a naive batch payout. It pays Camille twice, pays Chidi's fraudster and pays out refundable money. Then the proof view: Holdpoint's totals tie out with zero duplicates and zero unverified bank changes.
