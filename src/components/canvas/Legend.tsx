"use client";

import { useState } from "react";
import { LAYERS, NODE_KINDS } from "@/domain/registry";
import type { NodeKind } from "@/domain/types";
import { KindShape } from "../shapes";

/** Shape gallery: every kind has its own silhouette. Collapsible so it never gets in the way. */
export function Legend() {
  const [open, setOpen] = useState(false);
  const kinds = Object.keys(NODE_KINDS) as NodeKind[];
  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-10 w-max max-w-[calc(100%-9rem)] -translate-x-1/2">
      <div className="rounded-xl border border-line bg-panel/90 px-3 py-2 text-[11.5px] text-muted shadow-[var(--shadow)] backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-6 text-[10px] font-semibold uppercase tracking-wider hover:text-ink"
        >
          Shapes {open ? "−" : "+"}
        </button>
        {open && (
          <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {LAYERS.map((l) => {
              const ks = kinds.filter((k) => NODE_KINDS[k].layer === l.id);
              if (!ks.length) return null;
              return (
                <div key={l.id}>
                  <div className="mb-1 text-[9.5px] uppercase tracking-wider">{l.label}</div>
                  <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
                    {ks.map((k) => (
                      <li key={k} className="flex w-[64px] flex-col items-center text-center leading-tight">
                        <KindShape kind={k} size={30} />
                        <span className="mt-0.5 text-[9.5px]">{NODE_KINDS[k].label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-1.5 whitespace-nowrap">
              <li className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full border-2 border-[#a78bfa]" />Detail circle</li>
              <li className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 border-2 border-dashed border-line opacity-60" />Outside this level</li>
              <li className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dotted border-muted" />Lifted relation</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
