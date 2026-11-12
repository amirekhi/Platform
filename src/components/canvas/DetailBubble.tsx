"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Activity, FileText, Info, Link2, Shapes, Users } from "lucide-react";
import { memo } from "react";
import type { Id } from "@/domain/types";
import { useApp } from "@/state/store";
import type { DetailCategory, DetailKey } from "./details";
import { CIRCLE, DETAIL_H, DETAIL_W } from "./layout";

export type DetailBubbleData = { nodeId: Id; cat: DetailCategory } & Record<string, unknown>;
export type DetailFlowNode = Node<DetailBubbleData, "detail">;

const ICONS: Record<DetailKey, typeof Info> = {
  properties: Info,
  docs: FileText,
  diagrams: Shapes,
  monitoring: Activity,
  relations: Link2,
  owner: Users,
};

function DetailBubbleImpl({ data }: NodeProps<DetailFlowNode>) {
  const { nodeId, cat } = data;
  const Icon = ICONS[cat.key];
  const active = useApp((s) => {
    const t = s.tabs.find((x) => x.id === s.activeTabId);
    return t?.selection?.type === "node" && t.selection.id === nodeId && t.detailTab === cat.tab;
  });
  const select = useApp((s) => s.select);

  return (
    <div style={{ width: DETAIL_W, height: DETAIL_H }} className="flex flex-col items-center" data-detail={cat.key}>
      <Handle id="t" type="target" position={Position.Top} />
      <Handle id="b" type="target" position={Position.Bottom} />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          select({ type: "node", id: nodeId }, cat.tab);
        }}
        title={`${cat.label}${cat.count !== undefined ? `: ${cat.count}` : cat.text ? `: ${cat.text}` : ""}`}
        aria-label={`${cat.label} details`}
        className={`nodrag nopan flex flex-col items-center justify-center rounded-full border-2 bg-panel shadow-[var(--shadow)] transition-transform hover:scale-105 ${
          cat.empty ? "opacity-55" : ""
        }`}
        style={{
          width: CIRCLE,
          height: CIRCLE,
          borderColor: cat.color,
          background: active ? `${cat.color}2e` : undefined,
          boxShadow: active ? `0 0 0 3px ${cat.color}44, var(--shadow)` : undefined,
          color: cat.color,
        }}
      >
        <Icon size={15} />
        <span className="mt-0.5 max-w-[42px] truncate text-[10.5px] font-semibold leading-none text-ink">
          {cat.count !== undefined ? cat.count : cat.text}
        </span>
      </button>
      <span className="mt-0.5 max-w-full truncate text-[10px] leading-tight text-muted">{cat.label}</span>
    </div>
  );
}

export const DetailBubble = memo(DetailBubbleImpl);
