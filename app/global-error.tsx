"use client";

import "./globals.css";

/**
 * The last resort. Catches what no other boundary can: a throw in the root
 * layout itself, which means SiteHeader, ToastProvider or the font setup.
 *
 * Next replaces the root layout with this file when it renders, so it has to
 * supply its own <html> and <body>. Two consequences to keep in mind:
 *
 *   next/font never runs, so --font-display and --font-body-sans are undefined.
 *   Left alone, every `font-family: var(--font-heading)` in globals.css becomes
 *   invalid at computed-value time and falls back to the browser's serif — the
 *   error page would be the one screen in the app in Times New Roman. The two
 *   custom properties below stand in with the same fallbacks the tokens name.
 *
 *   `metadata` cannot be exported from a client component, so the title is
 *   React's <title> element instead.
 *
 * There is no "Try again" here. Whatever broke is above every boundary that
 * could re-fetch; a full reload is the only thing that can genuinely help.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html
      lang="en"
      style={
        {
          "--font-display": "Impact, sans-serif",
          "--font-body-sans": "system-ui, sans-serif",
        } as React.CSSProperties
      }
    >
      <body>
        <title>Credit Count — something went wrong</title>
        <main className="cc-gutter">
          <div className="cc-page" style={{ maxWidth: "52ch" }}>
            <h1>Credit Count is down</h1>
            <p className="cc-prose cc-prose--lg">
              The app failed to start up. Your rides and your credits are stored in the
              database and are untouched by this.
            </p>
            {error.digest ? (
              <p className="text-muted" style={{ fontSize: 12 }}>
                Reference {error.digest}
              </p>
            ) : null}
            {/* A full document reload, not a <Link>. Client navigation would
                re-render the same broken root layout; the point is to fetch
                the document again. */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
