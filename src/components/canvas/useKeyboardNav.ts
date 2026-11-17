"use client";

import { useReactFlow } from "@xyflow/react";
import { useEffect } from "react";
import type { GraphView, Id } from "@/domain/types";
import { useApp } from "@/state/store";
import { canvasKeyTarget } from "./keyGate";

const DIRS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};

/**
 * Arrow keys step to the neighbouring node in that direction, preferring nodes that are
 * connected. Tabbing onto a node selects it, so keyboard and screen-reader users follow the
 * same path as the mouse. Outside nodes are part of the walk like any other.
 */
export function useKeyboardNav(view: GraphView, rootId: Id | null) {
  const { getInternalNode, getViewport, setCenter, getZoom } = useReactFlow();

  useEffect(() => {
    const centerOf = (id: Id) => {
      const n = getInternalNode(id);
      if (!n) return null;
      const p = n.internals.positionAbsolute;
      const w = n.measured.width ?? n.width ?? 132;
      const h = n.measured.height ?? n.height ?? 142;
      return { x: p.x + w / 2, y: p.y + h / 2 };
    };
    const selectNode = (id: Id) => {
      useApp.getState().select({ type: "node", id });
      const c = centerOf(id);
      const dom = document.querySelector(".react-flow") as HTMLElement | null;
      if (c && dom) {
        const vp = getViewport();
        const sx = c.x * vp.zoom + vp.x;
        const sy = c.y * vp.zoom + vp.y;
        const m = 70;
        if (
          sx < m ||
          sy < m ||
          sx > dom.clientWidth - m ||
          sy > dom.clientHeight - m
        )
          void setCenter(c.x, c.y, { zoom: getZoom(), duration: 320 });
      }
      requestAnimationFrame(() =>
        (
          document.querySelector(
            `.react-flow__node[data-id="${CSS.escape(id)}"]`,
          ) as HTMLElement | null
        )?.focus({ preventScroll: true }),
      );
    };

    const onKey = (e: KeyboardEvent) => {
      const dir = DIRS[e.key];
      if (!dir || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (!canvasKeyTarget(e)) return;
      const members = view.nodes;
      if (members.length === 0) return;
      // Stop the built-in "arrow moves the node" behaviour.
      e.preventDefault();
      e.stopPropagation();
      const st = useApp.getState();
      const tab = st.tabs.find((t) => t.id === st.activeTabId);
      const sel = tab?.selection?.type === "node" ? tab.selection.id : null;
      const cur = sel && members.some((n) => n.id === sel) ? sel : null;
      if (!cur) {
        const dom = document.querySelector(".react-flow") as HTMLElement | null;
        const vp = getViewport();
        const mid = {
          x: ((dom?.clientWidth ?? 0) / 2 - vp.x) / vp.zoom,
          y: ((dom?.clientHeight ?? 0) / 2 - vp.y) / vp.zoom,
        };
        const rootNode = members.find((n) => n.id === rootId);
        const best =
          rootNode ??
          [...members]
            .map((n) => ({ n, c: centerOf(n.id) }))
            .filter((x) => x.c)
            .sort(
              (a, b) =>
                Math.hypot(a.c!.x - mid.x, a.c!.y - mid.y) -
                Math.hypot(b.c!.x - mid.x, b.c!.y - mid.y),
            )[0]?.n;
        if (best) selectNode(best.id);
        return;
      }
      const from = centerOf(cur);
      if (!from) return;
      const linked = new Set<Id>();
      for (const r of view.relations) {
        if (r.sourceId === cur) linked.add(r.targetId);
        if (r.targetId === cur) linked.add(r.sourceId);
      }
      let best: { id: Id; score: number } | null = null;
      for (const n of members) {
        if (n.id === cur) continue;
        const c = centerOf(n.id);
        if (!c) continue;
        const dx = c.x - from.x;
        const dy = c.y - from.y;
        const primary = dx * dir[0] + dy * dir[1];
        const perp = Math.abs(dir[0] !== 0 ? dy : dx);
        if (primary < 8 || perp > primary * 2.2) continue;
        let score = primary + 2 * perp;
        if (linked.has(n.id)) score *= 0.55;
        if (!best || score < best.score) best = { id: n.id, score };
      }
      if (best) selectNode(best.id);
    };

    const onFocusIn = (e: FocusEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(
        ".react-flow__node-graph",
      ) as HTMLElement | null;
      const id = el?.getAttribute("data-id");
      if (!id || (e.target as HTMLElement) !== el) return;
      const st = useApp.getState();
      const tab = st.tabs.find((t) => t.id === st.activeTabId);
      if (!(tab?.selection?.type === "node" && tab.selection.id === id))
        st.select({ type: "node", id });
    };

    // Capture phase, so we run before React Flow's own arrow-key handling.
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("focusin", onFocusIn);
    };
  }, [view, rootId, getInternalNode, getViewport, setCenter, getZoom]);
}
