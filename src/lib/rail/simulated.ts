import { RATE_PER_USD } from "../engine/money";
import { RailTimeout, type CreateTransferInput, type PayoutRail, type RailTransfer } from "./types";

const NEXT: Record<RailTransfer["status"], RailTransfer["status"] | undefined> = {
  PROCESSING: "SENT",
  SENT: "PAID",
  PAID: undefined,
  FAILED: undefined,
};

/**
 * In-memory stand-in for the Airwallex sandbox. It behaves like the real rail
 * in the ways that matter to Holdpoint:
 *  - a reused request ID is rejected as a duplicate (Airwallex: 7 days);
 *  - a request can be accepted while the response is lost (timeout);
 *  - transfers move PROCESSING → SENT → PAID, or FAILED with a reason.
 */
export class SimulatedRail implements PayoutRail {
  readonly mode = "simulation" as const;
  private byId = new Map<string, RailTransfer>();
  private byRequest = new Map<string, string>();
  private n = 0;
  /** Request IDs whose response should be dropped after the transfer is created. */
  dropResponse = new Set<string>();

  async createTransfer(input: CreateTransferInput): Promise<RailTransfer> {
    await delay(350);
    if (this.byRequest.has(input.requestId)) {
      throw new Error(`Duplicate request_id ${input.requestId}: a payout with this ID already exists.`);
    }
    const id = `tfr_sim_${(++this.n).toString().padStart(4, "0")}`;
    const t: RailTransfer = {
      id,
      requestId: input.requestId,
      status: "PROCESSING",
      amount: input.amount,
      currency: input.currency,
      sourceAmount: Math.round((input.amount / RATE_PER_USD[input.currency]) * 100) / 100,
      feeUsd: 0,
    };
    this.byId.set(id, t);
    this.byRequest.set(input.requestId, id);
    if (this.dropResponse.has(input.requestId)) {
      this.dropResponse.delete(input.requestId);
      await delay(900);
      throw new RailTimeout(input.requestId);
    }
    return { ...t };
  }

  async findByRequestId(requestId: string): Promise<RailTransfer | undefined> {
    await delay(500);
    const id = this.byRequest.get(requestId);
    return id ? { ...this.byId.get(id)! } : undefined;
  }

  async getTransfer(id: string): Promise<RailTransfer> {
    const t = this.byId.get(id);
    if (!t) throw new Error(`Unknown transfer ${id}`);
    return { ...t };
  }

  async advance(id: string, opts?: { failWith?: string }): Promise<RailTransfer> {
    const t = this.byId.get(id);
    if (!t) throw new Error(`Unknown transfer ${id}`);
    if (opts?.failWith && t.status !== "PAID" && t.status !== "FAILED") {
      t.status = "FAILED";
      t.failureReason = opts.failWith;
    } else {
      const next = NEXT[t.status];
      if (next) t.status = next;
    }
    return { ...t };
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
