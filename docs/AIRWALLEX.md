# Holdpoint: Airwallex integration

Holdpoint uses a plain Airwallex sandbox account. It needs no platform (connected accounts) access, which the hackathon's multi-tenant starter kits require.

## Endpoints

| Step | Endpoint | Notes |
|---|---|---|
| Authenticate | `POST /api/v1/authentication/login` | Client ID + API key, server side only |
| Check details before sending | `POST /api/v1/transfers/validate` | Drives the bank-details check |
| Send a payout | `POST /api/v1/transfers/create` | `request_id`, `beneficiary_id`, amounts, currencies, `transfer_method` |
| Find a payout after a timeout | `GET /api/v1/transfers?request_id=` | The heart of "no double payment" |
| Track a payout | `GET /api/v1/transfers/{id}` | Processing → Sent → Paid or Failed |
| Balances | `GET /api/v1/balances/current` | Funding check and, later, reconciliation |
| Sandbox events | `POST /api/v1/simulation/transfers/{id}/transition` | `next_status`, `failure_type` (for example `BENEFICIARY_NAME_MISMATCH`) to rehearse bank returns |

Code: `src/lib/rail/airwallex-server.ts` (server routes), `src/lib/rail/airwallex-client.ts` (browser wrapper), `src/app/api/airwallex/[action]/route.ts`.

## Simulated rail

`src/lib/rail/simulated.ts` behaves like the sandbox in the ways that matter for safety: it rejects a reused request ID, can drop a response after accepting a transfer, and moves transfers through the same statuses. The demo runs on it with no keys.

## Status

- Written against Airwallex's public API reference.
- **Not yet run against a live sandbox account.** First task once keys arrive: create beneficiaries for the demo sellers, map them in `AIRWALLEX_BENEFICIARY_MAP`, fund the sandbox wallet, run the demo end to end, and record any differences here.

## Limits worth knowing

- Name-match verification covers SEPA, the UK and Vietnam only. Elsewhere Holdpoint relies on validation, payment history and the bank-change quarantine.
- A Global Account per marketplace or funding source (from GRAMMYboy's Ringfence design) is a later step for tagging incoming money.
