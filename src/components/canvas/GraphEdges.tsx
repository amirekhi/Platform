"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { ArrowUpFromLine, FileText } from "lucide-react";
import { memo, useContext, useEffect, useRef } from "react";
import { AnalysisContext } from "@/components/analysis/context";
import { ANALYSIS_COLOR } from "@/components/analysis/marks";
import { LensContext } from "./lensContext";
import { HighlightContext } from "./GraphNodeCard";
import { lineStyle } from "@/domain/relationStyle";
import { RELATION_TYPES } from "@/domain/registry";
import type { RelationView } from "@/domain/types";
import { prefersReducedMotion, useApp, useLite } from "@/state/store";
import { useLevel } from "./lod";
import { lineWidth } from "./lineWidth";

export type RelationEdgeData = {
  rel: RelationView;
  index: number;
  total: number;
} & Record<string, unknown>;
export type RelationFlowEdge = Edge<RelationEdgeData, "relation">;
export type ContainmentFlowEdge = Edge<Record<string, unknown>, "containment">;

function RelationEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<RelationFlowEdge>) {
  const rel = data!.rel;
  const ls = lineStyle(rel);
  const def = { color: ls.color, label: ls.label, async: ls.async };
  const selected = useApp((s) => {
    const t = s.tabs.find((x) => x.id === s.activeTabId);
    return (
      t?.selection?.type === "relation" &&
      (t.selection.id === rel.id ||
        Boolean(rel.memberIds?.includes(t.selection.id)))
    );
  });
  const select = useApp((s) => s.select);
  const level = useLevel();
  const lite = useLite();
  // A highlight keeps its lines bright and lets everything else recede. After an expansion
  // only the expanded node's own lines are highlighted, in two strengths: the new ones, which
  // reach the nodes it just brought in, are bright (tier 2); the ones it already had are
  // quiet (tier 1). Any other line, even one touching a new node, is not highlighted.
  const hl = useContext(HighlightContext);
  const touches = (set: ReadonlySet<string>) =>
    set.has(rel.sourceId) || set.has(rel.targetId);
  const tier: 0 | 1 | 2 = !hl
    ? 0
    : hl.added
      ? touches(hl.roots)
        ? touches(hl.added)
          ? 2
          : 1
        : 0
      : touches(hl.roots)
        ? 2
        : 0;
  const anyHl = hl !== null;
  const lit = tier === 2;
  const soft = tier === 1;
  // A line the latest expansion added: it gets a halo, and the halo pulses once on arrival.
  const isNewEdge = tier === 2 && Boolean(hl?.added);
  const haloRef = useRef<SVGPathElement>(null);
  const still = lite || prefersReducedMotion();
  useEffect(() => {
    if (!isNewEdge || still) return;
    // Opacity only, so it costs next to nothing. It ends on the halo's resting look.
    haloRef.current?.animate([{ opacity: 0.9 }, { opacity: 0.22 }], {
      duration: 1100,
      easing: "ease-out",
    });
  }, [isNewEdge, still]);
  const lens = useContext(LensContext);
  // A lens that dims keeps only the lines touching what stands out.
  const lensDim = Boolean(
    lens?.hot &&
    !lens.hot.has(rel.sourceId) &&
    !lens.hot.has(rel.targetId) &&
    !selected,
  );
  // Blast radius / path trace: its lines glow in the analysis colour, the rest step back.
  const an = useContext(AnalysisContext);
  const anLit = Boolean(an?.edgeLit(rel.sourceId, rel.targetId));
  const anDim = Boolean(an && !anLit && !selected);
  const anColor = anLit
    ? an!.kind === "path"
      ? ANALYSIS_COLOR.path
      : ANALYSIS_COLOR.hard
    : undefined;
  const faded = (anyHl && tier === 0 && !selected) || lensDim || anDim;
  const labelOn =
    (level > 0 || selected || lit || soft || anLit) && !lensDim && !anDim;

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.28 + data!.index * 0.08,
  });
  // Stack labels of parallel edges so they do not overlap.
  const offset = (data!.index - (data!.total - 1) / 2) * 20;
  const derived = Boolean(rel.derived);
  // Thicker lines stand for more relations.
  const count = rel.count ?? rel.viaIds?.length ?? 1;
  const widthFor = lineWidth(count, derived);

  return (
    <>
      {isNewEdge && (
        <path
          ref={haloRef}
          d={path}
          fill="none"
          stroke={def.color}
          strokeWidth={10}
          strokeLinecap="round"
          opacity={0.22}
          pointerEvents="none"
        />
      )}
      {selected && (
        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={10}
          strokeLinecap="round"
          opacity={0.28}
          className="edge-selected-halo"
          pointerEvents="none"
        />
      )}
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={18}
        className={
          (def.async && !derived && level > 0 && !lite) || (anLit && !lite)
            ? "edge-async"
            : undefined
        }
        style={{
          stroke: anColor ?? def.color,
          strokeWidth: selected
            ? Math.max(3.6, widthFor + 1.6)
            : isNewEdge
              ? Math.max(4, widthFor + 1.8)
              : lit || anLit
                ? Math.max(3.4, widthFor + 1.2)
                : widthFor,
          filter: selected
            ? `drop-shadow(0 0 5px ${def.color})`
            : isNewEdge
              ? `drop-shadow(0 0 6px ${def.color})`
              : lit || anLit
              ? `drop-shadow(0 0 4px ${anColor ?? def.color})`
              : undefined,
          // An old line settles down from bright to quiet slowly enough to be noticed.
          transition: soft
            ? "opacity 900ms ease-out, stroke-width 250ms"
            : "opacity 250ms, stroke-width 250ms",
          strokeDasharray: derived
            ? `0.1 ${Math.max(6, widthFor * 1.8)}`
            : def.async || anLit
              ? "6 4"
              : undefined,
          strokeLinecap: derived ? "round" : undefined,
          opacity:
            selected || lit || anLit
              ? 1
              : soft
                ? 0.5
                : faded
                  ? 0.12
                  : 0.8,
        }}
      />
      {/* Mixed line: each kind takes a turn along the stone base, like a barber pole. */}
      {ls.mixed && !derived && !anLit && (
        <>
          {ls.kinds.map((k, i) => (
            <path
              key={k}
              d={path}
              fill="none"
              stroke={RELATION_TYPES[k].color}
              strokeWidth={Math.max(1.6, widthFor * 0.6)}
              strokeDasharray={`9 ${9 * (ls.kinds.length - 1)}`}
              strokeDashoffset={-9 * i}
              pointerEvents="none"
              style={{
                opacity: faded ? 0.12 : soft ? 0.5 : 0.95,
                transition: "opacity 250ms",
              }}
            />
          ))}
        </>
      )}
      {(lite ? labelOn : true) && (
        <EdgeLabelRenderer>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              select({ type: "relation", id: rel.id });
            }}
            aria-pressed={selected}
            className={`nodrag nopan absolute flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium shadow-sm hover:border-accent ${
              selected ? "z-10 border-2 font-semibold" : "bg-panel"
            }`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + offset}px)`,
              pointerEvents: labelOn ? "all" : "none",
              opacity: labelOn ? (faded ? 0.25 : soft ? 0.65 : 1) : 0,
              scale: selected ? "1.08" : undefined,
              transition: "opacity 300ms",
              background: selected
                ? `color-mix(in srgb, ${def.color} 22%, var(--panel))`
                : undefined,
              boxShadow: selected
                ? `0 0 0 3px ${def.color}55, 0 2px 8px rgb(0 0 0 / 0.25)`
                : undefined,
              borderColor: selected || lit ? def.color : "var(--border)",
              color: selected || lit ? def.color : "var(--muted)",
            }}
            title={
              (derived
                ? `${rel.name ?? def.label} (lifted from deeper levels)`
                : (rel.name ?? def.label)) +
              (ls.mixed
                ? `: ${ls.kinds.map((k) => RELATION_TYPES[k].label).join(", ")}`
                : "")
            }
          >
            {count > 1 && (
              <span
                className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
                style={{ background: def.color }}
                title={`${count} relations`}
              >
                {count}
              </span>
            )}
            {derived && count <= 1 && <ArrowUpFromLine size={10} aria-hidden />}
            {ls.mixed && (
              <span className="flex items-center -space-x-0.5" aria-hidden>
                {ls.kinds.slice(0, 4).map((k) => (
                  <span
                    key={k}
                    className="h-2 w-2 rounded-full ring-1 ring-[var(--panel)]"
                    style={{ background: RELATION_TYPES[k].color }}
                  />
                ))}
              </span>
            )}
            <span className="max-w-[150px] truncate">
              {rel.name ?? def.label}
            </span>
            {rel.docCount > 0 && (
              <span className="flex items-center gap-0.5 text-accent">
                <FileText size={10} />
                {rel.docCount}
              </span>
            )}
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function ContainmentEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps<ContainmentFlowEdge>) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 10,
  });
  return (
    <BaseEdge
      id={id}
      path={path}
      interactionWidth={0}
      style={{
        stroke: "var(--muted)",
        strokeWidth: 1,
        strokeDasharray: "2 4",
        opacity: 0.55,
      }}
    />
  );
}

export const RelationEdge = memo(RelationEdgeImpl);
export const ContainmentEdge = memo(ContainmentEdgeImpl);
