"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { deleteRide } from "@/app/dashboard/actions";
import { ConfirmDialog, type Confirmation } from "@/components/confirm-dialog";
import { EditRideDialog, type EditTarget } from "@/components/edit-ride-dialog";
import { formatDate } from "@/lib/format";
import type { RideWithCoaster } from "@/lib/types";

/**
 * The full ride history with its edit and delete controls.
 *
 * Client-side because of the filter box and the two dialogs. The rows arrive
 * already scoped to this user from the server; the filter is a display
 * convenience over what the server chose to send, not an access decision.
 */
export function RidesView({ rides }: { rides: RideWithCoaster[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [confirming, setConfirming] = useState<Confirmation | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rides;
    return rides.filter((ride) =>
      `${ride.coaster.name} ${ride.coaster.park} ${ride.coaster.country} ${ride.coaster.manufacturer}`
        .toLowerCase()
        .includes(q),
    );
  }, [rides, query]);

  return (
    <>
      <div className="cc-filters">
        <div className="field" style={{ width: 320 }}>
          <label htmlFor="cc-ridesearch">Filter</label>
          <input
            className="input"
            id="cc-ridesearch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Coaster, park or country"
          />
        </div>
        <Link href="/dashboard/rides?log=1" className="btn btn-primary">
          Log a ride
        </Link>
      </div>

      {filtered.length > 0 ? (
        <div className="cc-scroll-x">
          <table className="table" style={{ marginTop: "var(--space-6)" }}>
            <caption className="text-muted" style={{ captionSide: "bottom", textAlign: "left", fontSize: 12, paddingTop: 10 }}>
              Every ride you have logged, newest first.
            </caption>
            <thead>
              <tr>
                <th style={{ width: 120 }}>Date</th>
                <th>Coaster</th>
                <th style={{ width: 190 }}>Park</th>
                <th style={{ width: 130 }}>Country</th>
                <th>Note</th>
                <th style={{ width: 130, textAlign: "right" }}>
                  <span className="text-muted">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ride) => (
                <tr key={ride.id}>
                  <td className="cc-nowrap cc-tabnum">{formatDate(ride.ridden_on)}</td>
                  <td>
                    <Link
                      href={`/dashboard/coasters/${ride.coaster_id}`}
                      className="cc-row-title"
                    >
                      {ride.coaster.name}
                    </Link>
                  </td>
                  <td className="text-muted" style={{ fontSize: 13 }}>
                    {ride.coaster.park}
                  </td>
                  <td className="text-muted" style={{ fontSize: 13 }}>
                    {ride.coaster.country}
                  </td>
                  <td style={{ fontSize: 13, maxWidth: "34ch", textWrap: "pretty" }}>
                    {ride.note ?? "—"}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        setEditing({
                          rideId: ride.id,
                          coasterName: ride.coaster.name,
                          riddenOn: ride.ridden_on,
                          note: ride.note ?? "",
                        })
                      }
                    >
                      <span className="cc-sr-only">Edit ride on {ride.coaster.name}, </span>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        setConfirming({
                          title: "Delete this ride?",
                          body: `${ride.coaster.name} on ${formatDate(ride.ridden_on)}. If it was your only ride on this coaster you lose the credit too.`,
                          cta: "Delete ride",
                          done: "Ride deleted.",
                          run: () => deleteRide(ride.id),
                        })
                      }
                    >
                      <span className="cc-sr-only">Delete ride on {ride.coaster.name}, </span>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ marginTop: "var(--space-8)", maxWidth: "48ch" }}>
          <h4>{rides.length === 0 ? "No rides yet" : "Nothing matches that"}</h4>
          <p style={{ fontSize: 15, textWrap: "pretty" }}>
            {rides.length === 0
              ? "Every credit starts as a logged ride. Find a coaster in the catalogue and add the date you rode it."
              : "Try a different coaster, park or country."}
          </p>
          {rides.length === 0 ? (
            <Link href="/dashboard/rides?log=1" className="btn btn-primary">
              Log a ride
            </Link>
          ) : null}
        </div>
      )}

      <EditRideDialog target={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog confirmation={confirming} onClose={() => setConfirming(null)} />
    </>
  );
}
