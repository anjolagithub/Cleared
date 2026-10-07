import type { Metadata } from "next";
import { RunConsole } from "@/components/run/RunConsole";

export const metadata: Metadata = {
  title: "Week 42 payout run | Cleared",
};

export default function RunPage() {
  return <RunConsole />;
}
