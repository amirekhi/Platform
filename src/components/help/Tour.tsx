"use client";

import { useEffect, useRef, useState } from "react";
import { useDevice } from "@/lib/useDevice";
import { TOUR_KEY, useTour } from "@/state/tour";

type Step = { sel: string; title: string; body: string };

function steps(touch: boolean): Step[] {
  return [
    {
      sel: "[data-node-id]",
      title: "Everything is a node",
      body: touch
        ? "Tap a node to select it. Use the small buttons under it to expand or go inside, and hold the grip to move it."
        : "Click a node to select it. Enter goes inside it, E expands it, and you can drag it anywhere.",
    },
    {
      sel: '[data-tour="path"]',
      title: "This is where you are",
      body: touch
        ? "Each step you take is added here. Tap Up or a name to go back, and use the arrows to undo and redo."
        : "Every step is added here. Backspace goes up, Ctrl+Z steps back, Ctrl+Y goes forward.",
    },
    {
      sel: '[data-tour="lens"]',
      title: "Lenses answer your question",
      body: "Recolour the map for your role: owners, health, docs, security and more. Problems fades everything healthy.",
    },
    {
      sel: '[data-tour="search"]',
      title: "Jump anywhere",
      body: "Search finds any system, document or person. The ? button replays this tour and has things to try.",
    },
  ];
}

type Box = { x: number; y: number; w: number; h: number };

function find(sel: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function Tour() {
  const { active, step, start, stop, setStep } = useTour();
  const device = useDevice();
  const touch = device !== "desktop";
  const list = steps(touch);
  const [box, setBox] = useState<Box | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // First visit: wait for the first node to appear, then begin.
  useEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem(TOUR_KEY);
    } catch {
      /* ignore */
    }
    if (seen) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (find("[data-node-id]")) {
        clearInterval(t);
        setTimeout(start, 700);
      } else if (tries > 40) clearInterval(t);
    }, 400);
    return () => clearInterval(t);
  }, [start]);

  const finish = () => {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* ignore */
    }
    stop();
  };

  // Follow the target while it moves or the window resizes.
  useEffect(() => {
    if (!active) return;
    const s = list[step];
    const measure = () => {
      const el = find(s.sel);
      if (!el) return setBox(null);
      const r = el.getBoundingClientRect();
      setBox((b) =>
        b &&
        Math.abs(b.x - r.left) < 1 &&
        Math.abs(b.y - r.top) < 1 &&
        Math.abs(b.w - r.width) < 1 &&
        Math.abs(b.h - r.height) < 1
          ? b
          : { x: r.left, y: r.top, w: r.width, h: r.height },
      );
    };
    measure();
    const t = setInterval(measure, 200);
    window.addEventListener("resize", measure);
    return () => {
      clearInterval(t);
      window.removeEventListener("resize", measure);
    };
  }, [active, step, list]);

  // Keys belong to the tour while it is open.
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        finish();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (step >= list.length - 1) finish();
        else setStep(step + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setStep(Math.max(0, step - 1));
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step]);

  useEffect(() => {
    if (active) nextRef.current?.focus();
  }, [active, step]);

  if (!active) return null;
  const s = list[step];
  const last = step === list.length - 1;
  const vw = typeof window === "undefined" ? 1200 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const cw = Math.min(320, vw - 24);
  const pad = 6;
  let left = vw / 2 - cw / 2;
  let top = vh / 2 - 80;
  if (box) {
    left = Math.min(Math.max(12, box.x + box.w / 2 - cw / 2), vw - cw - 12);
    const below = box.y + box.h + pad + 12;
    top = below + 190 < vh ? below : Math.max(12, box.y - pad - 12 - 180);
  }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-label="Quick tour">
      {/* Catches stray clicks so the tour is the only thing moving. */}
      <div className="absolute inset-0" onClick={finish} />
      {box ? (
        <div
          className="pointer-events-none absolute rounded-xl transition-all duration-300 ease-out"
          style={{
            left: box.x - pad,
            top: box.y - pad,
            width: box.w + pad * 2,
            height: box.h + pad * 2,
            boxShadow:
              "0 0 0 9999px rgba(8,12,24,.5), 0 0 0 2px var(--accent)",
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[rgba(8,12,24,.5)]" />
      )}
      <div
        className="absolute rounded-xl border border-line bg-panel p-3.5 shadow-[var(--shadow)] transition-all duration-300 ease-out"
        style={{ left, top, width: cw }}
      >
        <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-accent">
          {step + 1} of {list.length}
        </div>
        <div className="text-[14px] font-semibold text-ink">{s.title}</div>
        <p className="mt-1 text-[12.5px] leading-snug text-muted">{s.body}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-1 gap-1" aria-hidden>
            {list.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-4 bg-accent" : "w-1.5 bg-line"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-md px-2 py-1 text-[12px] text-muted hover:text-ink"
          >
            Skip
          </button>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-md px-2 py-1 text-[12px] text-ink hover:bg-panel2"
            >
              Back
            </button>
          )}
          <button
            ref={nextRef}
            type="button"
            onClick={() => (last ? finish() : setStep(step + 1))}
            className="rounded-md bg-accent px-3 py-1 text-[12px] font-medium text-white"
          >
            {last ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
