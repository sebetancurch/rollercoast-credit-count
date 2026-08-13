import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast";

import "./globals.css";

/**
 * The design system loads Source Serif 4 with an @import of Google Fonts.
 * next/font self-hosts it instead: no render-blocking request, no layout shift,
 * and no third-party call from the user's browser. The variable it publishes is
 * what --font-heading and --font-body point at in globals.css.
 */
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Credit Count",
  description:
    "Count the rollercoasters you have ridden. A credit is one coaster ridden at " +
    "least once — your ride history stays private unless you choose otherwise.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sourceSerif.variable}>
      <body>
        <ToastProvider>
          <div className="cc-shell">
            <SiteHeader />
            <main className="cc-gutter">{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
