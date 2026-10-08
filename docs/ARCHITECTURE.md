# Holdpoint: architecture

```
 Seller emails ──► Reader (Claude or rules) ──► typed intent only
                                                    │
 Kora order export ─┐                               ▼
 Refund events ─────┼──► Run state ──► Policy engine (pure code) ──► Decision per payout
 Bank details ──────┘        ▲              8 checks, strictest wins      │
                             │                                           ▼
                        Reconciler ◄── Payout rail (Airwallex sandbox or simulated) ◄── Send
                             │
                             └──► Decision record + seller messages
```

## Principles

1. **The model reads, the code decides, the rail moves the money.** The reader
   returns an intent, a confidence and a quoted sentence. It cannot produce
   amounts, thresholds or bank details. Seller identity is resolved by code
   from the sender address.
2. **Strictest outcome wins.** BLOCK > HOLD > REDUCE > CLEAR.
3. **Events re-check only what they touch.** A refund on one order
   re-evaluates the payouts that contain it; everything else keeps its
   decision.
4. **Unknown is not failed.** A timeout marks the transfer UNKNOWN and triggers
   a lookup by the same `request_id`. Airwallex rejects a reused `request_id`
   within 7 days, so even a blind re-send can only land once.
5. **People change bank details, never the agent.** A bank-change request
   quarantines payouts; a person confirms out of band.

## Code map

| Path | What it is |
|---|---|
| `src/lib/engine/types.ts` | Domain types |
| `src/lib/engine/evaluate.ts` | The eight checks and run evaluation (pure, deterministic) |
| `src/lib/engine/run.ts` | Run state reducer: events, approvals, transfers, ledger, seller messages |
| `src/lib/engine/reader.ts` | Rules-based reader and the model prompt |
| `src/lib/engine/messages.ts` | Plain-language seller messages |
| `src/lib/engine/seed.ts` | Fictional Kora Market data and default policy |
| `src/lib/rail/simulated.ts` | In-memory rail that behaves like the sandbox (duplicate request IDs, lost responses, failures) |
| `src/lib/rail/airwallex-server.ts` | Server-side Airwallex sandbox client (keys never reach the browser) |
| `src/lib/rail/airwallex-client.ts` | Browser rail that calls `/api/airwallex/*` |
| `src/app/api/read` | Reader endpoint (Claude when `ANTHROPIC_API_KEY` is set) |
| `src/app/api/airwallex/[action]` | Proxy for create, find by request ID, get, advance (simulation API) |
| `src/lib/use-run.ts` | Wires state, rail, sending, polling and reconciliation |
| `test/engine.test.ts` | Engine and rail safety tests |

## Airwallex calls

| Step | Endpoint |
|---|---|
| Authenticate | `POST /api/v1/authentication/login` |
| Send a payout | `POST /api/v1/transfers/create` with `request_id`, `beneficiary_id`, `transfer_amount`, `transfer_currency`, `source_currency`, `transfer_method` |
| Find after timeout | `GET /api/v1/transfers?request_id=…` |
| Track status | `GET /api/v1/transfers/{id}` |
| Sandbox state changes | `POST /api/v1/simulation/transfers/{id}/transition` with `next_status`, `failure_type` (e.g. `BENEFICIARY_NAME_MISMATCH`) |

Planned next: `POST /api/v1/transfers/validate` and beneficiary validation as
live inputs to the bank-details check, batch transfers for the send step, and
account-name verification for GBP and EUR sellers.

## Status

- The engine, reader, simulated rail and interface are complete and tested.
- The Airwallex sandbox adapter is written against the public API reference
  and switches on when keys are present. It has not yet been run against a
  live sandbox account; that is the next milestone.
