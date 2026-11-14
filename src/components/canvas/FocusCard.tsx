"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getDataSource } from "@/data";
import { HEALTH_COLOR, LIFECYCLE_LABEL, NODE_KINDS } from "@/domain/registry";
import type { GraphView, Health, Id } from "@/domain/types";
import { useAsync } from "@/lib/useAsync";
import { useApp } from "@/state/store";
import { KindIcon } from "../icons";
import { KindShape } from "../shapes";

const HEALTH_TEXT: Record<Health, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
  unknown: "No data",
};
const RANK: Record<Health, number> = {
  down: 3,
  degraded: 2,
  healthy: 1,
  unknown: 0,
};

/**
 * Always-on summary of what the view is about: the focused item (or the whole enterprise
 * when nothing is focused), and a few counts of what is on screen. It never hides behind
 * a click, but it folds down to one line when you want the room.
 */
export function FocusCard({
  rootId,
  mode,
  view,
}: {
  rootId: Id | null;
  mode: "around" | "inside";
  view: GraphView | undefined;
}) {
  // Starts as a small chip; tap it to open. Drag it anywhere you like.
  const [folded, setFolded] = useState(true);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem("eco.focuscard");
      return raw ? (JSON.parse(raw) as { x: number; y: number }) : null;
    } catch {
      return null;
    }
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const dragged = useRef(false);

  const placed = pos !== null;
  // Keep it on screen when the canvas gets smaller or the card grows.
  useEffect(() => {
    const card = cardRef.current;
    const parent = card?.offsetParent as HTMLElement | null;
    if (!card || !parent || !placed) return;
    const fit = () =>
      setPos((p) => {
        if (!p) return p;
        const x = Math.max(
          0,
          Math.min(p.x, parent.clientWidth - card.offsetWidth),
        );
        const y = Math.max(
          0,
          Math.min(p.y, parent.clientHeight - card.offsetHeight),
        );
        return x === p.x && y === p.y ? p : { x, y };
      });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    ro.observe(card);
    return () => ro.disconnect();
  }, [placed]);

  const onDown = (e: React.PointerEvent) => {
    const card = cardRef.current;
    const parent = card?.offsetParent as HTMLElement | null;
    if (!card || !parent) return;
    dragged.current = false;
    const r = card.getBoundingClientRect();
    const pr = parent.getBoundingClientRect();
    drag.current = {
      sx: e.clientX,
      sy: e.clientY,
      ox: r.left - pr.left,
      oy: r.top - pr.top,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const card = cardRef.current;
    const parent = card?.offsetParent as HTMLElement | null;
    if (!d || !card || !parent) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
    d.moved = true;
    setPos({
      x: Math.max(
        0,
        Math.min(
          d.ox + e.clientX - d.sx,
          parent.clientWidth - card.offsetWidth,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          d.oy + e.clientY - d.sy,
          parent.clientHeight - card.offsetHeight,
        ),
      ),
    });
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) {
      dragged.current = true;
      try {
        if (pos) localStorage.setItem("eco.focuscard", JSON.stringify(pos));
      } catch {}
    }
  };
  const selId = useApp((s) => {
    const sel = s.tabs.find((t) => t.id === s.activeTabId)?.selection;
    return sel?.type === "node" ? sel.id : null;
  });
  const { data: node } = useAsync(`focus-node:${rootId ?? "~"}`, async () =>
    rootId ? await getDataSource().getNode(rootId) : null,
  );

  if (!view) return null;
  const members = view.nodes.filter(
    (n) => n.role !== "ghost" && n.containerId === null,
  );
  const ghosts = view.nodes.filter((n) => n.role === "ghost").length;
  const rootView = view.nodes.find((n) => n.id === rootId);
  const attention = members.filter(
    (n) => n.health === "degraded" || n.health === "down",
  ).length;
  const worst = (rootView ? [rootView, ...members] : members).reduce<Health>(
    (w, n) => (RANK[n.health] > RANK[w] ? n.health : w),
    "unknown",
  );
  const health = rootView?.health ?? worst;
  const sel =
    selId && selId !== rootId ? view.nodes.find((n) => n.id === selId) : null;

  const title = rootId
    ? (node?.name ?? rootView?.name ?? "…")
    : "Whole enterprise";
  const kind = node?.kind ?? rootView?.kind;
  const subtitle = rootId
    ? `${kind ? NODE_KINDS[kind].label : ""}${node ? ` · ${LIFECYCLE_LABEL[node.lifecycle]}` : ""}`
    : "Everything at the top level";
  const summary = rootId
    ? (node?.summary ?? "")
    : "Companies, buildings, stores, systems and the teams that run them.";
  const owner = rootView?.details.owner?.name ?? null;
  const headline = rootView?.details.monitoring?.headline;

  const stats: { label: string; value: number; warn?: boolean }[] = [
    { label: mode === "inside" ? "Inside" : "Nodes", value: members.length },
    {
      label: "Relations",
      value: view.relations.reduce((n, r) => n + (r.count ?? 1), 0),
    },
    { label: "Need attention", value: attention, warn: attention > 0 },
    { label: "Outside", value: ghosts },
  ];

  return (
    <div
      ref={cardRef}
      className={`absolute z-[5] transition-[width] duration-300 ease-out ${
        folded ? "w-[11rem]" : "w-[17rem] max-w-[calc(100%-1rem)]"
      } ${pos ? "" : "right-3 top-3"}`}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      <div className="overflow-hidden rounded-xl border border-line bg-panel/95 text-ink shadow-[var(--shadow)] backdrop-blur-sm">
        <button
          type="button"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={() => {
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            setFolded((f) => !f);
          }}
          aria-expanded={!folded}
          title={
            folded ? "Show focus details (drag to move)" : "Fold (drag to move)"
          }
          className={`flex w-full cursor-grab touch-none select-none items-center gap-2 text-left active:cursor-grabbing ${
            folded ? "px-2 py-1" : "px-3 py-2"
          }`}
        >
          <span className="flex shrink-0 items-center justify-center">
            {kind ? (
              <KindShape kind={kind} size={folded ? 20 : 32} />
            ) : (
              <span className="text-accent">
                <KindIcon kind="company" size={folded ? 16 : 20} />
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            {!folded && (
              <span className="block text-[9.5px] font-semibold uppercase tracking-wider text-muted">
                Focus
              </span>
            )}
            <span
              className={`block truncate font-semibold ${folded ? "text-[11.5px]" : "text-[13px]"}`}
            >
              {title}
            </span>
            {!folded && (
              <span className="block truncate text-[11px] text-muted">
                {subtitle}
              </span>
            )}
          </span>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: HEALTH_COLOR[health] }}
            title={`Health: ${HEALTH_TEXT[health]}`}
          />
          {!folded && <ChevronUp size={14} className="shrink-0 text-muted" />}
        </button>

        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: folded ? "0fr" : "1fr" }}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-2 border-t border-line px-3 pb-3 pt-2">
              {summary && (
                <p className="line-clamp-3 text-[11.5px] leading-snug text-muted">
                  {summary}
                </p>
              )}
              <dl className="grid grid-cols-4 gap-1 text-center">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg bg-panel2 px-1 py-1.5"
                  >
                    <dd
                      className={`text-[14px] font-semibold leading-none ${
                        s.warn ? "text-[#f59e0b]" : ""
                      }`}
                    >
                      {s.value}
                    </dd>
                    <dt className="mt-1 text-[9px] leading-tight text-muted">
                      {s.label}
                    </dt>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: HEALTH_COLOR[health] }}
                  />
                  {HEALTH_TEXT[health]}
                </span>
                {owner && (
                  <span>
                    Owner: <span className="text-ink">{owner}</span>
                  </span>
                )}
                {headline && (
                  <span>
                    {headline.label}:{" "}
                    <span className="text-ink">
                      {Math.round(headline.value * 10) / 10}
                      {headline.unit}
                    </span>
                  </span>
                )}
              </div>
              {sel && (
                <div className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5">
                  <span style={{ color: NODE_KINDS[sel.kind].color }}>
                    <KindIcon kind={sel.kind} size={15} />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-[9px] uppercase tracking-wider text-muted">
                      Selected
                    </span>
                    <span className="block truncate text-[12px] font-medium">
                      {sel.name}
                    </span>
                  </span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: HEALTH_COLOR[sel.health] }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
