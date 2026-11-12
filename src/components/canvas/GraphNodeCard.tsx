"use client";

import { Handle, NodeToolbar, Position, type Node, type NodeProps } from "@xyflow/react";
import { CornerDownRight, Crosshair, Orbit, SquareArrowOutUpRight } from "lucide-react";
import { memo } from "react";
import { HEALTH_COLOR, LIFECYCLE_LABEL, NODE_KINDS } from "@/domain/registry";
import type { NodeView } from "@/domain/types";
import { useApp } from "@/state/store";
import { KindIcon } from "../icons";
import { RING, SQ } from "./layout";

export type GraphNodeData = { view: NodeView } & Record<string, unknown>;
export type GraphFlowNode = Node<GraphNodeData, "graph">;

function GraphNodeCardImpl({ data }: NodeProps<GraphFlowNode>) {
  const v = data.view;
  const kind = NODE_KINDS[v.kind];
  const selected = useApp((s) => {
    const t = s.tabs.find((x) => x.id === s.activeTabId);
    return t?.selection?.type === "node" && t.selection.id === v.id;
  });
  const detailsOpen = useApp((s) => s.tabs.find((x) => x.id === s.activeTabId)?.detailsOpen.includes(v.id) ?? false);
  const toggleDetails = useApp((s) => s.toggleDetails);
  const focusNode = useApp((s) => s.focusNode);
  const drillInto = useApp((s) => s.drillInto);
  const openNode = useApp((s) => s.openNode);

  const isRoot = v.role === "root";
  const ghost = v.role === "ghost";
  const dim = ghost || v.lifecycle === "retired" || v.lifecycle === "deprecated";
  const showHealth = (kind.monitorable || v.kind === "system") && v.health !== "unknown";
  const canGoInside = v.childCount > 0 && !ghost;

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top} offset={detailsOpen ? RING + 8 : 8}>
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-panel p-0.5 shadow-[var(--shadow)]">
          {!ghost && (
            <ToolButton label={detailsOpen ? "Hide details" : "Show details (circles)"} active={detailsOpen} onClick={() => toggleDetails(v.id)}>
              <Orbit size={14} />
            </ToolButton>
          )}
          {canGoInside && (
            <ToolButton label={`Go inside (${v.childCount})`} onClick={() => void drillInto(v.id)}>
              <CornerDownRight size={14} />
            </ToolButton>
          )}
          {!isRoot && (
            <ToolButton label="Focus here (same level)" onClick={() => void focusNode(v.id)}>
              <Crosshair size={14} />
            </ToolButton>
          )}
          <ToolButton label="Open in new tab" onClick={() => void openNode(v.id, { newTab: true })}>
            <SquareArrowOutUpRight size={14} />
          </ToolButton>
        </div>
      </NodeToolbar>

      <div
        style={{
          width: SQ,
          height: SQ,
          borderColor: selected ? kind.color : undefined,
          boxShadow: selected
            ? `0 0 0 2px ${kind.color}66, var(--shadow)`
            : isRoot
              ? `0 0 0 3px var(--accent-soft), var(--shadow)`
              : "var(--shadow)",
          opacity: dim ? (ghost ? 0.6 : 0.7) : 1,
        }}
        className={`relative flex flex-col overflow-hidden rounded-2xl border-2 bg-panel transition-shadow ${
          ghost || v.lifecycle === "proposed" ? "border-dashed" : ""
        } ${selected ? "" : isRoot ? "border-accent" : "border-line"}`}
        data-node-id={v.id}
        data-role={v.role}
      >
        <span aria-hidden className="h-1.5 w-full shrink-0" style={{ background: kind.color }} />
        <Handle id="l" type="target" position={Position.Left} />
        <Handle id="r" type="source" position={Position.Right} />
        <Handle id="top" type="source" position={Position.Top} />
        <Handle id="bottom" type="source" position={Position.Bottom} />

        <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2 pt-1.5">
          <div className="flex items-center justify-between">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: `${kind.color}22`, color: kind.color }}
            >
              <KindIcon kind={v.kind} size={14} />
            </span>
            <div className="flex items-center gap-1.5">
              {isRoot && <span className="rounded bg-accent px-1 py-px text-[9px] font-bold uppercase tracking-wider text-white">focus</span>}
              {showHealth && (
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: HEALTH_COLOR[v.health], boxShadow: `0 0 0 3px ${HEALTH_COLOR[v.health]}2e` }}
                  title={`Health: ${v.health}`}
                  role="img"
                  aria-label={`Health ${v.health}`}
                />
              )}
            </div>
          </div>

          <div className="mt-1.5 line-clamp-3 text-[12.5px] font-semibold leading-snug text-ink" title={v.name}>
            {v.name}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] leading-tight text-muted">
            <span>{kind.label}</span>
            {v.external && <Pill>external</Pill>}
            {v.lifecycle !== "active" && <Pill>{LIFECYCLE_LABEL[v.lifecycle].toLowerCase()}</Pill>}
          </div>

          <div className="mt-auto flex items-center gap-1.5 pt-1.5 text-[11px]">
            {ghost ? (
              <span className="text-muted">outside this level</span>
            ) : (
              <>
                {canGoInside && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void drillInto(v.id);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    title={`Go inside: ${v.childCount} nodes`}
                    className="nodrag nopan flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 font-medium text-accent hover:brightness-110"
                  >
                    <CornerDownRight size={11} /> {v.childCount}
                  </button>
                )}
                {v.externalCount > 0 && (
                  <span
                    className="ml-auto rounded-md border border-line px-1.5 py-0.5 text-muted"
                    title={`${v.externalCount} connections reach beyond this view`}
                  >
                    ↗ {v.externalCount}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-panel2 px-1 py-px text-[9.5px] uppercase tracking-wide">{children}</span>;
}

function ToolButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-panel2 hover:text-ink ${
        active ? "bg-accent-soft text-accent" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

export const GraphNodeCard = memo(GraphNodeCardImpl);
