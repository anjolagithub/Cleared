import type { Metadata, Viewport } from "next";
import "@fontsource-variable/schibsted-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cleared: every payout cleared before it moves",
  description:
    "Cleared checks every marketplace payout before it reaches Airwallex, then clears, reduces, holds or blocks it with a reason.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#edf1f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
