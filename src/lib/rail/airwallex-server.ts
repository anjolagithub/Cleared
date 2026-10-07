import "server-only";
import type { CreateTransferInput, RailTransfer } from "./types";

/**
 * Minimal server-side Airwallex client for the sandbox.
 * Keys never reach the browser: the app calls /api/airwallex/*, which uses this.
 *
 * Env:
 *   AIRWALLEX_CLIENT_ID, AIRWALLEX_API_KEY  (sandbox keys)
 *   AIRWALLEX_BASE_URL                      (default https://api-demo.airwallex.com)
 *   AIRWALLEX_BENEFICIARY_MAP               (JSON: {"ben_ada": "<airwallex beneficiary id>", ...})
 */
const BASE = process.env.AIRWALLEX_BASE_URL || "https://api-demo.airwallex.com";

export function airwallexConfigured(): boolean {
  return !!(process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY);
}

let cached: { token: string; expires: number } | undefined;

async function token(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch(`${BASE}/api/v1/authentication/login`, {
    method: "POST",
    headers: {
      "x-client-id": process.env.AIRWALLEX_CLIENT_ID!,
      "x-api-key": process.env.AIRWALLEX_API_KEY!,
      "content-type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Airwallex login failed (${res.status})`);
  const body = (await res.json()) as { token: string; expires_at?: string };
  cached = { token: body.token, expires: body.expires_at ? Date.parse(body.expires_at) : Date.now() + 25 * 60_000 };
  return cached.token;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${await token()}`, "content-type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Airwallex ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

interface AwxTransfer {
  id: string;
  request_id: string;
  status: string;
  transfer_amount?: number;
  amount_beneficiary_receives?: number;
  transfer_currency?: string;
  source_amount?: number;
  fee_amount?: number;
  failure_reason?: string;
}

function mapStatus(s: string): RailTransfer["status"] {
  const u = s.toUpperCase();
  if (u === "PAID" || u === "SUCCEEDED" || u === "SETTLED") return "PAID";
  if (u === "SENT" || u === "DISPATCHED") return "SENT";
  if (u === "FAILED" || u === "CANCELLED" || u === "CANCELED" || u === "RETURNED") return "FAILED";
  return "PROCESSING";
}

function toRail(t: AwxTransfer): RailTransfer {
  return {
    id: t.id,
    requestId: t.request_id,
    status: mapStatus(t.status),
    amount: t.transfer_amount ?? t.amount_beneficiary_receives ?? 0,
    currency: (t.transfer_currency ?? "USD") as RailTransfer["currency"],
    sourceAmount: t.source_amount ?? 0,
    feeUsd: t.fee_amount ?? 0,
    failureReason: t.failure_reason,
  };
}

function beneficiaryMap(): Record<string, string> {
  try {
    return JSON.parse(process.env.AIRWALLEX_BENEFICIARY_MAP || "{}");
  } catch {
    return {};
  }
}

export async function createTransfer(input: CreateTransferInput): Promise<RailTransfer> {
  const beneficiaryId = beneficiaryMap()[input.beneficiaryId];
  if (!beneficiaryId) throw new Error(`No Airwallex beneficiary mapped for ${input.beneficiaryId}`);
  const t = await call<AwxTransfer>("/api/v1/transfers/create", {
    method: "POST",
    body: JSON.stringify({
      request_id: input.requestId,
      beneficiary_id: beneficiaryId,
      transfer_amount: input.amount,
      transfer_currency: input.currency,
      source_currency: input.sourceCurrency,
      transfer_method: input.route,
      reference: input.reference.slice(0, 35),
      reason: "marketplace_payout",
    }),
  });
  return toRail(t);
}

export async function findByRequestId(requestId: string): Promise<RailTransfer | undefined> {
  const r = await call<{ items: AwxTransfer[] }>(`/api/v1/transfers?request_id=${encodeURIComponent(requestId)}`);
  return r.items?.[0] ? toRail(r.items[0]) : undefined;
}

export async function getTransfer(id: string): Promise<RailTransfer> {
  return toRail(await call<AwxTransfer>(`/api/v1/transfers/${encodeURIComponent(id)}`));
}

/** Sandbox only: move a transfer to its next status, or to FAILED with a failure type. */
export async function advance(id: string, failWith?: string): Promise<RailTransfer> {
  const current = await getTransfer(id);
  const next = failWith ? "FAILED" : current.status === "PROCESSING" ? "SENT" : "PAID";
  const t = await call<AwxTransfer>(`/api/v1/simulation/transfers/${encodeURIComponent(id)}/transition`, {
    method: "POST",
    body: JSON.stringify(failWith ? { next_status: next, failure_type: failWith } : { next_status: next }),
  });
  return toRail(t);
}

export async function balanceUsd(): Promise<number | undefined> {
  const r = await call<Array<{ currency: string; available_amount: number }>>("/api/v1/balances/current");
  return r.find((b) => b.currency === "USD")?.available_amount;
}
