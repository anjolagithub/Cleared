import { describe, expect, it } from "vitest";
import { evaluateRun, summarize } from "@/lib/engine/evaluate";
import { readByRules } from "@/lib/engine/reader";
import { initialState, reducer, requestIdFor, sendableLines } from "@/lib/engine/run";
import { SimulatedRail } from "@/lib/rail/simulated";
import { RailTimeout } from "@/lib/rail/types";

const fresh = () => initialState("simulation");
const outcomeOf = (s: ReturnType<typeof fresh>, lineId: string) => s.decisions[lineId].outcome;

describe("initial run", () => {
  const s = fresh();

  it("gives every payout exactly one decision with a reason", () => {
    expect(Object.keys(s.decisions)).toHaveLength(s.lines.length);
    for (const d of Object.values(s.decisions)) {
      expect(d.headline.length).toBeGreaterThan(0);
      expect(d.checks.length).toBe(8);
    }
  });

  it("clears a seller with nothing at risk", () => {
    expect(outcomeOf(s, "P-ADA")).toBe("CLEAR");
    expect(s.decisions["P-ADA"].sendable).toBe(s.decisions["P-ADA"].owed);
  });

  it("reduces a payout with a refund request and open return windows", () => {
    const d = s.decisions["P-PRIYA"];
    expect(d.outcome).toBe("REDUCE");
    expect(d.reserve).toBe(186_000 + 248_000 * 0.05);
    expect(d.sendable).toBe(d.owed - d.reserve);
  });

  it("holds a dispute's full amount", () => {
    const d = s.decisions["P-LENA"];
    expect(d.outcome).toBe("REDUCE");
    expect(d.reserve).toBeGreaterThanOrEqual(2_890);
  });

  it("holds payouts to recently changed bank details", () => {
    expect(outcomeOf(s, "P-BRIAN")).toBe("HOLD");
  });

  it("holds payouts above the autonomous limit until approved", () => {
    expect(outcomeOf(s, "P-GRACE")).toBe("HOLD");
    expect(s.decisions["P-GRACE"].needsApproval).toBe(true);
    const n = reducer(s, { type: "APPROVE", lineId: "P-GRACE" });
    expect(outcomeOf(n, "P-GRACE")).toBe("CLEAR");
  });

  it("blocks invalid bank details", () => {
    expect(outcomeOf(s, "P-TOM")).toBe("BLOCK");
  });

  it("blocks the duplicate row in the export but pays the original", () => {
    expect(outcomeOf(s, "P-CAMILLE")).toBe("CLEAR");
    expect(outcomeOf(s, "P-CAMILLE-2")).toBe("BLOCK");
  });

  it("never sends held or blocked payouts", () => {
    const ids = sendableLines(s).map((l) => l.id);
    expect(ids).not.toContain("P-BRIAN");
    expect(ids).not.toContain("P-TOM");
    expect(ids).not.toContain("P-CAMILLE-2");
    expect(ids).not.toContain("P-GRACE");
  });

  it("is deterministic", () => {
    const again = evaluateRun(
      {
        now: s.now,
        policy: s.policy,
        sellers: s.sellers,
        orders: s.orders,
        lines: s.lines,
        transfers: s.transfers,
        approvals: s.approvals,
        balanceUsd: s.balanceUsd,
      },
      {},
    );
    expect(summarize(again)).toEqual(summarize(s.decisions));
  });
});

describe("events re-check only affected payouts", () => {
  it("a refund moves one seller from CLEAR to REDUCE and leaves others alone", () => {
    const s = fresh();
    const order = s.lines.find((l) => l.id === "P-ADA")!.orderIds[0];
    const before = { ...s.decisions };
    const n = reducer(s, { type: "REFUND_FILED", orderId: order });
    expect(outcomeOf(n, "P-ADA")).toBe("REDUCE");
    expect(n.changed).toEqual(["P-ADA"]);
    for (const id of Object.keys(before)) if (id !== "P-ADA") expect(n.decisions[id]).toBe(before[id]);
  });

  it("a bank-change email quarantines the seller without touching bank details", () => {
    const s = fresh();
    const chidi = s.sellers["s-chidi"];
    const reading = readByRules(
      chidi.email,
      "Payout details",
      "Hello, please send this week's payout to my new account at Opay, details below.",
      Object.values(s.sellers),
    );
    expect(reading.intent).toBe("BANK_CHANGE_REQUEST");
    expect(reading.sellerId).toBe("s-chidi");
    const n = reducer(s, { type: "INBOUND", from: chidi.email, subject: "Payout details", body: "x", reading });
    expect(outcomeOf(n, "P-CHIDI")).toBe("HOLD");
    expect(n.sellers["s-chidi"].beneficiary.accountMasked).toBe(chidi.beneficiary.accountMasked);
    expect(n.sellers["s-chidi"].beneficiary.bankName).toBe(chidi.beneficiary.bankName);
    const r = reducer(n, { type: "BANK_CHANGE_RESOLVED", sellerId: "s-chidi", confirmed: false });
    expect(outcomeOf(r, "P-CHIDI")).toBe("CLEAR");
  });

  it("a bank rejection blocks until corrected, then retries with a new request ID", () => {
    const s = fresh();
    const a1 = requestIdFor(s, "P-ADA", 1);
    const n = reducer(s, { type: "BANK_REJECTED", sellerId: "s-ada", reason: "account name mismatch", requestId: a1 });
    expect(outcomeOf(n, "P-ADA")).toBe("BLOCK");
    const c = reducer(n, { type: "BENEFICIARY_CORRECTED", sellerId: "s-ada" });
    expect(outcomeOf(c, "P-ADA")).toBe("CLEAR");
    expect(requestIdFor(c, "P-ADA", 2)).not.toBe(a1);
  });
});

describe("rail safety", () => {
  it("a timed-out request is found by its request ID instead of being paid twice", async () => {
    const rail = new SimulatedRail();
    const input = {
      requestId: "wk42-p-ada-a1",
      beneficiaryId: "ben_ada",
      beneficiaryName: "Adaeze Okafor",
      amount: 1000,
      currency: "NGN" as const,
      sourceCurrency: "USD" as const,
      route: "LOCAL" as const,
      reference: "test",
    };
    rail.dropResponse.add(input.requestId);
    await expect(rail.createTransfer(input)).rejects.toBeInstanceOf(RailTimeout);
    const found = await rail.findByRequestId(input.requestId);
    expect(found?.requestId).toBe(input.requestId);
    await expect(rail.createTransfer(input)).rejects.toThrow(/Duplicate request_id/);
  });
});
