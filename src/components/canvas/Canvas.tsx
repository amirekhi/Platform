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
  getViewportForBounds,
  useStore,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDevice } from "@/lib/useDevice";
import { useLite, prefersReducedMotion } from "@/state/store";
import { getDataSource } from "@/data";
import { NODE_KINDS } from "@/domain/registry";
import { lineStyle } from "@/domain/relationStyle";
import type { GraphView, Id } from "@/domain/types";
import { useAsync } from "@/lib/useAsync";
import { currentScope, type Tab, useApp } from "@/state/store";
import { CanvasBar } from "./CanvasBar";
import { DetailBubble, type DetailFlowNode } from "./DetailBubble";
import { detailCategories } from "./details";
import {
  ContainmentEdge,
  type ContainmentFlowEdge,
  RelationEdge,
  type RelationFlowEdge,
} from "./GraphEdges";
import {
  GraphNodeCard,
  HighlightContext,
  type GraphFlowNode,
} from "./GraphNodeCard";
import { useTheme } from "@/lib/theme";
import { FocusCard } from "./FocusCard";
import { useHistoryShortcuts } from "@/state/history";
import { describeNode } from "@/lib/describe";
import { useKeyboardNav } from "./useKeyboardNav";
import { HintBar, SelectionAnnouncer, useCanvasShortcuts } from "./HintBar";
import { HoverCard } from "./HoverCard";
import { Legend } from "./Legend";
import { TryList } from "@/components/help/TryList";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { AnalysisContext } from "@/components/analysis/context";
import { buildMarks } from "@/components/analysis/marks";
import { useAnalysis } from "@/components/analysis/useAnalysis";
import { LensLegend } from "./LensLegend";
import { LensContext } from "./lensContext";
import { buildLensState } from "@/domain/lenses";
import { arrowSize, lineWidth } from "./lineWidth";
import { useSmoothWheelZoom } from "./useSmoothZoom";
import { NODE_H, NODE_W, computeLayout, detailSlots } from "./layout";

const nodeTypes = { graph: GraphNodeCard, detail: DetailBubble };
const edgeTypes = { relation: RelationEdge, containment: ContainmentEdge };

interface Loaded {
  key: string;
  /** Changes only when the level changes. Expansions and filters update in place. */
  flowKey: string;
  view: GraphView;
}

const flowKeyOf = (tab: Tab) => {
  const s = currentScope(tab);
  return [tab.id, s.rootId ?? "~", s.mode].join("|");
};

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
    tab.showLifted ? "l" : "",
    s.mode === "inside" && tab.showExternal ? "x" : "",
    [...tab.expandedIds].sort().join(","),
    [...tab.openIds].sort().join(","),
  ].join("|");
}

export function Canvas({ tab }: { tab: Tab }) {
  const key = scopeKey(tab);
  const scope = currentScope(tab);
  const { data, last } = useAsync<Loaded>(key, async () => ({
    key,
    flowKey: flowKeyOf(tab),
    view: await getDataSource().getScopeView({
      rootId: scope.rootId,
      mode: scope.mode,
      radius: tab.radius,
      hiddenRelationTypes: tab.hiddenRelationTypes,
      showContainment: tab.showContainment,
      showLifted: tab.showLifted,
      showExternal: tab.showExternal,
      expandedIds: tab.expandedIds,
      openIds: tab.openIds,
    }),
  }));
  const loaded = data ?? last;
  const motion = useApp((s) => (s.motion?.tabId === tab.id ? s.motion : null));
  const lead = motion?.kind === "enter" && motion.phase === "out";
  const anim =
    motion &&
    motion.phase === "in" &&
    (motion.kind === "enter" ||
      motion.kind === "exit" ||
      motion.kind === "focus")
      ? `anim-${motion.kind}`
      : "";

  useCanvasShortcuts(tab, loaded?.view);
  useHistoryShortcuts();
  const lensViewNodes = loaded?.view.nodes;
  const lensFocus = tab.lensFocus;
  const lensState = useMemo(
    () => buildLensState(lensViewNodes ?? [], tab.lens, lensFocus),
    [lensViewNodes, tab.lens, lensFocus],
  );

  const { snap, result } = useAnalysis(tab.analysis);
  const marks = useMemo(
    () =>
      snap && tab.analysis && lensViewNodes
        ? buildMarks(
            snap,
            tab.analysis,
            result,
            lensViewNodes.map((n) => n.id),
          )
        : null,
    [snap, tab.analysis, result, lensViewNodes],
  );

  return (
    <LensContext.Provider value={lensState}>
      <AnalysisContext.Provider value={marks}>
        <ReactFlowProvider>
          <div className="flex h-full w-full flex-col">
            <div className="relative min-h-0 w-full flex-1">
              <div
                className={`absolute inset-0 ${anim} ${lead ? "motion-lead" : ""}`}
              >
                {loaded ? (
                  <Flow
                    key={loaded.flowKey}
                    loaded={loaded}
                    detailsOpen={tab.detailsOpen}
                    rootId={scope.rootId}
                  />
                ) : (
                  <Centered>Loading…</Centered>
                )}
              </div>
              <CanvasBar tab={tab} view={loaded?.view} />
              <FocusCard
                rootId={scope.rootId}
                mode={scope.mode}
                view={loaded?.view}
              />
              <LensLegend state={lensState} />
              {tab.analysis ? (
                <AnalysisPanel
                  analysis={tab.analysis}
                  snap={snap}
                  result={result}
                />
              ) : (
                <Legend />
              )}
              {loaded && loaded.view.nodes.length === 0 && (
                <EmptyCanvas inside={scope.mode === "inside"} />
              )}
            </div>
            <SelectionAnnouncer tab={tab} view={loaded?.view} />
            <HintBar tab={tab} view={loaded?.view} />
            <HoverCard />
          </div>
        </ReactFlowProvider>
      </AnalysisContext.Provider>
    </LensContext.Provider>
  );
}

type AnyNode = GraphFlowNode | DetailFlowNode;
type AnyEdge = RelationFlowEdge | ContainmentFlowEdge | Edge;

const NOTHING_LEAVING: { nodes: AnyNode[]; edges: AnyEdge[] } = {
  nodes: [],
  edges: [],
};

function build(
  view: GraphView,
  open: Set<Id>,
  vertical: boolean,
  touch: boolean,
) {
  const { pos, size } = computeLayout(view, open, vertical);
  const nodes: AnyNode[] = [];
  const edges: AnyEdge[] = [];

  // Parents must come before the nodes inside them. Nodes opened in place become boxes
  // and the nodes they contain are children of the box, so they move with it.
  const byId = new Map(view.nodes.map((n) => [n.id, n]));
  const kids = new Map<string | null, typeof view.nodes>();
  for (const v of view.nodes) {
    const key = v.containerId && byId.has(v.containerId) ? v.containerId : null;
    kids.set(key, [...(kids.get(key) ?? []), v]);
  }
  const emit = (v: (typeof view.nodes)[number], depth: number) => {
    const box = size[v.id];
    nodes.push({
      id: v.id,
      type: "graph",
      ariaLabel: describeNode(v),
      position: pos[v.id] ?? { x: 0, y: 0 },
      parentId:
        v.containerId && byId.has(v.containerId) ? v.containerId : undefined,
      ...(box
        ? { width: box.w, height: box.h, className: "is-box", zIndex: depth }
        : { zIndex: depth + 10 }),
      // On touch devices a node moves only by its grip, so panning never drags one by accident.
      ...(touch ? { dragHandle: ".node-grip" } : {}),
      data: { view: v, box },
    } as GraphFlowNode);
    for (const c of kids.get(v.id) ?? []) emit(c, depth + 1);
  };
  for (const v of kids.get(null) ?? []) emit(v, 0);

  // Detail circles are children of their square so they travel with it when dragged.
  for (const v of view.nodes) {
    if (!open.has(v.id) || v.role === "ghost" || v.open) continue;
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
        style: {
          stroke: cat.color,
          strokeWidth: 1.4,
          strokeDasharray: "2 4",
          opacity: 0.8,
        },
      });
    });
  }

  // Pairs of nodes joined by several relations get staggered curves and labels.
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const pairCount = new Map<string, number>();
  for (const r of view.relations)
    pairCount.set(
      pairKey(r.sourceId, r.targetId),
      (pairCount.get(pairKey(r.sourceId, r.targetId)) ?? 0) + 1,
    );
  const pairSeen = new Map<string, number>();

  for (const c of view.containment) {
    edges.push({
      id: `c:${c.parentId}:${c.childId}`,
      type: "containment",
      source: c.parentId,
      sourceHandle: vertical ? "bottom" : "r",
      target: c.childId,
      targetHandle: vertical ? "tin" : "l",
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
      sourceHandle: vertical ? "bottom" : "r",
      target: r.targetId,
      targetHandle: vertical ? "tin" : "l",
      data: {
        rel: r,
        index: idx,
        total: pairCount.get(k) ?? 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: lineStyle(r).color,
        // Fixed pixel size (not scaled by the line), so thick lines keep a sensible arrowhead.
        markerUnits: "userSpaceOnUse",
        width: arrowSize(
          lineWidth(r.count ?? r.viaIds?.length ?? 1, Boolean(r.derived)),
        ),
        height: arrowSize(
          lineWidth(r.count ?? r.viaIds?.length ?? 1, Boolean(r.derived)),
        ),
      },
    } as RelationFlowEdge);
  }
  return { nodes, edges };
}

function Flow({
  loaded,
  detailsOpen,
  rootId,
}: {
  loaded: Loaded;
  detailsOpen: Id[];
  rootId: Id | null;
}) {
  const { view } = loaded;
  useKeyboardNav(view, rootId);
  const select = useApp((s) => s.select);
  const focusNode = useApp((s) => s.focusNode);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Only the open nodes that are actually in this view affect the layout.
  const openKey = useMemo(
    () =>
      view.nodes
        .filter((n) => detailsOpen.includes(n.id) && n.role !== "ghost")
        .map((n) => n.id)
        .sort()
        .join(","),
    [view, detailsOpen],
  );
  // Phones lay the graph out top to bottom to use the tall screen.
  const device = useDevice();
  const theme = useTheme();
  const liteNow = useLite();
  useSmoothWheelZoom({
    minZoom: device === "desktop" ? 0.15 : 0.05,
    maxZoom: 2.6,
    instant: prefersReducedMotion() || liteNow,
  });
  const vertical = device === "mobile";
  const built = useMemo(
    () =>
      build(
        view,
        new Set(openKey ? openKey.split(",") : []),
        vertical,
        device !== "desktop",
      ),
    [view, openKey, vertical, device],
  );

  // Nodes live in state so dragging works. When the build changes (an expansion,
  // a filter, opened details) the render-phase reseed keeps every surviving node
  // where it is and starts new nodes at the node they grew from. An effect then
  // tweens everything to its new layout position.
  const motion = useApp((s) => s.motion);
  const highlightIds = useApp(
    (s) => s.tabs.find((t) => t.id === s.activeTabId)?.highlightIds,
  );
  const selectedRel = useApp((s) => {
    const sel = s.tabs.find((t) => t.id === s.activeTabId)?.selection;
    return sel?.type === "relation" ? sel.id : null;
  });
  const lit = useMemo(() => {
    const marked = (highlightIds ?? []).filter((id) =>
      view.nodes.some((n) => n.id === id),
    );
    if (marked.length === 0) return null;
    const set = new Set<string>(marked);
    const m = new Set(marked);
    for (const r of view.relations) {
      if (m.has(r.sourceId)) set.add(r.targetId);
      if (m.has(r.targetId)) set.add(r.sourceId);
    }
    // The ends of a selected relation stay readable while the rest recedes.
    const sr = selectedRel
      ? view.relations.find(
          (r) => r.id === selectedRel || r.memberIds?.includes(selectedRel),
        )
      : undefined;
    if (sr) {
      set.add(sr.sourceId);
      set.add(sr.targetId);
    }
    return set;
  }, [view, highlightIds, selectedRel]);
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyNode>(built.nodes);
  const [prevBuilt, setPrevBuilt] = useState(built);
  // Things that were just removed stay on screen for a moment and fade away.
  const [leaving, setLeaving] = useState<{
    nodes: AnyNode[];
    edges: AnyEdge[];
  }>(NOTHING_LEAVING);
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  });
  const lite = useLite();
  // Small screens must be able to fit the whole view; desktop keeps its original limit.
  const fitMin = device === "desktop" ? 0.4 : 0.05;
  const reduced = prefersReducedMotion() || lite;
  if (prevBuilt !== built) {
    setPrevBuilt(built);
    if (reduced) {
      setNodes(built.nodes);
    } else {
      if (built.nodes.length <= 90) {
        const keep = new Set(built.nodes.map((n) => n.id));
        const keepE = new Set(built.edges.map((e) => e.id));
        const goneN = nodes
          .filter((n) => !keep.has(n.id))
          .map(
            (n) =>
              ({
                ...n,
                className: `${n.className ?? ""} node-leaving`,
                selectable: false,
                draggable: false,
              }) as AnyNode,
          );
        const goneE = prevBuilt.edges
          .filter((e) => !keepE.has(e.id))
          .map((e) => ({ ...e, className: "edge-leaving" }) as AnyEdge);
        setLeaving(
          goneN.length || goneE.length
            ? { nodes: goneN, edges: goneE }
            : NOTHING_LEAVING,
        );
      }
      const here = new Map(nodes.map((n) => [n.id, n.position]));
      const anchor =
        here.get(motion?.anchorId ?? rootId ?? "") ?? built.nodes[0]?.position;
      setNodes(
        built.nodes.map((n) => {
          if (n.type !== "graph") return n;
          const start = here.get(n.id);
          if (start) return { ...n, position: start };
          // Nodes appearing inside an opened box grow in place (their position is relative).
          if (n.parentId)
            return { ...n, data: { ...n.data, fresh: true } } as AnyNode;
          return {
            ...n,
            position: anchor ?? n.position,
            data: { ...n.data, fresh: true },
          } as AnyNode;
        }),
      );
    }
  }

  useEffect(() => {
    if (leaving === NOTHING_LEAVING) return;
    const t = setTimeout(() => setLeaving(NOTHING_LEAVING), 340);
    return () => clearTimeout(t);
  }, [leaving]);
  const shownNodes = useMemo(() => {
    if (leaving === NOTHING_LEAVING) return nodes;
    const have = new Set(nodes.map((n) => n.id));
    return [...nodes, ...leaving.nodes.filter((n) => !have.has(n.id))];
  }, [nodes, leaving]);
  const shownEdges = useMemo(() => {
    if (leaving === NOTHING_LEAVING) return built.edges;
    const have = new Set(built.edges.map((e) => e.id));
    return [...built.edges, ...leaving.edges.filter((e) => !have.has(e.id))];
  }, [built.edges, leaving]);

  const firstBuild = useRef(true);
  useEffect(() => {
    if (firstBuild.current) {
      firstBuild.current = false;
      return;
    }
    if (reduced) return;
    if (built.nodes.length > 90) {
      setNodes(built.nodes);
      return;
    }
    const target = new Map(
      built.nodes
        .filter((n) => n.type === "graph")
        .map((n) => [n.id, n.position]),
    );
    const from = new Map(nodesRef.current.map((n) => [n.id, n.position]));
    const t0 = performance.now();
    const DURATION = 420;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setNodes((nds) =>
        nds.map((n) => {
          const to = target.get(n.id);
          const f = from.get(n.id);
          if (!to || !f) return n;
          // Nodes that do not move keep their object, so nothing re-renders for them.
          if (f.x === to.x && f.y === to.y) return n;
          return {
            ...n,
            position: { x: f.x + (to.x - f.x) * e, y: f.y + (to.y - f.y) * e },
          };
        }),
      );
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built]);

  // Lead-in of "going in": zoom the camera into the node being entered.
  useEffect(() => {
    if (motion?.kind === "enter" && motion.phase === "out" && motion.anchorId) {
      void fitView({
        nodes: [{ id: motion.anchorId }],
        padding: 0.25,
        maxZoom: 2.4,
        duration: 360,
      });
    }
  }, [motion, fitView]);

  // Auto detail is measured against the zoom that fits this whole layout on screen, so every
  // view (and every canvas size) starts in overview. Computed from the layout itself, which
  // is exactly what fitView frames, so it is known before the camera has finished moving.
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  useEffect(() => {
    const boxes = built.nodes.filter((n) => n.type === "graph" && !n.parentId);
    if (!boxes.length || !width || !height) return;
    const x1 = Math.min(...boxes.map((n) => n.position.x));
    const y1 = Math.min(...boxes.map((n) => n.position.y));
    const x2 = Math.max(
      ...boxes.map((n) => n.position.x + (n.width ?? NODE_W)),
    );
    const y2 = Math.max(
      ...boxes.map((n) => n.position.y + (n.height ?? NODE_H)),
    );
    const vp = getViewportForBounds(
      { x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
      width,
      height,
      fitMin,
      1,
      0.18,
    );
    useApp.setState({ fitZoom: vp.zoom });
  }, [built, width, height, fitMin]);
  useEffect(() => () => useApp.setState({ fitZoom: null }), []);

  // Re-frame once the layout has settled after any change of what is shown.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(
      () =>
        void fitView({
          padding: 0.15,
          minZoom: fitMin,
          maxZoom: 1,
          duration: 300,
        }),
      reduced ? 60 : 450,
    );
    return () => clearTimeout(t);
  }, [built, fitView, reduced, fitMin]);

  return (
    <HighlightContext.Provider value={lit}>
      <ReactFlow
        onlyRenderVisibleElements
        nodesDraggable
        nodes={shownNodes}
        edges={shownEdges}
        onNodesChange={onNodesChange}
        onInit={(rf) => {
          if (device !== "desktop")
            document.documentElement.style.setProperty(
              "--zoom",
              String(rf.getZoom()),
            );
        }}
        onMoveEnd={(_, vp) => {
          if (device !== "desktop")
            document.documentElement.style.setProperty(
              "--zoom",
              String(vp.zoom),
            );
        }}
        onMove={(_, vp) => {
          if (device !== "desktop")
            document.documentElement.style.setProperty(
              "--zoom",
              String(vp.zoom),
            );
        }}
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
        zoomOnScroll={false}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: fitMin, maxZoom: 1 }}
        minZoom={device === "desktop" ? 0.15 : 0.05}
        maxZoom={2.6}
        nodesConnectable={false}
        elementsSelectable={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        colorMode={theme}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.4}
          color="var(--canvas-dot)"
        />
        <Controls
          showInteractive={false}
          position="bottom-left"
          onZoomIn={() => void zoomIn({ duration: 320 })}
          onZoomOut={() => void zoomOut({ duration: 320 })}
          fitViewOptions={{
            padding: 0.18,
            minZoom: fitMin,
            maxZoom: 1,
            duration: 450,
          }}
        />
        {!lite && device === "desktop" && (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            nodeColor={(n) => {
              const v = (n.data as { view?: { kind: keyof typeof NODE_KINDS } })
                .view;
              return v ? NODE_KINDS[v.kind].color : "transparent";
            }}
            maskColor="rgba(0,0,0,0.12)"
            style={{ width: 150, height: 100 }}
          />
        )}
      </ReactFlow>
    </HighlightContext.Provider>
  );
}

function EmptyCanvas({ inside }: { inside: boolean }) {
  const goUp = useApp((s) => s.goUp);
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center px-6">
      <div className="pointer-events-auto w-full max-w-[340px] text-center">
        <div className="text-[14px] font-semibold text-ink">
          {inside ? "Nothing is inside this node" : "Nothing to show here"}
        </div>
        <p className="mt-1 text-[12.5px] text-muted">
          {inside
            ? "It is a leaf, so there is nothing to open. Go back up, or try one of these."
            : "Your filters may be hiding everything. Go back, or try one of these."}
        </p>
        <button
          type="button"
          onClick={goUp}
          className="mx-auto mt-3 rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white"
        >
          Go back up
        </button>
        <div className="mt-4 text-left">
          <TryList limit={3} compact />
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-sm text-muted">
      {children}
    </div>
  );
}
