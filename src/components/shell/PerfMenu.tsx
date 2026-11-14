"use client";

import { Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { type PerfMode, useApp, useLite } from "@/state/store";

const OPTIONS: { id: PerfMode; label: string; hint: string }[] = [
  {
    id: "auto",
    label: "Auto",
    hint: "Full effects, but switches to Lite by itself if this device looks slow",
  },
  { id: "full", label: "Full", hint: "All animations and effects" },
  {
    id: "lite",
    label: "Lite",
    hint: "No animations, shadows or minimap. Best for older computers",
  },
];

/** Performance setting, plus the automatic slow-device detector. */
export function PerfMenu() {
  const mode = useApp((s) => s.perfMode);
  const setMode = useApp((s) => s.setPerfMode);
  const setAutoLite = useApp((s) => s.setAutoLite);
  const lite = useLite();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(false);

  // Remember the choice across visits.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("eco.perf");
      if (saved === "auto" || saved === "full" || saved === "lite")
        useApp.setState({ perfMode: saved });
    } catch {}
  }, []);

  // Lite styles hang off one attribute on the page.
  useEffect(() => {
    document.documentElement.dataset.lite = lite ? "true" : "false";
  }, [lite]);

  // Auto mode: time the frames while something animates. Two slow animations in a row
  // (under about 26 frames per second) switch to lite.
  useEffect(() => {
    if (mode !== "auto") return;
    let slow = 0;
    let lastSeq = -1;
    let raf = 0;
    const sample = () => {
      const deltas: number[] = [];
      let last = performance.now();
      const t0 = last;
      const tick = (now: number) => {
        deltas.push(now - last);
        last = now;
        if (now - t0 < 800) {
          raf = requestAnimationFrame(tick);
          return;
        }
        const avg =
          deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
        slow = avg > 38 ? slow + 1 : 0;
        if (slow >= 2 && !useApp.getState().autoLite) {
          setAutoLite(true);
          setNotice(true);
          setTimeout(() => setNotice(false), 9000);
        }
      };
      raf = requestAnimationFrame(tick);
    };
    const unsub = useApp.subscribe((s) => {
      if (
        s.autoLite ||
        !s.motion ||
        s.motion.seq === lastSeq ||
        s.motion.phase === "out"
      )
        return;
      lastSeq = s.motion.seq;
      sample();
    });
    return () => {
      unsub();
      cancelAnimationFrame(raf);
    };
  }, [mode, setAutoLite]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Performance"
        className={`flex items-center gap-1 rounded-md p-1.5 text-[11.5px] hover:bg-panel2 ${
          lite ? "text-accent" : "text-muted hover:text-ink"
        }`}
      >
        <Gauge size={16} />
        {lite && <span className="font-medium">Lite</span>}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="pop-in absolute right-0 top-full z-40 mt-1.5 w-64 rounded-xl border border-line bg-panel p-1.5 shadow-[var(--shadow)]">
            <div className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Performance
            </div>
            {OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setMode(o.id);
                  setOpen(false);
                }}
                aria-pressed={mode === o.id}
                className={`w-full rounded-lg px-2 py-1.5 text-left hover:bg-panel2 ${mode === o.id ? "bg-accent-soft" : ""}`}
              >
                <div className="text-[12.5px] font-medium text-ink">
                  {o.label}
                  {o.id === "auto" && lite && mode === "auto"
                    ? " (Lite now)"
                    : ""}
                </div>
                <div className="text-[11px] leading-snug text-muted">
                  {o.hint}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {notice && (
        <div
          role="status"
          className="pop-in absolute right-0 top-full z-40 mt-1.5 w-64 rounded-xl border border-line bg-panel p-2.5 text-[12px] text-ink shadow-[var(--shadow)]"
        >
          Switched to Lite mode because this device looked slow. Change it any
          time under Performance.
        </div>
      )}
    </div>
  );
}
