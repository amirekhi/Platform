"use client";

import { Sparkles } from "lucide-react";
import { TRIES } from "@/state/tries";

/** "Try this" suggestions. Used in the help menu and in empty states. */
export function TryList({
  limit = 5,
  compact = false,
  onRun,
}: {
  limit?: number;
  compact?: boolean;
  onRun?: () => void;
}) {
  return (
    <ul className={compact ? "space-y-1" : "space-y-1.5"}>
      {TRIES.slice(0, limit).map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => {
              onRun?.();
              void t.run();
            }}
            className="group flex w-full items-start gap-2 rounded-lg border border-line bg-panel px-2.5 py-2 text-left hover:border-accent"
          >
            <Sparkles size={13} className="mt-0.5 shrink-0 text-accent" />
            <span className="min-w-0">
              <span className="block text-[12.5px] font-medium text-ink">
                {t.title}
              </span>
              {!compact && (
                <span className="block text-[11.5px] text-muted">{t.why}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
