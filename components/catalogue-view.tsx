"use client";

import { useMemo, useState } from "react";

import { deleteCoaster } from "@/app/admin/actions";
import { CoasterFormDialog, type CoasterFormTarget } from "@/components/coaster-form-dialog";
import { ConfirmDialog, type Confirmation } from "@/components/confirm-dialog";
import { duplicateIds } from "@/lib/stats";
import type { Coaster } from "@/lib/types";

/**
 * The shared catalogue, with its full CRUD.
 *
 * Filtering happens in the browser over the rows the server already sent: the
 * catalogue is world-readable and small, so a round trip per keystroke would
 * buy nothing. The mutations are server actions, and they are what checks the
 * admin role.
 */
export function CatalogueView({
  coasters,
  countries,
}: {
  coasters: Coaster[];
  countries: string[];
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("all");
  const [dupesOnly, setDupesOnly] = useState(false);
  const [formTarget, setFormTarget] = useState<CoasterFormTarget>(null);
  const [confirming, setConfirming] = useState<Confirmation | null>(null);

  const dupes = useMemo(() => duplicateIds(coasters), [coasters]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return coasters.filter((c) => {
      if (country !== "all" && c.country !== country) return false;
      if (dupesOnly && !dupes.has(c.id)) return false;
      if (!q) return true;
      return `${c.name} ${c.park} ${c.manufacturer} ${c.country}`.toLowerCase().includes(q);
    });
  }, [coasters, country, dupes, dupesOnly, query]);

  return (
    <>
      <div className="cc-filters">
        <div className="field" style={{ width: 280 }}>
          <label htmlFor="cc-catsearch">Search</label>
          <input
            className="input"
            id="cc-catsearch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Coaster, park or manufacturer"
          />
        </div>

        <div className="field" style={{ width: 200 }}>
          <label htmlFor="cc-catcountry">Country</label>
          <select
            className="input"
            id="cc-catcountry"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="all">All countries</option>
            {countries.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={dupesOnly}
          onClick={() => setDupesOnly((on) => !on)}
        >
          {dupesOnly ? "Showing duplicates" : "Possible duplicates"} ({dupes.size})
        </button>

        <button type="button" className="btn btn-primary" onClick={() => setFormTarget("new")}>
          Add coaster
        </button>
      </div>

      <div className="cc-scroll-x">
        <table className="table" style={{ marginTop: "var(--space-6)" }}>
          <caption className="text-muted" style={{ captionSide: "bottom", textAlign: "left", fontSize: 12, paddingTop: 10 }}>
            {rows.length} of {coasters.length} coasters shown.
          </caption>
          <thead>
            <tr>
              <th>Coaster</th>
              <th style={{ width: 200 }}>Park</th>
              <th style={{ width: 140 }}>Country</th>
              <th style={{ width: 210 }}>Manufacturer</th>
              <th style={{ width: 100 }}>Type</th>
              <th style={{ width: 150, textAlign: "right" }}>
                <span className="text-muted">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((coaster) => (
              <tr key={coaster.id}>
                <td>
                  <span className="cc-row-title">{coaster.name}</span>
                  {dupes.has(coaster.id) ? (
                    <span className="tag tag-accent-2" style={{ marginLeft: 8 }}>
                      Possible duplicate
                    </span>
                  ) : null}
                </td>
                <td className="text-muted" style={{ fontSize: 13 }}>
                  {coaster.park}
                </td>
                <td className="text-muted" style={{ fontSize: 13 }}>
                  {coaster.country}
                </td>
                <td className="text-muted" style={{ fontSize: 13 }}>
                  {coaster.manufacturer}
                </td>
                <td style={{ fontSize: 13 }}>{coaster.type}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setFormTarget(coaster)}
                  >
                    <span className="cc-sr-only">Edit {coaster.name}, </span>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() =>
                      setConfirming({
                        title: `Remove ${coaster.name}?`,
                        body: "This coaster is shared by every user. Removing it changes their credit counts as well as yours. Only do this for duplicates and bad data.",
                        cta: "Remove coaster",
                        done: `${coaster.name} removed from the catalogue.`,
                        run: () => deleteCoaster(coaster.id),
                      })
                    }
                  >
                    <span className="cc-sr-only">Remove {coaster.name}, </span>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p style={{ marginTop: "var(--space-6)", maxWidth: "48ch" }}>
          Nothing matches those filters.
        </p>
      ) : null}

      <CoasterFormDialog target={formTarget} onClose={() => setFormTarget(null)} />
      <ConfirmDialog confirmation={confirming} onClose={() => setConfirming(null)} />
    </>
  );
}
