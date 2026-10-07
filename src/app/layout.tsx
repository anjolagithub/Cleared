import type { Metadata, Viewport } from "next";
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400..900;1,400..900&display=swap"
        />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
