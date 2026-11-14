"use client";

import { ChevronDown, ChevronRight, Home } from "lucide-react";
import { useState } from "react";
import { getDataSource } from "@/data";
import { NODE_KINDS } from "@/domain/registry";
import type { GraphNode } from "@/domain/types";
import { useAsync } from "@/lib/useAsync";
import { currentScope, useApp } from "@/state/store";
import { KindIcon } from "../icons";

export function Explorer() {
  const openLandscape = useApp((s) => s.openLandscape);
  const { data: roots } = useAsync("explorer-roots", () =>
    getDataSource().getRootNodes(),
  );
  const { data: teams } = useAsync("explorer-teams", () =>
    getDataSource().getNodesByKind("team"),
  );

  return (
    <nav
      aria-label="Explorer"
      className="flex h-full flex-col overflow-y-auto border-r border-line bg-panel px-2 py-3"
    >
      <button
        type="button"
        onClick={() => void openLandscape()}
        className="mb-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink hover:bg-panel2"
      >
        <Home size={14} className="text-muted" /> Enterprise
      </button>
      <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
        Organisation
      </div>
      {roots
        ?.filter((r) => r.kind !== "system")
        .map((r) => (
          <TreeNode key={r.id} node={r} depth={0} />
        ))}
      <div className="mt-4 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
        Software systems
      </div>
      {roots
        ?.filter((r) => r.kind === "system")
        .map((r) => (
          <TreeNode key={r.id} node={r} depth={0} />
        ))}
      <div className="mt-4 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
        Teams
      </div>
      {teams?.map((t) => (
        <TreeNode key={t.id} node={t} depth={0} leaf />
      ))}
    </nav>
  );
}

function TreeNode({
  node,
  depth,
  leaf = false,
}: {
  node: GraphNode;
  depth: number;
  leaf?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const openNode = useApp((s) => s.openNode);
  const activeRoot = useApp((s) => {
    const t = s.tabs.find((x) => x.id === s.activeTabId);
    return t ? currentScope(t).rootId : null;
  });
  const { data: children } = useAsync(
    `children:${node.id}:${open}`,
    async () => (open && !leaf ? getDataSource().getChildren(node.id) : []),
  );
  const kind = NODE_KINDS[node.kind];
  const hasChildren = !leaf && node.kind !== "table" && node.kind !== "team";

  return (
    <div>
      <div
        className={`group flex items-center rounded-md ${activeRoot === node.id ? "bg-accent-soft" : "hover:bg-panel2"}`}
        style={{ paddingLeft: depth * 12 }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse" : "Expand"}
          aria-expanded={open}
          className={`flex h-6 w-5 shrink-0 items-center justify-center text-muted ${hasChildren ? "" : "invisible"}`}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <button
          type="button"
          onClick={() => void openNode(node.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-2 text-left text-[12.5px] text-ink"
          title={`Open ${node.name}`}
        >
          <span style={{ color: kind.color }}>
            <KindIcon kind={node.kind} size={13} />
          </span>
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {open &&
        children?.map((c) => (
          <TreeNode key={c.id} node={c} depth={depth + 1} />
        ))}
    </div>
  );
}
