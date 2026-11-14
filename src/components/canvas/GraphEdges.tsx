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
import { memo, useContext } from "react";
import { LensContext } from "./lensContext";
import { RELATION_TYPES } from "@/domain/registry";
import type { RelationView } from "@/domain/types";
import { useApp, useLite } from "@/state/store";
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
  const def = RELATION_TYPES[rel.type];
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
  // After expanding a node, its connections stay bright and everything else recedes.
  const hl = useApp(
    (s) => s.tabs.find((t) => t.id === s.activeTabId)?.highlightIds,
  );
  const anyHl = (hl?.length ?? 0) > 0;
  const lit =
    anyHl && (hl!.includes(rel.sourceId) || hl!.includes(rel.targetId));
  const lens = useContext(LensContext);
  // A lens that dims keeps only the lines touching what stands out.
  const lensDim = Boolean(
    lens?.hot &&
    !lens.hot.has(rel.sourceId) &&
    !lens.hot.has(rel.targetId) &&
    !selected,
  );
  const faded = (anyHl && !lit && !selected) || lensDim;
  const labelOn = (level > 0 || selected || lit) && !lensDim;

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
          def.async && !derived && level > 0 && !lite ? "edge-async" : undefined
        }
        style={{
          stroke: def.color,
          strokeWidth: selected
            ? Math.max(3.6, widthFor + 1.6)
            : lit
              ? Math.max(3, widthFor + 1)
              : widthFor,
          filter: selected
            ? `drop-shadow(0 0 5px ${def.color})`
            : lit
              ? `drop-shadow(0 0 4px ${def.color})`
              : undefined,
          transition: "opacity 250ms, stroke-width 250ms",
          strokeDasharray: derived
            ? `0.1 ${Math.max(6, widthFor * 1.8)}`
            : def.async
              ? "6 4"
              : undefined,
          strokeLinecap: derived ? "round" : undefined,
          opacity: selected || lit ? 1 : faded ? 0.12 : 0.8,
        }}
      />
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
              opacity: labelOn ? (faded ? 0.25 : 1) : 0,
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
              derived
                ? `${rel.name ?? def.label} (lifted from deeper levels)`
                : (rel.name ?? def.label)
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
