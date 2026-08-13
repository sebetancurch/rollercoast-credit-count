"use client";

import { useState, useTransition } from "react";

import { createCoaster, updateCoaster } from "@/app/admin/actions";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { COASTER_TYPES, type Coaster, type CoasterType } from "@/lib/types";

/** null = closed. A coaster = edit it. "new" = add one. */
export type CoasterFormTarget = Coaster | "new" | null;

type FormValues = {
  name: string;
  park: string;
  country: string;
  manufacturer: string;
  type: CoasterType;
};

const BLANK: FormValues = {
  name: "",
  park: "",
  country: "",
  manufacturer: "",
  type: "Steel",
};

export function CoasterFormDialog({
  target,
  onClose,
}: {
  target: CoasterFormTarget;
  onClose: () => void;
}) {
  const editing = target !== null && target !== "new" ? target : null;

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      width={520}
      title={editing ? `Edit ${editing.name}` : "Add a coaster"}
    >
      {/* Keyed on the coaster, so switching rows mounts a fresh form instead of
          syncing props into state through an effect. */}
      {target !== null ? (
        <CoasterForm key={editing?.id ?? "new"} coaster={editing} onClose={onClose} />
      ) : null}
    </Dialog>
  );
}

function CoasterForm({
  coaster,
  onClose,
}: {
  coaster: Coaster | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormValues>(
    coaster
      ? {
          name: coaster.name,
          park: coaster.park,
          country: coaster.country,
          manufacturer: coaster.manufacturer,
          type: coaster.type,
        }
      : BLANK,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const flash = useToast();

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = coaster
        ? await updateCoaster(coaster.id, form)
        : await createCoaster(form);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      flash(coaster ? `${form.name} updated.` : `${form.name} added to the catalogue.`);
      onClose();
    });
  }

  return (
    <>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}
      >
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="cc-cf-name">Name</label>
          <input
            className="input"
            id="cc-cf-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cc-cf-park">Park</label>
          <input
            className="input"
            id="cc-cf-park"
            value={form.park}
            onChange={(e) => set("park", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cc-cf-country">Country</label>
          <input
            className="input"
            id="cc-cf-country"
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cc-cf-maker">Manufacturer</label>
          <input
            className="input"
            id="cc-cf-maker"
            value={form.manufacturer}
            onChange={(e) => set("manufacturer", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cc-cf-type">Type</label>
          <select
            className="input"
            id="cc-cf-type"
            value={form.type}
            onChange={(e) => set("type", e.target.value as CoasterType)}
          >
            {COASTER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div style={{ fontSize: 12, color: "var(--color-accent-2-700)" }} role="alert">
          {error}
        </div>
      ) : null}

      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : coaster ? "Save changes" : "Add to catalogue"}
        </button>
      </div>
    </>
  );
}
