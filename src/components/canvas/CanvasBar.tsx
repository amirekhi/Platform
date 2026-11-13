"use client";

import {
  ArrowUp,
  ArrowUpFromLine,
  ScanEye,
  Highlighter,
  Shrink,
  Minimize2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Eye,
  EyeOff,
  Filter,
  Home,
  RotateCcw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { RELATION_TYPES } from "@/domain/registry";
import type { GraphView, RelationType } from "@/domain/types";
import { LOD_OPTIONS, useLevel } from "./lod";
import { currentScope, type Tab, useApp } from "@/state/store";

export function CanvasBar({ tab, view }: { tab: Tab; view?: GraphView }) {
  const toggle = useApp((s) => s.toggleRelationType);
  const setContainment = useApp((s) => s.setShowContainment);
  const setLifted = useApp((s) => s.setShowLifted);
  const setExternal = useApp((s) => s.setShowExternal);
  const setRadius = useApp((s) => s.setRadius);
  const setDetailsFor = useApp((s) => s.setDetailsFor);
  const reset = useApp((s) => s.resetTab);
  const goToPath = useApp((s) => s.goToPath);
  const goUp = useApp((s) => s.goUp);
  const setMode = useApp((s) => s.setDetailMode);
  const level = useLevel();
  const clearHl = useApp((s) => s.clearHighlights);
  const closeAllOpen = useApp((s) => s.closeAllOpen);
  const collapseAll = useApp((s) => s.collapseAllExpanded);

  const [filterOpen, setFilterOpen] = useState(false);
  const scope = currentScope(tab);
  const members = useMemo(
    () =>
      (view?.nodes ?? []).filter((n) => n.role !== "ghost").map((n) => n.id),
    [view],
  );
  const allOpen =
    members.length > 0 && members.every((id) => tab.detailsOpen.includes(id));

  const counts = useMemo(() => {
    const m = new Map<RelationType, number>();
    for (const r of view?.relations ?? [])
      m.set(r.type, (m.get(r.type) ?? 0) + 1);
    return m;
  }, [view]);
  const types = useMemo(() => {
    const set = new Set<RelationType>([
      ...counts.keys(),
      ...tab.hiddenRelationTypes,
    ]);
    return [...set].sort((a, b) =>
      RELATION_TYPES[a].label.localeCompare(RELATION_TYPES[b].label),
    );
  }, [counts, tab.hiddenRelationTypes]);

  return (
    <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-col items-start gap-2">
      {/* Level path */}
      <nav
        aria-label="Exploration path"
        className="pointer-events-auto flex max-w-full flex-wrap items-center gap-0.5 rounded-xl border border-line bg-panel/90 p-1 shadow-[var(--shadow)] backdrop-blur"
      >
        <button
          type="button"
          onClick={goUp}
          disabled={tab.path.length < 2}
          aria-label="Up one step"
          title="Back up one step"
          className="rounded-lg p-1.5 text-muted hover:bg-panel2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ArrowUp size={14} />
        </button>
        {tab.path.map((p, i) => {
          const last = i === tab.path.length - 1;
          return (
            <span
              key={`${i}-${p.rootId}-${p.mode}`}
              className="flex items-center gap-0.5"
            >
              {i > 0 && (
                <ChevronRight size={13} className="text-muted" aria-hidden />
              )}
              <button
                type="button"
                disabled={last}
                onClick={() => goToPath(i)}
                aria-current={last ? "location" : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] ${
                  last
                    ? "bg-accent-soft font-semibold text-ink"
                    : "text-muted hover:bg-panel2 hover:text-ink"
                }`}
              >
                {p.rootId === null ? <Home size={12} /> : null}
                {p.label}
                {p.rootId !== null && (
                  <span className="rounded bg-panel2 px-1 py-px text-[9.5px] font-medium uppercase tracking-wide text-muted">
                    {p.mode === "inside" ? "inside" : "around"}
                  </span>
                )}
              </button>
            </span>
          );
        })}
      </nav>

      {/* View controls */}
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-line bg-panel/90 p-1.5 shadow-[var(--shadow)] backdrop-blur">
        {scope.mode === "around" && (
          <div
            role="group"
            aria-label="Reach in relation hops"
            className="flex items-center gap-1 rounded-lg bg-panel2 p-0.5"
          >
            <span className="px-1.5 text-[11px] font-medium text-muted">
              Reach
            </span>
            {([1, 2, 3] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadius(r)}
                aria-pressed={tab.radius === r}
                title={
                  r === 1 ? "Immediate neighbours only" : `Up to ${r} hops away`
                }
                className={`h-6 w-6 rounded-md text-[12px] font-semibold ${
                  tab.radius === r
                    ? "bg-accent text-white"
                    : "text-muted hover:text-ink"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
        {scope.mode === "inside" && scope.rootId !== null && (
          <Toggle
            on={tab.showExternal}
            onClick={() => setExternal(!tab.showExternal)}
            title="Also draw the outside nodes these contents connect to"
          >
            Outside links
          </Toggle>
        )}
        <Toggle
          on={allOpen}
          onClick={() => setDetailsFor(members, !allOpen)}
          title="Show or hide detail circles on every component"
          icon={<CircleDot size={12} />}
        >
          Details
        </Toggle>
        {tab.expandedIds.length > 0 && (
          <button
            type="button"
            onClick={collapseAll}
            title="Collapse every expanded node"
            className="flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 text-[11.5px] font-medium text-accent hover:brightness-110"
          >
            <Shrink size={12} /> Collapse expanded ({tab.expandedIds.length})
          </button>
        )}
        {tab.openIds.length > 0 && (
          <button
            type="button"
            onClick={closeAllOpen}
            title="Close every node opened in place"
            className="flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 text-[11.5px] font-medium text-accent hover:brightness-110"
          >
            <Minimize2 size={12} /> Close opened ({tab.openIds.length})
          </button>
        )}
        {tab.highlightIds.length > 0 && (
          <button
            type="button"
            onClick={clearHl}
            title="Turn off every relation highlight"
            className="flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 text-[11.5px] font-medium text-accent hover:brightness-110"
          >
            <Highlighter size={12} /> Clear highlights (
            {tab.highlightIds.length})
          </button>
        )}
        <Toggle
          on={tab.showLifted}
          onClick={() => setLifted(!tab.showLifted)}
          title="Include links that exist only between what nodes contain, drawn as dotted lifted relations"
          icon={<ArrowUpFromLine size={12} />}
        >
          Lifted
        </Toggle>
        <Toggle
          on={tab.showContainment}
          onClick={() => setContainment(!tab.showContainment)}
          title="Dotted lines between a component and what it contains"
          icon={tab.showContainment ? <Eye size={12} /> : <EyeOff size={12} />}
        >
          Contains
        </Toggle>
        <span className="mx-0.5 h-4 w-px bg-line" />
        <div
          role="group"
          aria-label="Level of detail"
          className="flex items-center gap-0.5 rounded-lg bg-panel2 p-0.5"
          title="How much each node and relation shows. Auto follows your zoom."
        >
          <span className="flex items-center gap-1 px-1.5 text-[11px] font-medium text-muted">
            <ScanEye size={12} /> Detail
          </span>
          {LOD_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setMode(o.id)}
              aria-pressed={tab.detailMode === o.id}
              title={o.hint}
              className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ${
                tab.detailMode === o.id
                  ? "bg-accent text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              {o.label}
              {o.id === "auto" && tab.detailMode === "auto" && (
                <span className="ml-1 opacity-80">
                  · {["overview", "standard", "full"][level]}
                </span>
              )}
            </button>
          ))}
        </div>
        <span className="mx-0.5 h-4 w-px bg-line" />
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
            title="Choose which relation types are drawn"
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium ${
              tab.hiddenRelationTypes.length
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-panel2"
            }`}
          >
            <Filter size={12} />
            Relations
            <span className="text-muted">
              {types.length - tab.hiddenRelationTypes.length}/{types.length}
            </span>
            <ChevronDown size={12} />
          </button>
          {filterOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setFilterOpen(false)}
                aria-hidden
              />
              <div className="absolute left-0 top-full z-20 mt-1.5 w-60 rounded-xl border border-line bg-panel p-1.5 shadow-[var(--shadow)]">
                {types.length === 0 && (
                  <p className="px-2 py-1.5 text-[12px] text-muted">
                    No relations in view
                  </p>
                )}
                {types.map((t) => {
                  const hidden = tab.hiddenRelationTypes.includes(t);
                  const def = RELATION_TYPES[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggle(t)}
                      aria-pressed={!hidden}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] hover:bg-panel2 ${
                        hidden ? "text-muted line-through" : "text-ink"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="h-0.5 w-4 shrink-0 rounded"
                        style={{
                          background: hidden ? "var(--muted)" : def.color,
                          backgroundImage: def.async
                            ? `repeating-linear-gradient(90deg, ${def.color} 0 4px, transparent 4px 7px)`
                            : undefined,
                        }}
                      />
                      <span className="flex-1">{def.label}</span>
                      {!hidden && (
                        <span className="text-muted">{counts.get(t)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <span className="mx-0.5 h-4 w-px bg-line" />
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium text-muted hover:bg-panel2 hover:text-ink"
          title="Back to this tab's first view with default options"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {view && view.truncated > 0 && (
        <div className="pointer-events-auto rounded-lg border border-line bg-panel/90 px-2.5 py-1 text-[11.5px] text-muted shadow-[var(--shadow)]">
          {view.truncated} more nodes not shown. Lower the reach to narrow the
          view.
        </div>
      )}
    </div>
  );
}

function Toggle({
  on,
  onClick,
  title,
  icon,
  children,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={title}
      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium ${
        on ? "bg-accent-soft text-accent" : "text-muted hover:bg-panel2"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
