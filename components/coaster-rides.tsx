"use client";

import { useState } from "react";

import { deleteRide } from "@/app/dashboard/actions";
import { ConfirmDialog, type Confirmation } from "@/components/confirm-dialog";
import { EditRideDialog, type EditTarget } from "@/components/edit-ride-dialog";
import { formatDate } from "@/lib/format";
import type { RideWithCoaster } from "@/lib/types";

/** Your rides on one coaster, with the same edit and delete controls as the history. */
export function CoasterRides({ rides }: { rides: RideWithCoaster[] }) {
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [confirming, setConfirming] = useState<Confirmation | null>(null);

  if (rides.length === 0) {
    return (
      <p style={{ fontSize: 15, maxWidth: "44ch", textWrap: "pretty" }}>
        Not a credit yet. Log a ride and it becomes one.
      </p>
    );
  }

  return (
    <>
      <div className="cc-scroll-x">
        <table className="table">
          <caption className="text-muted" style={{ captionSide: "bottom", textAlign: "left", fontSize: 12, paddingTop: 10 }}>
            Your rides on this coaster, newest first.
          </caption>
          <thead className="cc-sr-only">
            <tr>
              <th>Date</th>
              <th>Note</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rides.map((ride) => (
              <tr key={ride.id}>
                <td className="cc-nowrap cc-tabnum" style={{ width: 120 }}>
                  {formatDate(ride.ridden_on)}
                </td>
                <td style={{ fontSize: 13, textWrap: "pretty" }}>{ride.note ?? "—"}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap", width: 130 }}>
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
                    <span className="cc-sr-only">
                      Edit ride on {formatDate(ride.ridden_on)},{" "}
                    </span>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost cc-danger"
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
                    <span className="cc-sr-only">
                      Delete ride on {formatDate(ride.ridden_on)},{" "}
                    </span>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditRideDialog target={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog confirmation={confirming} onClose={() => setConfirming(null)} />
    </>
  );
}
