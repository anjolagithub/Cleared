import { RailTimeout, type CreateTransferInput, type PayoutRail, type RailTransfer } from "./types";

/** Browser-side rail that talks to our own /api/airwallex routes (keys stay on the server). */
export class AirwallexSandboxRail implements PayoutRail {
  readonly mode = "sandbox" as const;
  /** Request IDs whose response the client should treat as lost (timeout drill). */
  dropResponse = new Set<string>();

  private async post<T>(action: string, body: unknown, timeoutMs = 20_000): Promise<T> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(`/api/airwallex/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctl.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Airwallex ${action} failed`);
      return json as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async createTransfer(input: CreateTransferInput): Promise<RailTransfer> {
    const t = await this.post<RailTransfer>("create", input);
    if (this.dropResponse.has(input.requestId)) {
      // The transfer exists at Airwallex; we pretend the response never arrived.
      this.dropResponse.delete(input.requestId);
      throw new RailTimeout(input.requestId);
    }
    return t;
  }

  async findByRequestId(requestId: string) {
    const r = await this.post<{ transfer?: RailTransfer }>("find", { requestId });
    return r.transfer;
  }

  getTransfer(id: string) {
    return this.post<RailTransfer>("get", { id });
  }

  advance(id: string, opts?: { failWith?: string }) {
    return this.post<RailTransfer>("advance", { id, failWith: opts?.failWith });
  }
}
