"use client";

import { X } from "lucide-react";
import { useTour } from "@/state/tour";

/** One line of "now do this", shown after a try. */
export function CoachToast() {
  const coach = useTour((s) => s.coach);
  const say = useTour((s) => s.say);
  if (!coach) return null;
  return (
    <div
      role="status"
      className="pop-in fixed bottom-14 left-1/2 z-[60] flex w-[min(460px,calc(100vw-24px))] -translate-x-1/2 items-start gap-2 rounded-xl border border-line bg-panel px-3 py-2.5 text-[12.5px] text-ink shadow-[var(--shadow)]"
    >
      <span className="flex-1">{coach}</span>
      <button
        type="button"
        onClick={() => say(null)}
        aria-label="Dismiss"
        className="text-muted hover:text-ink"
      >
        <X size={14} />
      </button>
    </div>
  );
}
