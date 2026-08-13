"use client";

import { useMemo, useState, useTransition } from "react";

import { logRide } from "@/app/dashboard/actions";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { todayIso } from "@/lib/format";
import type { Coaster } from "@/lib/types";

/**
 * Log a ride, in two steps: find the coaster in the shared catalogue, then give
 * the date and an optional note.
 *
 * The catalogue is handed in from the server rather than searched over the
 * wire — it is 47 rows and world-readable, so filtering it in the browser is
 * both simpler and faster than a round trip per keystroke.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  coasters: Coaster[];
  /** Rides already logged per coaster, for the "Ridden 3×" badge. */
  rideCounts: Record<string, number>;
  /** Skip the search and go straight to step two, from a coaster's own page. */
  initialCoaster?: Coaster | null;
};

const MAX_RESULTS = 7;

export function LogRideDialog({
  open,
  onClose,
  coasters,
  rideCounts,
  initialCoaster = null,
}: Props) {
  const [picked, setPicked] = useState<Coaster | null>(initialCoaster);
  const [query, setQuery] = useState("");
  const [riddenOn, setRiddenOn] = useState(todayIso());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const flash = useToast();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return coasters
      .filter((c) =>
        q === ""
          ? true
          : `${c.name} ${c.park} ${c.country} ${c.manufacturer} ${c.type}`
              .toLowerCase()
              .includes(q),
      )
      .slice(0, MAX_RESULTS);
  }, [coasters, query]);

  function close() {
    setPicked(initialCoaster);
    setQuery("");
    setNote("");
    setRiddenOn(todayIso());
    setError(null);
    onClose();
  }

  function save() {
    if (!picked) return;
    const coaster = picked;

    startTransition(async () => {
      const result = await logRide({ coasterId: coaster.id, riddenOn, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const already = rideCounts[coaster.id] ?? 0;
      flash(
        already === 0
          ? `Logged. ${coaster.name} is a new credit.`
          : `Logged. ${coaster.name} — ride ${already + 1}, still one credit.`,
      );
      close();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      width={560}
      title={picked ? picked.name : "Log a ride"}
    >
      {!picked ? (
        <div className="cc-stack">
          <div className="field">
            <label htmlFor="cc-logsearch">Find the coaster</label>
            <input
              className="input"
              id="cc-logsearch"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nemesis, Cedar Point, Intamin…"
            />
          </div>

          <div className="cc-results">
            {results.map((coaster) => {
              const already = rideCounts[coaster.id] ?? 0;
              return (
                <button
                  key={coaster.id}
                  type="button"
                  className="cc-result"
                  onClick={() => setPicked(coaster)}
                >
                  <span>
                    <span className="cc-num" style={{ fontSize: 15 }}>
                      {coaster.name}
                    </span>
                    <span className="text-muted" style={{ fontSize: 12, display: "block" }}>
                      {coaster.park} · {coaster.country} · {coaster.manufacturer} ·{" "}
                      {coaster.type}
                    </span>
                  </span>
                  <span className="tag tag-accent" style={{ flex: "none" }}>
                    {already ? `Ridden ${already}×` : "New credit"}
                  </span>
                </button>
              );
            })}
          </div>

          {results.length === 0 ? (
            <div style={{ fontSize: 13 }}>
              Nothing in the catalogue matches. Ask an admin to add it.
            </div>
          ) : null}

          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={close}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="cc-stack">
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
            {picked.park} · {picked.country} · {picked.manufacturer} · {picked.type}
          </p>

          <div className="field">
            <label htmlFor="cc-logdate">Date ridden</label>
            <input
              className="input"
              id="cc-logdate"
              type="date"
              value={riddenOn}
              onChange={(e) => setRiddenOn(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="cc-lognote">Note (optional)</label>
            <textarea
              className="input"
              id="cc-lognote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Row, weather, who you rode with…"
            />
          </div>

          {error ? (
            <div className="cc-field-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="dialog-actions">
            {!initialCoaster ? (
              <button type="button" className="btn btn-ghost" onClick={() => setPicked(null)}>
                Change coaster
              </button>
            ) : null}
            <button type="button" className="btn btn-secondary" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save ride"}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
