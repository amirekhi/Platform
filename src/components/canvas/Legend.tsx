"use client";

import { useState } from "react";
import { LAYERS, NODE_KINDS, RELATION_TYPES } from "@/domain/registry";
import { MIXED_COLOR } from "@/domain/relationStyle";
import { RELATION_HELP } from "@/domain/relationHelp";
import { lineWidth } from "./lineWidth";
import type { NodeKind, RelationType } from "@/domain/types";
import { KindShape } from "../shapes";

/** Shape gallery: every kind has its own silhouette. Collapsible so it never gets in the way. */
export function Legend() {
  const [tab, setTab] = useState<"shapes" | "lines" | null>(null);
  const open = tab === "shapes";
  const kinds = Object.keys(NODE_KINDS) as NodeKind[];
  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-10 w-max max-w-[calc(100%-9rem)] -translate-x-1/2">
      <div className="rounded-xl border border-line bg-panel/95 px-3 py-2 text-[11.5px] text-muted shadow-[var(--shadow)]">
        <div className="flex items-center gap-5 text-[10px] font-semibold uppercase tracking-wider">
          {(["shapes", "lines"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab((c) => (c === t ? null : t))}
              aria-expanded={tab === t}
              className={`flex flex-1 items-center justify-between gap-3 hover:text-ink ${
                tab === t ? "text-ink" : ""
              }`}
            >
              {t === "shapes" ? "Shapes" : "Lines"} {tab === t ? "−" : "+"}
            </button>
          ))}
        </div>
        {tab === "lines" && <LinesHelp />}
        {open && (
          <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {LAYERS.map((l) => {
              const ks = kinds.filter((k) => NODE_KINDS[k].layer === l.id);
              if (!ks.length) return null;
              return (
                <div key={l.id}>
                  <div className="mb-1 text-[9.5px] uppercase tracking-wider">
                    {l.label}
                  </div>
                  <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
                    {ks.map((k) => (
                      <li
                        key={k}
                        className="flex w-[64px] flex-col items-center text-center leading-tight"
                      >
                        <KindShape kind={k} size={30} />
                        <span className="mt-0.5 text-[9.5px]">
                          {NODE_KINDS[k].label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-1.5 whitespace-nowrap">
              <li className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-[#a78bfa]" />
                Detail circle
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-dashed border-line opacity-60" />
                Outside this level, or reached by expanding
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-5 border-t-2 border-dotted border-muted" />
                Lifted relation
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Sample({
  color = "var(--muted)",
  dash,
  width = 2,
  round,
  arrow = true,
}: {
  color?: string;
  dash?: string;
  width?: number;
  round?: boolean;
  arrow?: boolean;
}) {
  return (
    <svg width="46" height="14" viewBox="0 0 46 14" aria-hidden className="shrink-0">
      <line
        x1="2"
        y1="7"
        x2={arrow ? 36 : 44}
        y2="7"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dash}
        strokeLinecap={round ? "round" : undefined}
      />
      {arrow && <path d="M34 2 L44 7 L34 12 Z" fill={color} />}
    </svg>
  );
}

/** What the lines mean: style, thickness, colour per relation type. */
function LinesHelp() {
  const types = Object.keys(RELATION_TYPES) as RelationType[];
  const row = "flex items-center gap-2";
  return (
    <div className="mt-2 max-h-64 w-[min(560px,calc(100vw-10rem))] space-y-3 overflow-y-auto pr-1 leading-snug">
      <div>
        <div className="mb-1 text-[9.5px] uppercase tracking-wider">
          How a line is drawn
        </div>
        <ul className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
          <li className={row}>
            <Sample />
            <span>
              <b className="text-ink">Solid:</b> a direct relation. The arrow
              points from the one that acts to the one acted on.
            </span>
          </li>
          <li className={row}>
            <Sample dash="6 4" />
            <span>
              <b className="text-ink">Dashed:</b> asynchronous or indirect.
              Messages, events and references, where nobody waits for an answer.
            </span>
          </li>
          <li className={row}>
            <Sample dash="0.1 7" width={3} round />
            <span>
              <b className="text-ink">Dotted:</b> lifted. It summarises
              relations between things inside the two shapes, shown here because
              they are collapsed.
            </span>
          </li>
          <li className={row}>
            <Sample dash="2 4" width={1} arrow={false} />
            <span>
              <b className="text-ink">Thin grey dots:</b> parent and child.
              Shown by Contains.
            </span>
          </li>
          <li className={row}>
            <span className="flex w-[46px] shrink-0 flex-col gap-[3px]">
              {[1, 2, 3, 6].map((n) => (
                <span
                  key={n}
                  className="block rounded-full bg-muted"
                  style={{ height: lineWidth(n, false) }}
                />
              ))}
            </span>
            <span>
              <b className="text-ink">Thickness:</b> how many relations one line
              stands for (1, 2, 3, then 6 and up). The badge shows the number.
            </span>
          </li>
          <li className={row}>
            <span className="w-[46px] shrink-0 text-center text-[10px] opacity-60">
              faded
            </span>
            <span>
              <b className="text-ink">Faded:</b> not part of what you selected or
              the lens you chose. Select a node to light up its own lines.
            </span>
          </li>
        </ul>
      </div>
      <div>
        <div className="mb-1 text-[9.5px] uppercase tracking-wider">
          Colour is the kind of relation
        </div>
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-line px-2 py-1.5">
          <svg width="46" height="14" viewBox="0 0 46 14" aria-hidden className="shrink-0">
            <line x1="2" y1="7" x2="36" y2="7" stroke={MIXED_COLOR} strokeWidth="4" />
            {["#fbbf24", "#a78bfa", "#34d399"].map((c, i) => (
              <line
                key={c}
                x1="2"
                y1="7"
                x2="36"
                y2="7"
                stroke={c}
                strokeWidth="2.4"
                strokeDasharray="5 10"
                strokeDashoffset={-5 * i}
              />
            ))}
            <path d="M34 2 L44 7 L34 12 Z" fill={MIXED_COLOR} />
          </svg>
          <span>
            <b className="text-ink">Mixed (stone, striped):</b> one line that
            stands for different kinds of relations between the same two
            things. Each stripe is one of the kinds, and hovering the badge
            lists them. It is dashed only if every one of them is.
          </span>
        </div>
        <ul className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
          {types.map((t) => {
            const d = RELATION_TYPES[t];
            return (
              <li key={t} className={row}>
                <Sample color={d.color} dash={d.async ? "6 4" : undefined} />
                <span>
                  <b className="text-ink">{d.label}</b>
                  {d.async ? " (dashed)" : ""}: {RELATION_HELP[t]}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
