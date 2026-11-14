"use client";

import { X } from "lucide-react";
import { LENS_BY_ID } from "@/domain/lenses";
import { useApp } from "@/state/store";
import { useDevice } from "@/lib/useDevice";
import { LensIcon } from "./lensIcons";
import type { LensState } from "@/domain/lenses";

/** What the colours mean right now. Tap a row to isolate that group; tap again to release it. */
export function LensLegend({ state }: { state: LensState }) {
  const def = LENS_BY_ID[state.id];
  const setLens = useApp((s) => s.setLens);
  const setFocus = useApp((s) => s.setLensFocus);
  const compact = useDevice() !== "desktop";
  if (state.id === "kind") return null;
  return (
    <div
      className={`pop-in absolute z-[5] overflow-hidden rounded-xl border border-line bg-panel/95 shadow-[var(--shadow)] backdrop-blur-sm ${
        compact
          ? "bottom-2 right-2 w-[min(15rem,56%)]"
          : "bottom-[9.5rem] right-3 w-[15.5rem]"
      }`}
    >
      <div className="flex items-start gap-2 border-b border-line px-3 py-2">
        <span className="mt-0.5 text-accent">
          <LensIcon name={def.icon} size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-ink">{def.label}</div>
          <div className="text-[10.5px] leading-snug text-muted">
            {def.question}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLens("kind")}
          aria-label="Turn the lens off"
          title="Turn the lens off"
          className="rounded p-0.5 text-muted hover:bg-panel2 hover:text-ink"
        >
          <X size={14} />
        </button>
      </div>
      <ul className="max-h-[40vh] overflow-y-auto p-1">
        {state.legend.length === 0 && (
          <li className="px-2 py-1.5 text-[11px] text-muted">
            Nothing here matches this lens.
          </li>
        )}
        {state.legend.map(({ cat, count }) => {
          const on = state.focus === cat.key;
          return (
            <li key={cat.key}>
              <button
                type="button"
                onClick={() => setFocus(on ? null : cat.key)}
                aria-pressed={on}
                title={on ? "Show everything again" : "Show only this group"}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11.5px] ${
                  on ? "bg-accent-soft text-accent" : "text-ink hover:bg-panel2"
                } ${state.focus && !on ? "opacity-50" : ""}`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-[4px]"
                  style={{ background: cat.color }}
                />
                <span className="min-w-0 flex-1 truncate">{cat.label}</span>
                <span className="text-[10.5px] tabular-nums text-muted">
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
