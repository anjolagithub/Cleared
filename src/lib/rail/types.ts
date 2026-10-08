import type { Currency, RouteKind, TransferStatus } from "../engine/types";

/** What Holdpoint asks the payout rail to do. Mirrors the Airwallex Transfers API. */
export interface CreateTransferInput {
  requestId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  amount: number;
  currency: Currency;
  sourceCurrency: Currency;
  route: RouteKind;
  reference: string;
}

export interface RailTransfer {
  id: string;
  requestId: string;
  status: Exclude<TransferStatus, "UNKNOWN">;
  amount: number;
  currency: Currency;
  sourceAmount: number;
  feeUsd: number;
  failureReason?: string;
}

export class RailTimeout extends Error {
  constructor(public requestId: string) {
    super(`Request ${requestId} timed out with no response`);
    this.name = "RailTimeout";
  }
}

export interface PayoutRail {
  readonly mode: "simulation" | "sandbox";
  createTransfer(input: CreateTransferInput): Promise<RailTransfer>;
  findByRequestId(requestId: string): Promise<RailTransfer | undefined>;
  getTransfer(id: string): Promise<RailTransfer>;
  /** Advance a transfer through sandbox states (Airwallex simulation API, or local clock). */
  advance(id: string, opts?: { failWith?: string }): Promise<RailTransfer>;
}
