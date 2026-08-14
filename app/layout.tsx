import type { Metadata } from "next";
import { Anton, Archivo } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast";

import "./globals.css";

/**
 * The design links these from fonts.googleapis.com. next/font self-hosts them
 * instead: no render-blocking third-party request, no layout shift, and nothing
 * leaves the user's browser to Google. The variables published here are what
 * --font-heading and --font-body resolve to in globals.css.
 */
const anton = Anton({
  subsets: ["latin"],
  weight: ["400"], // Anton ships a single weight
  variable: "--font-display",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-sans",
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
    <html lang="en" className={`${anton.variable} ${archivo.variable}`}>
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
