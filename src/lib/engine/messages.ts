import { fmt } from "./money";
import type { Decision, Seller, Transfer } from "./types";

function date(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** The message a seller receives about a decision. Written for the seller, not ops. */
export function decisionMessage(d: Decision, s: Seller, releaseOn?: string): string {
  const c = s.currency;
  const first = s.name.split(" ")[0];
  switch (d.outcome) {
    case "CLEAR":
      return `Hi ${first}, your payout of ${fmt(d.sendable, c)} is scheduled today. It usually arrives in ${d.route.etaDays}.`;
    case "REDUCE":
      return `Hi ${first}, we're sending ${fmt(d.sendable, c)} today. ${fmt(d.reserve, c)} is held for open returns and refunds${
        releaseOn ? ` and will be released from ${date(releaseOn)} if nothing comes back` : ""
      }.`;
    case "HOLD": {
      const fired = d.checks.find((x) => x.status === "fire" && x.outcome === "HOLD");
      if (fired?.id === "bankChange")
        return `Hi ${first}, we received a request to change your payout bank details. To protect you, we'll confirm it with you on your registered contact before paying.`;
      if (fired?.id === "autonomy")
        return `Hi ${first}, your payout of ${fmt(d.owed, c)} is waiting for a routine approval. We'll send it as soon as it's approved.`;
      if (fired?.id === "reserve")
        return `Hi ${first}, this week's orders are all still within their return window, so your payout is held until the window closes.`;
      return `Hi ${first}, your payout is on hold while we check a few details. We'll update you shortly.`;
    }
    case "BLOCK": {
      const fired = d.checks.find((x) => x.status === "fire" && x.outcome === "BLOCK");
      if (fired?.id === "bankRejected")
        return `Hi ${first}, your bank returned the payment because the account name didn't match. Please check your payout details in Kora Market.`;
      if (fired?.id === "beneficiary")
        return `Hi ${first}, we can't pay you yet because your bank details are incomplete. Please update them in Kora Market.`;
      return "";
    }
  }
}

export function paidMessage(t: Transfer, s: Seller): string {
  return `Hi ${s.name.split(" ")[0]}, ${fmt(t.amount, t.currency)} has been paid to your ${s.beneficiary.bankName} account.`;
}
