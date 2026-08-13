"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Modal shell for the four dialogs in the design.
 *
 * Built on <dialog showModal()> so the browser supplies the focus trap, the
 * inert background and Escape-to-close rather than us reimplementing them. The
 * design's own backdrop is kept — ::backdrop styling is applied to the element
 * we render, so .dialog-backdrop wraps the panel instead.
 */

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Wider panel for the log-a-ride search and the coaster form. */
  width?: number;
};

export function Dialog({ open, title, onClose, children, width }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      style={width ? { width: `min(${width}px, 100%)` } : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click landing on the <dialog> itself is a click on the backdrop:
        // the panel's own content sits in children below.
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="dialog-title" id={titleId}>
        {title}
      </div>
      {children}
    </dialog>
  );
}
