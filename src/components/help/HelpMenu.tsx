"use client";

import { CircleHelp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTour } from "@/state/tour";
import { TryList } from "./TryList";

/** "?" button: replay the tour or pick something to try. */
export function HelpMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const start = useTour((s) => s.start);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-tour="help"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Help and things to try"
        title="Help and things to try"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-panel2 hover:text-ink"
      >
        <CircleHelp size={16} />
      </button>
      {open && (
        <div className="pop-in absolute right-0 top-full z-50 mt-1.5 w-[320px] max-w-[calc(100vw-16px)] rounded-xl border border-line bg-panel p-3 shadow-[var(--shadow)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              start();
            }}
            className="mb-3 w-full rounded-lg bg-accent px-3 py-2 text-[12.5px] font-medium text-white"
          >
            Take the 4-step tour
          </button>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Try this
          </div>
          <TryList onRun={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
