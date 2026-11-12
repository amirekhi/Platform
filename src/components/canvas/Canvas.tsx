"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { getDataSource } from "@/data";
import { NODE_KINDS, RELATION_TYPES } from "@/domain/registry";
import type { GraphView, Id } from "@/domain/types";
import { useAsync } from "@/lib/useAsync";
import { currentScope, type Tab, useApp } from "@/state/store";
import { CanvasBar } from "./CanvasBar";
import { DetailBubble, type DetailFlowNode } from "./DetailBubble";
import { detailCategories } from "./details";
import { ContainmentEdge, type ContainmentFlowEdge, RelationEdge, type RelationFlowEdge } from "./GraphEdges";
import { GraphNodeCard, type GraphFlowNode } from "./GraphNodeCard";
import { Legend } from "./Legend";
import { computeLayout, detailSlots } from "./layout";

const nodeTypes = { graph: GraphNodeCard, detail: DetailBubble };
const edgeTypes = { relation: RelationEdge, containment: ContainmentEdge };

interface Loaded {
  key: string;
  view: GraphView;
}

/** Everything that changes WHAT is shown (as opposed to how it is decorated). */
function scopeKey(tab: Tab) {
  const s = currentScope(tab);
  return [
    tab.id,
    s.rootId ?? "~",
    s.mode,
    s.mode === "around" ? tab.radius : "",
    [...tab.hiddenRelationTypes].sort().join(","),
    tab.showContainment ? "c" : "n",
    s.mode === "inside" && tab.showExternal ? "x" : "",
  ].join("|");
}

export function Canvas({ tab }: { tab: Tab }) {
  const key = scopeKey(tab);
  const scope = currentScope(tab);
  const { data, last } = useAsync<Loaded>(key, async () => ({
    key,
    view: await getDataSource().getScopeView({
      rootId: scope.rootId,
      mode: scope.mode,
      radius: tab.radius,
      hiddenRelationTypes: tab.hiddenRelationTypes,
      showContainment: tab.showContainment,
      showExternal: tab.showExternal,
    }),
  }));
  const loaded = data ?? last;

  return (
    <div className="relative h-full w-full">
      <ReactFlowProvider>
        {loaded ? <Flow key={loaded.key} loaded={loaded} detailsOpen={tab.detailsOpen} /> : <Centered>Loading…</Centered>}
      </ReactFlowProvider>
      <CanvasBar tab={tab} view={loaded?.view} />
      <Legend />
      {loaded && loaded.view.nodes.length === 0 && (
        <Centered>{scope.mode === "inside" ? "Nothing inside this node." : "Nothing to show."}</Centered>
      )}
    </div>
  );
}

type AnyNode = GraphFlowNode | DetailFlowNode;
type AnyEdge = RelationFlowEdge | ContainmentFlowEdge | Edge;

function build(view: GraphView, open: Set<Id>) {
  const pos = computeLayout(view, open);
  const nodes: AnyNode[] = [];
  const edges: AnyEdge[] = [];

  for (const v of view.nodes) {
    nodes.push({
      id: v.id,
      type: "graph",
      position: pos[v.id] ?? { x: 0, y: 0 },
      data: { view: v },
    } as GraphFlowNode);
  }

  // Detail circles are children of their square so they travel with it when dragged.
  for (const v of view.nodes) {
    if (!open.has(v.id) || v.role === "ghost") continue;
    const cats = detailCategories(v);
    const slots = detailSlots(cats.length);
    cats.forEach((cat, i) => {
      const id = `d:${v.id}:${cat.key}`;
      nodes.push({
        id,
        type: "detail",
        parentId: v.id,
        position: { x: slots[i].x, y: slots[i].y },
        data: { nodeId: v.id, cat },
        draggable: false,
        selectable: false,
      } as DetailFlowNode);
      edges.push({
        id: `e:${id}`,
        type: "straight",
        source: v.id,
        sourceHandle: slots[i].side,
        target: id,
        targetHandle: slots[i].side === "top" ? "b" : "t",
        selectable: false,
        focusable: false,
        style: { stroke: cat.color, strokeWidth: 1.4, strokeDasharray: "2 4", opacity: 0.8 },
      });
    });
  }

  // Pairs of nodes joined by several relations get staggered curves and labels.
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const pairCount = new Map<string, number>();
  for (const r of view.relations) pairCount.set(pairKey(r.sourceId, r.targetId), (pairCount.get(pairKey(r.sourceId, r.targetId)) ?? 0) + 1);
  const pairSeen = new Map<string, number>();

  for (const c of view.containment) {
    edges.push({
      id: `c:${c.parentId}:${c.childId}`,
      type: "containment",
      source: c.parentId,
      sourceHandle: "r",
      target: c.childId,
      targetHandle: "l",
      selectable: false,
      focusable: false,
      data: {},
    } as ContainmentFlowEdge);
  }
  for (const r of view.relations) {
    const k = pairKey(r.sourceId, r.targetId);
    const idx = pairSeen.get(k) ?? 0;
    pairSeen.set(k, idx + 1);
    edges.push({
      id: r.id,
      type: "relation",
      source: r.sourceId,
      sourceHandle: "r",
      target: r.targetId,
      targetHandle: "l",
      data: { rel: r, index: idx, total: pairCount.get(k) ?? 1 },
      markerEnd: { type: MarkerType.ArrowClosed, color: RELATION_TYPES[r.type].color, width: 16, height: 16 },
    } as RelationFlowEdge);
  }
  return { nodes, edges };
}

function Flow({ loaded, detailsOpen }: { loaded: Loaded; detailsOpen: Id[] }) {
  const { view } = loaded;
  const select = useApp((s) => s.select);
  const focusNode = useApp((s) => s.focusNode);
  const { fitView } = useReactFlow();

  // Only the open nodes that are actually in this view affect the layout.
  const openKey = useMemo(
    () => view.nodes.filter((n) => detailsOpen.includes(n.id) && n.role !== "ghost").map((n) => n.id).sort().join(","),
    [view, detailsOpen],
  );
  const built = useMemo(() => build(view, new Set(openKey ? openKey.split(",") : [])), [view, openKey]);

  // Nodes live in state so dragging works. Re-seed them when the build changes
  // (the React-endorsed "adjust state during render" pattern, no effect needed).
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyNode>(built.nodes);
  const [prevBuilt, setPrevBuilt] = useState(built);
  if (prevBuilt !== built) {
    setPrevBuilt(built);
    setNodes(built.nodes);
  }

  // Re-frame after details open or close, because the squares make room for them.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => void fitView({ padding: 0.15, minZoom: 0.4, maxZoom: 1, duration: 250 }), 60);
    return () => clearTimeout(t);
  }, [openKey, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={built.edges}
      onNodesChange={onNodesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={(_, n) => {
        if (n.type === "graph") select({ type: "node", id: n.id });
      }}
      onNodeDoubleClick={(_, n) => {
        if (n.type === "graph") void focusNode(n.id);
      }}
      onPaneClick={() => select(null)}
      zoomOnDoubleClick={false}
      fitView
      fitViewOptions={{ padding: 0.18, minZoom: 0.4, maxZoom: 1 }}
      minZoom={0.15}
      maxZoom={1.8}
      nodesConnectable={false}
      elementsSelectable={false}
      deleteKeyCode={null}
      proOptions={{ hideAttribution: true }}
      colorMode="system"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="var(--canvas-dot)" />
      <Controls showInteractive={false} position="bottom-left" />
      <MiniMap
        pannable
        zoomable
        position="bottom-right"
        nodeColor={(n) => {
          const v = (n.data as { view?: { kind: keyof typeof NODE_KINDS } }).view;
          return v ? NODE_KINDS[v.kind].color : "transparent";
        }}
        maskColor="rgba(0,0,0,0.12)"
        style={{ width: 150, height: 100 }}
      />
    </ReactFlow>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-sm text-muted">
      {children}
    </div>
  );
}
