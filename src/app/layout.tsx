import type { Metadata, Viewport } from "next";
import "@fontsource-variable/schibsted-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  title: "Holdpoint: hold only what’s at risk, send the rest now",
  description:
    "Holdpoint sends marketplace seller payouts through Airwallex on its own when they are safe, and holds or blocks the rest with a reason a person can act on.",
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
