"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { getDataSource } from "@/data";
import { HEALTH_COLOR, LIFECYCLE_LABEL, NODE_KINDS } from "@/domain/registry";
import type { Alert, Health } from "@/domain/types";
import { useAsync } from "@/lib/useAsync";
import { useApp } from "@/state/store";
import { KindShape } from "../shapes";

const HEALTH_TEXT: Record<Health, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
  unknown: "No data",
};
const SEV = { critical: 3, warning: 2, info: 1 } as const;
const SEV_COLOR = {
  critical: "#f87171",
  warning: "#fbbf24",
  info: "#60a5fa",
} as const;
const W = 272;

/** Hover a node for a moment and its essentials appear, so you recognise it without clicking. */
export function HoverCard() {
  const hover = useApp((s) => s.hoverNode);
  const setHover = useApp((s) => s.setHoverNode);

  useEffect(() => {
    if (!hover) return;
    const hide = () => setHover(null);
    window.addEventListener("wheel", hide, { passive: true });
    window.addEventListener("pointerdown", hide);
    window.addEventListener("keydown", hide);
    return () => {
      window.removeEventListener("wheel", hide);
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("keydown", hide);
    };
  }, [hover, setHover]);

  const id = hover?.view.id ?? null;
  const { data: snap } = useAsync(`hover-mon:${id ?? "~"}`, async () =>
    id ? await getDataSource().getMonitoring(id) : null,
  );
  if (!hover || typeof document === "undefined") return null;

  const v = hover.view;
  const kind = NODE_KINDS[v.kind];
  const r = hover.rect;
  const left =
    r.right + 12 + W > window.innerWidth ? r.left - 12 - W : r.right + 12;
  const top = Math.max(8, Math.min(r.top, window.innerHeight - 250));
  const alert: Alert | undefined = [...(snap?.alerts ?? [])].sort(
    (a, b) => SEV[b.severity] - SEV[a.severity],
  )[0];
  const d = v.details;

  return createPortal(
    <div
      role="tooltip"
      className="pop-in pointer-events-none fixed z-[60] rounded-xl border border-line bg-panel p-3 text-ink shadow-[var(--shadow)]"
      style={{ left, top, width: W }}
    >
      <div className="flex items-center gap-2.5">
        <KindShape kind={v.kind} size={30} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-semibold">{v.name}</div>
          <div className="truncate text-[11px] text-muted">
            {kind.label} · {LIFECYCLE_LABEL[v.lifecycle]}
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: HEALTH_COLOR[v.health] }}
          />
          {HEALTH_TEXT[v.health]}
        </span>
      </div>
      {v.summary && (
        <p className="mt-2 line-clamp-3 text-[11.5px] leading-snug text-muted">
          {v.summary}
        </p>
      )}
      <div className="mt-2 space-y-1 text-[11.5px]">
        <div className="flex gap-1.5">
          <span className="w-12 shrink-0 text-muted">Owner</span>
          <span className="truncate">
            {d.owner?.name ?? "No owner recorded"}
          </span>
        </div>
        <div className="flex gap-1.5">
          <span className="w-12 shrink-0 text-muted">Alert</span>
          {alert ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: SEV_COLOR[alert.severity] }}
              />
              <span className="truncate">{alert.title}</span>
            </span>
          ) : v.alertCount > 0 ? (
            <span>
              {v.alertCount} {v.alertCount === 1 ? "problem" : "problems"}{" "}
              inside
            </span>
          ) : (
            <span className="text-muted">None</span>
          )}
        </div>
      </div>
      <dl className="mt-2.5 grid grid-cols-4 gap-1 text-center">
        {(
          [
            ["Docs", d.docs],
            ["Diagrams", d.diagrams],
            ["Relations", d.relations],
            ["Inside", v.childCount],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="rounded-lg bg-panel2 px-1 py-1">
            <dd className="text-[13px] font-semibold leading-none">{n}</dd>
            <dt className="mt-0.5 text-[9px] text-muted">{label}</dt>
          </div>
        ))}
      </dl>
    </div>,
    document.body,
  );
}
