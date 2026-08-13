import { choroplethColor } from "@/lib/stats";
import type { Breakdown } from "@/lib/stats";

/**
 * The dashboard's two bar breakdowns. Each row is credits, not rides — a
 * coaster ridden seven times contributes one to its manufacturer.
 */
export function BreakdownBars({ rows }: { rows: Breakdown[] }) {
  if (rows.length === 0) return null;

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {rows.map((row) => (
        <li key={row.label} className="cc-bar-row">
          <div className="cc-bar-head">
            <span>{row.label}</span>
            <span className="cc-num">{row.n}</span>
          </div>
          <div className="cc-bar">
            <div className="cc-bar-fill" style={{ width: `${row.pct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * The legend under the map — swatch, country, count — which is also what
 * carries the country figures when the map itself is only decorative.
 */
export function CountryLegend({ rows }: { rows: Breakdown[] }) {
  const max = rows.length > 0 ? rows[0].n : 1;

  return (
    <ul className="cc-legend" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {rows.map((row) => (
        <li key={row.label} className="cc-legend-item">
          <span
            className="cc-swatch"
            style={{ background: choroplethColor(row.n, max) }}
            aria-hidden="true"
          />
          <span>{row.label}</span>
          <span className="cc-num">{row.n}</span>
        </li>
      ))}
    </ul>
  );
}
