# Holdpoint: decisions

Short records of choices that shaped the product, newest first.

### Name: Holdpoint (was Cleared)
"Cleared" is already the name of a funded US payments startup that verifies and clears payments, too close to share. A holding point is the line where an aircraft waits until the tower clears it, which matches the product and the control-tower interface.

### Frame it as growth, not only safety
Airwallex's own framing is that AI helps businesses move more money. Holdpoint's checks are what make it safe to send most payouts with nobody reviewing them, so the pitch leads with "pay sellers every day" and the primary metric is the share of payouts sent with no human review.

### Marketplaces paying sellers, not payroll or treasury
Payroll (Ringfence, kit 6) needs platform access plus three accounts, and kit 6 already demonstrates its core. Treasury and reconciliation overlap Airwallex's existing products and Leapfin. Marketplace payouts have visible, demo-able failure modes (refunds, fake bank changes, duplicates, timeouts) on a plain sandbox account.

### Keep GRAMMYboy's Ringfence controls
Dry run before money moves, reconciliation that halts on drift, a proof view, a Global Account per funding source, and the naive-versus-safe demo beat all come from Ringfence. They make Holdpoint stronger and are his to build.

### The model reads; the code decides
A language model is good at reading messy seller emails and bad at being accountable for money. So the model only produces intents with quoted evidence, and deterministic code makes every decision.

### Unknown is not failed
A lost response after Airwallex accepted a transfer is the most likely way to pay someone twice. Treating it as unknown and looking it up by request ID before any retry is non-negotiable.

### Skip the Visa and Metal awards
Both need their own tooling (Visa's agentic commerce tools; Metal's blockchain). Holdpoint pays sellers out rather than buying, so either would be bolted on.
