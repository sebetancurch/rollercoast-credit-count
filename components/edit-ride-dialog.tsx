"use client";

import { useState, useTransition } from "react";

import { updateRide } from "@/app/dashboard/actions";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";

export type EditTarget = {
  rideId: string;
  coasterName: string;
  riddenOn: string;
  note: string;
};

/** Edit one of your own rides. Which ride belongs to whom is settled server-side. */
export function EditRideDialog({
  target,
  onClose,
}: {
  target: EditTarget | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={target !== null} onClose={onClose} title="Edit ride">
      {/* Keyed on the ride, so opening a different one mounts a fresh form
          rather than syncing props into state through an effect. */}
      {target ? <EditRideForm key={target.rideId} target={target} onClose={onClose} /> : null}
    </Dialog>
  );
}

function EditRideForm({ target, onClose }: { target: EditTarget; onClose: () => void }) {
  const [riddenOn, setRiddenOn] = useState(target.riddenOn);
  const [note, setNote] = useState(target.note);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const flash = useToast();

  function save() {
    startTransition(async () => {
      const result = await updateRide({ rideId: target.rideId, riddenOn, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      flash("Ride updated.");
      onClose();
    });
  }

  return (
    <>
      <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
        {target.coasterName}
      </p>

      <div className="field">
        <label htmlFor="cc-editdate">Date ridden</label>
        <input
          className="input"
          id="cc-editdate"
          type="date"
          value={riddenOn}
          onChange={(e) => setRiddenOn(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="cc-editnote">Note</label>
        <textarea
          className="input"
          id="cc-editnote"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error ? (
        <div className="cc-field-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </>
  );
}
