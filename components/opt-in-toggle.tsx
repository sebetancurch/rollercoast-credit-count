"use client";

import { useTransition } from "react";

import { setLeaderboardOptIn } from "@/app/dashboard/actions";
import { useToast } from "@/components/toast";

/**
 * The one switch that decides whether this user appears on the public
 * leaderboard. Off by default — which is a property of the profile row, not of
 * this button; the button only asks the server to change it.
 */
export function OptInToggle({ optIn }: { optIn: boolean }) {
  const [pending, startTransition] = useTransition();
  const flash = useToast();

  const label = optIn
    ? "On — you appear on the leaderboard"
    : "Off — your credits are private";

  return (
    <button
      type="button"
      className="cc-toggle"
      aria-pressed={optIn}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setLeaderboardOptIn(!optIn);
          flash(
            optIn
              ? "Removed from the leaderboard."
              : "You now appear on the public leaderboard.",
          );
        })
      }
    >
      <span className="cc-toggle-track">
        <span className="cc-toggle-knob" />
      </span>
      <span className="cc-toggle-label">{label}</span>
    </button>
  );
}
