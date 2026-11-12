"use client";

import { useState } from "react";

/** Explains the shape language. Collapsible so it never gets in the way. */
export function Legend() {
  const [open, setOpen] = useState(true);
  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-10 w-max max-w-[calc(100%-9rem)] -translate-x-1/2">
      <div className="rounded-xl border border-line bg-panel/90 px-3 py-2 text-[11.5px] text-muted shadow-[var(--shadow)] backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-6 font-semibold uppercase tracking-wider text-[10px] hover:text-ink"
        >
          Shapes {open ? "−" : "+"}
        </button>
        {open && (
          <ul className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 whitespace-nowrap">
            <Item swatch={<span className="h-4 w-4 rounded-[5px] border-2 border-line bg-panel2" />}>Component (square)</Item>
            <Item swatch={<span className="h-4 w-4 rounded-[5px] border-2 border-accent bg-panel2" />}>Focus</Item>
            <Item swatch={<span className="h-4 w-4 rounded-full border-2 border-[#a78bfa] bg-panel2" />}>Detail (circle)</Item>
            <Item swatch={<span className="h-4 w-4 rounded-[5px] border-2 border-dashed border-line bg-panel2 opacity-60" />}>Outside this level</Item>
            <Item swatch={<span className="w-5 border-t-2 border-dotted border-muted" />}>Lifted relation</Item>
          </ul>
        )}
      </div>
    </div>
  );
}

function Item({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      {swatch}
      {children}
    </li>
  );
}
