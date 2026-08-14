"use client";

import { useState, useTransition } from "react";

import { Dialog } from "@/components/dialog";
import type { ActionResult } from "@/app/dashboard/actions";
import { useToast } from "@/components/toast";

export type Confirmation = {
  title: string;
  body: string;
  cta: string;
  /** Message flashed once the server confirms. */
  done: string;
  run: () => Promise<ActionResult>;
};

/**
 * The one destructive confirmation in the app. Deliberately spells out the
 * consequence — deleting your only ride on a coaster costs you the credit, and
 * removing a coaster from the shared catalogue changes everyone's counts.
 */
export function ConfirmDialog({
  confirmation,
  onClose,
}: {
  confirmation: Confirmation | null;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const flash = useToast();

  function run() {
    if (!confirmation) return;
    const { run: action, done } = confirmation;

    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      flash(done);
      setError(null);
      onClose();
    });
  }

  return (
    <Dialog
      open={confirmation !== null}
      onClose={onClose}
      title={confirmation?.title ?? ""}
    >
      <p className="dialog-body" style={{ margin: 0, textWrap: "pretty" }}>
        {confirmation?.body}
      </p>

      {error ? (
        <div className="cc-field-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Keep it
        </button>
        <button
          type="button"
          className="btn btn-destructive"
          onClick={run}
          disabled={pending}
        >
          {pending ? "Working…" : (confirmation?.cta ?? "Delete")}
        </button>
      </div>
    </Dialog>
  );
}
