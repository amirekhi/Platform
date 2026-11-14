"use client";

import {
  Handle,
  NodeToolbar,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  CornerDownRight,
  Crosshair,
  Expand,
  GripHorizontal,
  Highlighter,
  Maximize2,
  Minimize2,
  Orbit,
  Shrink,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useDevice } from "@/lib/useDevice";
import { createContext, memo, useContext, useState } from "react";
import { HEALTH_COLOR, LIFECYCLE_LABEL, NODE_KINDS } from "@/domain/registry";
import type { NodeView } from "@/domain/types";
import { useApp, useLite } from "@/state/store";
import { KindIcon } from "../icons";
import { KindShape } from "../shapes";
import { NODE_H, NODE_W, RING, SHAPE } from "./layout";
import { useLevel } from "./lod";

/** Ids connected to the highlighted node (itself included), or null when nothing is highlighted. */
export const HighlightContext = createContext<Set<string> | null>(null);

export type GraphNodeData = { view: NodeView; fresh?: boolean } & Record<
  string,
  unknown
>;
export type GraphFlowNode = Node<GraphNodeData, "graph">;

function GraphNodeCardImpl({ data }: NodeProps<GraphFlowNode>) {
  const v = data.view;
  const kind = NODE_KINDS[v.kind];
  const selected = useApp((s) => {
    const t = s.tabs.find((x) => x.id === s.activeTabId);
    return t?.selection?.type === "node" && t.selection.id === v.id;
  });
  const detailsOpen = useApp(
    (s) =>
      s.tabs.find((x) => x.id === s.activeTabId)?.detailsOpen.includes(v.id) ??
      false,
  );
  const expanded = useApp(
    (s) =>
      s.tabs.find((x) => x.id === s.activeTabId)?.expandedIds.includes(v.id) ??
      false,
  );
  // During the "going in" lead-in, everything except the entered node fades away.
  const leaving = useApp(
    (s) =>
      s.motion?.kind === "enter" &&
      s.motion.phase === "out" &&
      s.motion.anchorId !== v.id,
  );
  const level = useLevel();
  const device = useDevice();
  const vertical = device === "mobile";
  const touch = device !== "desktop";
  const lite = useLite();
  const [hover, setHover] = useState(false);
  const lit = useContext(HighlightContext);
  const receded = lit !== null && !lit.has(v.id);
  const highlighted = useApp(
    (s) =>
      s.tabs.find((x) => x.id === s.activeTabId)?.highlightIds.includes(v.id) ??
      false,
  );
  const toggleHighlight = useApp((s) => s.toggleHighlight);
  const toggleDetails = useApp((s) => s.toggleDetails);
  const toggleOpen = useApp((s) => s.toggleOpen);
  const toggleExpanded = useApp((s) => s.toggleExpanded);
  const focusNode = useApp((s) => s.focusNode);
  const drillInto = useApp((s) => s.drillInto);
  const openNode = useApp((s) => s.openNode);

  const isRoot = v.role === "root";
  const ghost = v.role === "ghost";
  const dim =
    ghost || v.lifecycle === "retired" || v.lifecycle === "deprecated";
  const showHealth = v.health !== "unknown";
  const canGoInside = v.childCount > 0 && !ghost;
  const canExpand = !ghost && (v.externalCount > 0 || expanded);

  // Overview draws no text, except for what you are working with or pointing at.
  const showLabel =
    level > 0 || selected || highlighted || isRoot || expanded || hover;
  const canOpen = canGoInside && v.role !== "ghost";
  const glow = selected ? kind.color : isRoot ? "var(--accent)" : null;

  return (
    <>
      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
        offset={detailsOpen ? RING + 8 : 8}
      >
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-panel p-0.5 shadow-[var(--shadow)]">
          {!ghost && (
            <ToolButton
              label={detailsOpen ? "Hide details" : "Show details (circles)"}
              active={detailsOpen}
              onClick={() => toggleDetails(v.id)}
            >
              <Orbit size={14} />
            </ToolButton>
          )}
          {!ghost && (
            <ToolButton
              label={
                highlighted
                  ? "Stop highlighting its relations"
                  : "Highlight its relations"
              }
              active={highlighted}
              onClick={() => toggleHighlight(v.id)}
            >
              <Highlighter size={14} />
            </ToolButton>
          )}
          {canExpand && (
            <ToolButton
              label={
                expanded
                  ? "Collapse its neighbours"
                  : `Expand neighbours (${v.externalCount})`
              }
              active={expanded}
              onClick={() => toggleExpanded(v.id)}
            >
              {expanded ? <Shrink size={14} /> : <Expand size={14} />}
            </ToolButton>
          )}
          {canOpen && (
            <ToolButton
              label={
                v.open
                  ? "Close (hide its contents here)"
                  : `Open in place (${v.childCount}), stay on this level`
              }
              active={v.open}
              onClick={() => toggleOpen(v.id)}
            >
              {v.open ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </ToolButton>
          )}
          {canGoInside && (
            <ToolButton
              label={`Go inside (${v.childCount})`}
              onClick={() => void drillInto(v.id)}
            >
              <CornerDownRight size={14} />
            </ToolButton>
          )}
          {!isRoot && (
            <ToolButton
              label="Focus here (same level)"
              onClick={() => void focusNode(v.id)}
            >
              <Crosshair size={14} />
            </ToolButton>
          )}
          <ToolButton
            label="Open in new tab"
            onClick={() => void openNode(v.id, { newTab: true })}
          >
            <SquareArrowOutUpRight size={14} />
          </ToolButton>
        </div>
      </NodeToolbar>

      {v.open ? (
        <div
          data-node-id={v.id}
          data-kind={v.kind}
          data-role={v.role}
          data-open="true"
          className={`box-open relative h-full w-full rounded-2xl border-2 transition-[box-shadow,opacity] duration-200 ${
            data.fresh ? "box-grow" : ""
          }`}
          style={{
            borderColor: selected ? kind.color : `${kind.color}88`,
            background: `color-mix(in srgb, ${kind.color} 7%, var(--panel))`,
            boxShadow: glow
              ? `0 0 0 2px ${glow}66, 0 0 14px ${glow}55`
              : "var(--shadow)",
            opacity: leaving ? 0 : receded ? 0.45 : 1,
          }}
        >
          <Handle id="l" type="target" position={Position.Left} />
          <Handle id="r" type="source" position={Position.Right} />
          <Handle id="top" type="source" position={Position.Top} />
          <Handle id="bottom" type="source" position={Position.Bottom} />
          {vertical && (
            <Handle id="tin" type="target" position={Position.Top} />
          )}
          {touch && (
            <span
              className="node-grip nopan absolute -top-3.5 left-1/2 z-10 flex h-7 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-panel text-muted shadow-[var(--shadow)]"
              title="Hold and drag to move"
              aria-label="Hold and drag to move"
            >
              <GripHorizontal size={16} />
            </span>
          )}
          <div
            className="flex items-center gap-2 px-3 pt-2"
            style={{ height: 46 }}
          >
            <KindShape kind={v.kind} size={30} />
            <div className="min-w-0 flex-1 leading-tight">
              <div
                className="truncate text-[13px] font-semibold text-ink"
                title={v.name}
              >
                {v.name}
              </div>
              <div className="text-[10.5px] text-muted">
                {kind.label} · {v.childCount} inside
              </div>
            </div>
            {showHealth && (
              <span
                className="h-3 w-3 shrink-0 rounded-full border-2 border-panel"
                style={{ background: HEALTH_COLOR[v.health] }}
                title={`Health: ${v.health}`}
              />
            )}
            {highlighted && (
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white"
                title="Its relations are highlighted"
              >
                <Highlighter size={9} />
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void drillInto(v.id);
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              title={`Go inside: change level to ${v.name}`}
              className="nodrag nopan flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-panel2 hover:text-ink"
            >
              <CornerDownRight size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleOpen(v.id);
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              title="Close: hide its contents and stay on this level"
              className="nodrag nopan flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent hover:brightness-110"
            >
              <Minimize2 size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            width: NODE_W,
            height: NODE_H,
            opacity: leaving
              ? 0
              : receded
                ? 0.3
                : dim
                  ? ghost
                    ? 0.6
                    : 0.7
                  : 1,
          }}
          className={`group/node flex flex-col items-center transition-opacity duration-300 ${touch ? "relative" : ""} ${data.fresh ? "node-pop" : ""}`}
          data-node-id={v.id}
          data-kind={v.kind}
          data-role={v.role}
          onMouseEnter={() => level === 0 && setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div
            className="relative shrink-0 transition-[filter] duration-200"
            style={{
              width: SHAPE,
              height: SHAPE,
              // Glow only for what is selected or highlighted; a filter on every node is costly.
              filter:
                glow && !lite ? `drop-shadow(0 0 7px ${glow}aa)` : undefined,
              outline: glow && lite ? `2px solid ${glow}` : undefined,
              outlineOffset: 3,
              borderRadius: 14,
            }}
          >
            <KindShape
              kind={v.kind}
              size={SHAPE}
              dashed={ghost || v.lifecycle === "proposed"}
              accent={isRoot}
            />
            <span
              className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-panel"
              style={{ color: kind.color }}
            >
              <KindIcon kind={v.kind} size={17} />
            </span>
            <Handle id="l" type="target" position={Position.Left} />
            <Handle id="r" type="source" position={Position.Right} />
            <Handle id="top" type="source" position={Position.Top} />
            <Handle id="bottom" type="source" position={Position.Bottom} />
            {vertical && (
              <Handle id="tin" type="target" position={Position.Top} />
            )}

            {showHealth && (
              <span
                className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-panel"
                style={{ background: HEALTH_COLOR[v.health] }}
                title={`Health: ${v.health}`}
                role="img"
                aria-label={`Health ${v.health}`}
              />
            )}
            {highlighted && (
              <span
                className="absolute -left-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white"
                title="Its relations are highlighted"
              >
                <Highlighter size={9} />
              </span>
            )}
            {isRoot && !highlighted && (
              <span className="absolute -left-2 -top-2 rounded bg-accent px-1 py-px text-[9px] font-bold uppercase tracking-wider text-white">
                focus
              </span>
            )}
            {canGoInside && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void drillInto(v.id);
                }}
                onDoubleClick={(e) => e.stopPropagation()}
                title={`Go inside: ${v.childCount} nodes`}
                className="node-chip nodrag nopan absolute -bottom-1.5 -right-2.5 flex items-center gap-0.5 rounded-md border border-line bg-panel px-1 py-px text-[10.5px] font-semibold text-accent hover:brightness-110"
              >
                <CornerDownRight size={10} /> {v.childCount}
              </button>
            )}
            {canOpen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOpen(v.id);
                }}
                onDoubleClick={(e) => e.stopPropagation()}
                title={`Open in place: show its ${v.childCount} contents here, stay on this level`}
                className="node-chip nodrag nopan absolute -bottom-1.5 left-1/2 flex -translate-x-1/2 items-center rounded-md border border-line bg-panel px-1 py-px text-muted hover:text-accent hover:brightness-110"
              >
                <Maximize2 size={10} />
              </button>
            )}
            {canExpand && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(v.id);
                }}
                onDoubleClick={(e) => e.stopPropagation()}
                title={
                  expanded
                    ? "Collapse its neighbours"
                    : `Expand: ${v.externalCount} connections reach beyond this view`
                }
                className={`node-chip nodrag nopan absolute -bottom-1.5 -left-2.5 flex items-center gap-0.5 rounded-md border px-1 py-px text-[10.5px] font-semibold hover:brightness-110 ${
                  expanded
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-panel text-muted"
                }`}
              >
                {expanded ? <Shrink size={10} /> : <Expand size={10} />}
                {expanded ? "open" : v.externalCount}
              </button>
            )}
          </div>

          {/* Overview hides the text, except for what you are working with or pointing at. */}
          <div
            className="mt-1.5 w-full text-center"
            style={{ minHeight: showLabel ? undefined : 34 }}
          >
            {showLabel && (
              <>
                <div
                  className="line-clamp-2 text-[12px] font-semibold leading-tight text-ink"
                  title={v.name}
                >
                  {v.name}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1 text-[10.5px] leading-tight text-muted">
                  <span>{ghost ? "outside this level" : kind.label}</span>
                  {v.lifecycle !== "active" && (
                    <Pill>{LIFECYCLE_LABEL[v.lifecycle].toLowerCase()}</Pill>
                  )}
                </div>
                {level === 2 && !ghost && (
                  <div className="mt-0.5 space-y-px text-[10px] leading-tight text-muted">
                    {v.details.monitoring?.headline && (
                      <div className="font-medium text-ink">
                        {v.details.monitoring.headline.label}{" "}
                        {Math.round(v.details.monitoring.headline.value * 10) /
                          10}
                        {v.details.monitoring.headline.unit}
                      </div>
                    )}
                    {v.details.owner && (
                      <div className="truncate">{v.details.owner.name}</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {touch && selected && !ghost && (
            <div className="touch-row nopan absolute left-1/2 top-full z-20 flex items-center gap-1 rounded-xl border border-line bg-panel p-1 shadow-[var(--shadow)]">
              <span
                className="node-grip nopan flex h-9 w-9 items-center justify-center rounded-lg bg-panel2 text-ink"
                title="Hold and drag to move"
                aria-label="Hold and drag to move"
              >
                <GripHorizontal size={18} />
              </span>
              <TouchBtn
                label="Details"
                active={detailsOpen}
                onClick={() => toggleDetails(v.id)}
              >
                <Orbit size={17} />
              </TouchBtn>
              <TouchBtn
                label="Highlight relations"
                active={highlighted}
                onClick={() => toggleHighlight(v.id)}
              >
                <Highlighter size={17} />
              </TouchBtn>
              {canExpand && (
                <TouchBtn
                  label={expanded ? "Collapse neighbours" : "Expand neighbours"}
                  active={expanded}
                  onClick={() => toggleExpanded(v.id)}
                >
                  {expanded ? <Shrink size={17} /> : <Expand size={17} />}
                </TouchBtn>
              )}
              {canOpen && (
                <TouchBtn
                  label={v.open ? "Close in place" : "Open in place"}
                  active={v.open}
                  onClick={() => toggleOpen(v.id)}
                >
                  {v.open ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </TouchBtn>
              )}
              {canGoInside && (
                <TouchBtn
                  label="Go inside"
                  onClick={() => void drillInto(v.id)}
                >
                  <CornerDownRight size={17} />
                </TouchBtn>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function TouchBtn({
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
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`nodrag nopan flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-accent text-white" : "bg-panel2 text-ink"}`}
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-panel2 px-1 py-px text-[9.5px] uppercase tracking-wide">
      {children}
    </span>
  );
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
