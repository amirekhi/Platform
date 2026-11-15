"use client";

import {
  ArrowDown,
  ArrowLeftRight,
  Flame,
  Route as RouteIcon,
  X,
} from "lucide-react";
import type { GraphSnapshot } from "@/domain/analysis";
import { NODE_KINDS, RELATION_TYPES } from "@/domain/registry";
import type { Id } from "@/domain/types";
import { useApp, type AnalysisState } from "@/state/store";
import { type AnalysisResult, ANALYSIS_COLOR } from "./marks";

function Who({ snap, id }: { snap: GraphSnapshot; id: Id }) {
  const n = snap.nodes.get(id);
  const focusNode = useApp((s) => s.focusNode);
  if (!n) return null;
  const k = NODE_KINDS[n.kind];
  return (
    <button
      type="button"
      onClick={() => void focusNode(id)}
      title={`Focus ${n.name}`}
      className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-panel2"
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: k.color }}
        aria-hidden
      />
      <span className="truncate text-[12.5px] font-medium text-ink">
        {n.name}
      </span>
      <span className="shrink-0 text-[10.5px] text-muted">{k.label}</span>
    </button>
  );
}

function Shell({
  title,
  icon,
  color,
  children,
}: {
  title: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  const clear = useApp((s) => s.clearAnalysis);
  return (
    <div
      role="region"
      aria-label="Analysis"
      className="pop-in absolute bottom-3 left-14 z-20 flex max-h-[min(46%,360px)] w-[min(340px,calc(100%-4.5rem))] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[var(--shadow)]"
    >
      <div className="flex items-start gap-2 border-b border-line px-3 py-2.5">
        <span style={{ color }} className="mt-0.5">
          {icon}
        </span>
        <div className="min-w-0 flex-1 text-[13px] font-semibold leading-tight text-ink">
          {title}
        </div>
        <button
          type="button"
          onClick={clear}
          aria-label="Close analysis (Esc)"
          title="Close (Esc)"
          className="text-muted hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {children}
      </div>
    </div>
  );
}

function Seg<T extends number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-line text-[11.5px]">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={`px-2 py-0.5 ${value === o.v ? "bg-accent text-white" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AnalysisPanel({
  analysis,
  snap,
  result,
}: {
  analysis: AnalysisState;
  snap: GraphSnapshot | null;
  result: AnalysisResult | null;
}) {
  const setBlast = useApp((s) => s.setBlast);
  const setRoute = useApp((s) => s.setPathRoute);
  const swap = useApp((s) => s.swapPath);
  const clear = useApp((s) => s.clearAnalysis);

  if (!snap)
    return (
      <Shell title="Working it out…" icon={<Flame size={15} />} color="#999">
        <div className="text-[12px] text-muted">Reading the graph.</div>
      </Shell>
    );

  if (analysis.kind === "blast" && result?.kind === "blast") {
    const root = snap.nodes.get(analysis.rootId);
    const byDepth = new Map<number, typeof result.items>();
    for (const it of result.items)
      byDepth.set(it.depth, [...(byDepth.get(it.depth) ?? []), it]);
    const owners = Object.entries(result.owners).sort((a, b) => b[1] - a[1]);
    return (
      <Shell
        color={ANALYSIS_COLOR.origin}
        icon={<Flame size={15} />}
        title={
          <>
            If {root?.name ?? "this"} goes down
          </>
        }
      >
        {result.items.length === 0 ? (
          <p className="text-[12.5px] text-muted">
            Nothing we know of depends on it. It can fail without breaking
            anything recorded in the graph. If that looks wrong, a dependency is
            probably missing from the model.
          </p>
        ) : (
          <>
            <p className="text-[12.5px] text-ink">
              <b>{result.items.length}</b> affected:{" "}
              <span style={{ color: ANALYSIS_COLOR.hard }}>
                {result.hardCount} stop working
              </span>
              , {result.softCount} degrade. Reaches {result.maxDepthReached}{" "}
              {result.maxDepthReached === 1 ? "hop" : "hops"} out.
            </p>
            {owners.length > 0 && (
              <div className="mt-2">
                <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                  Owners to tell
                </div>
                <div className="flex flex-wrap gap-1">
                  {owners.map(([id, n]) => (
                    <span
                      key={id}
                      className="rounded-full border border-line px-2 py-0.5 text-[11.5px] text-ink"
                    >
                      {snap.nodes.get(id)?.name ?? id} · {n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
          <span>Reach</span>
          <Seg
            value={analysis.maxDepth}
            options={[
              { v: 1, label: "1" },
              { v: 2, label: "2" },
              { v: 3, label: "3" },
              { v: 0, label: "All" },
            ]}
            onChange={(maxDepth) => setBlast({ maxDepth })}
          />
          <label className="ml-auto flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={analysis.includeSoft}
              onChange={(e) => setBlast({ includeSoft: e.target.checked })}
            />
            Include soft links
          </label>
        </div>
        {[...byDepth.entries()].map(([d, items]) => (
          <div key={d} className="mt-3">
            <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
              {d === 1 ? "Directly" : `${d} hops away`}
            </div>
            <ul>
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-1">
                  <Who snap={snap} id={it.id} />
                  <span
                    className="ml-auto shrink-0 rounded px-1 text-[10px] uppercase"
                    style={{
                      color:
                        it.strength === "hard"
                          ? ANALYSIS_COLOR.hard
                          : ANALYSIS_COLOR.soft,
                    }}
                    title={
                      it.reason === "part-of"
                        ? "Contains something that is affected"
                        : it.strength === "hard"
                          ? "Stops working"
                          : "Degrades"
                    }
                  >
                    {it.reason === "part-of"
                      ? "partly"
                      : it.strength === "hard"
                        ? "down"
                        : "soft"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Shell>
    );
  }

  if (analysis.kind === "path") {
    const from = snap.nodes.get(analysis.fromId);
    if (!analysis.toId || result?.kind !== "path")
      return (
        <Shell
          color={ANALYSIS_COLOR.path}
          icon={<RouteIcon size={15} />}
          title={<>Trace a path from {from?.name}</>}
        >
          <p className="text-[12.5px] text-ink">
            Now pick the destination: click any node on the canvas.
          </p>
          <button
            type="button"
            onClick={clear}
            className="mt-3 rounded-md border border-line px-2.5 py-1 text-[12px] text-ink hover:border-accent"
          >
            Cancel
          </button>
        </Shell>
      );
    const to = snap.nodes.get(analysis.toId);
    const idx = Math.min(analysis.route, Math.max(0, result.routes.length - 1));
    const route = result.routes[idx];
    return (
      <Shell
        color={ANALYSIS_COLOR.path}
        icon={<RouteIcon size={15} />}
        title={
          <>
            {from?.name} <span className="text-muted">to</span> {to?.name}
          </>
        }
      >
        {!route ? (
          <p className="text-[12.5px] text-muted">
            No relation connects these two, in either direction. They may be
            independent, or a link is missing from the model.
          </p>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2 text-[11.5px] text-muted">
              {result.routes.length > 1 ? (
                <Seg
                  value={idx}
                  options={result.routes.map((_, i) => ({
                    v: i,
                    label: `Route ${i + 1}`,
                  }))}
                  onChange={setRoute}
                />
              ) : (
                <span>One route</span>
              )}
              <span>
                {route.steps.length - 1}{" "}
                {route.steps.length === 2 ? "hop" : "hops"}
              </span>
              <button
                type="button"
                onClick={swap}
                title="Swap direction"
                aria-label="Swap direction"
                className="ml-auto flex items-center gap-1 hover:text-ink"
              >
                <ArrowLeftRight size={13} /> Swap
              </button>
            </div>
            {result.ignoredDirection && (
              <p className="mb-2 rounded-md bg-panel2 px-2 py-1.5 text-[11.5px] text-muted">
                Nothing leads from {from?.name} to {to?.name} following the
                arrows. This route goes against some of them.
              </p>
            )}
            <ol>
              {route.steps.map((s, i) => {
                const rel = s.relationId ? snap.relations.get(s.relationId) : null;
                const def = rel ? RELATION_TYPES[rel.type] : null;
                return (
                  <li key={i}>
                    {def && (
                      <div className="ml-3 flex items-center gap-1.5 py-0.5 text-[11px] text-muted">
                        <ArrowDown size={11} />
                        {s.direction === "backward" ? def.inverse : def.label}
                        {s.direction === "backward" && (
                          <span className="rounded bg-panel2 px-1 text-[9.5px] uppercase">
                            against arrow
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center">
                      <span
                        className="mr-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold text-white"
                        style={{ background: ANALYSIS_COLOR.path }}
                      >
                        {i + 1}
                      </span>
                      <Who snap={snap} id={s.nodeId} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </Shell>
    );
  }
  return null;
}
