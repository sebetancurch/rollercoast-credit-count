import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

import { choroplethColor } from "@/lib/stats";

/**
 * Credits by country, as a choropleth.
 *
 * A server component: d3 projects the geometry and this emits finished <path>
 * elements, so no map library, no TopoJSON and no atlas download reach the
 * browser — only the SVG. The prototype did the same work client-side against a
 * CDN copy of the atlas; the picture is identical and the page ships less.
 *
 * The projection is computed against a fixed viewBox and the SVG scales to its
 * container, which also removes the prototype's resize listener.
 */

const WIDTH = 640;
const HEIGHT = Math.round(WIDTH * 0.48);

/** Our country names are the everyday ones; Natural Earth uses its own. */
const ALIASES: Record<string, string> = {
  "United States": "United States of America",
  UK: "United Kingdom",
};

type CountryFeature = {
  properties?: { name?: string } | null;
};

// The atlas JSON and topojson-client's own types do not line up without pulling
// in topojson-specification, so the topology is handed over structurally.
type FeatureArgs = Parameters<typeof feature>;
const topology = worldAtlas as unknown as FeatureArgs[0];
const converted = feature(topology, topology.objects.countries as FeatureArgs[1]);

const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], converted);
const toPath = geoPath(projection);

/** Antarctica is a third of the frame and never has a coaster on it. */
const COUNTRIES = ("features" in converted ? converted.features : [converted]).filter(
  (f) => (f as CountryFeature).properties?.name !== "Antarctica",
);

export function CreditMap({ counts }: { counts: Record<string, number> }) {
  const resolved: Record<string, number> = {};
  for (const [name, n] of Object.entries(counts)) {
    resolved[ALIASES[name] ?? name] = n;
  }

  const max = Math.max(1, ...Object.values(resolved));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="auto"
      role="img"
      aria-label={`World map: credits in ${Object.keys(counts).length} countries`}
      style={{ display: "block", overflow: "visible" }}
    >
      {COUNTRIES.map((country, index) => {
        const name = (country as CountryFeature).properties?.name ?? "";
        const n = resolved[name] ?? 0;
        const d = toPath(country);
        if (!d) return null;

        return (
          <path
            key={`${name}-${index}`}
            d={d}
            fill={choroplethColor(n, max)}
            stroke="var(--color-bg)"
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          >
            <title>
              {name}
              {n ? ` — ${n} ${n === 1 ? "credit" : "credits"}` : " — no credits"}
            </title>
          </path>
        );
      })}
    </svg>
  );
}
