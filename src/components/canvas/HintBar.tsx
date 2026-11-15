"use client";

import { useEffect } from "react";
import type { GraphView, NodeView } from "@/domain/types";
import { useDevice } from "@/lib/useDevice";
import { type Tab, useApp } from "@/state/store";
import { describeNode } from "@/lib/describe";
import { canvasKeyTarget } from "./keyGate";

function selectedNode(tab: Tab, view?: GraphView): NodeView | null {
  const sel = tab.selection;
  if (sel?.type !== "node" || !view) return null;
  return view.nodes.find((n) => n.id === sel.id && n.role !== "ghost") ?? null;
}

/** Keyboard shortcuts for whatever is selected. The hint bar below teaches them. */
export function useCanvasShortcuts(tab: Tab, view?: GraphView) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!canvasKeyTarget(e)) return;
      const t = e.target as HTMLElement | null;
      // Enter on a focused button inside a node should press that button.
      if (e.key === "Enter" && t?.closest("button")) return;
      const st = useApp.getState();
      if (st.searchOpen) return;
      const k = e.key.toLowerCase();
      if (k === "p") {
        st.setLens(tab.lens === "problems" ? "kind" : "problems");
        return;
      }
      if (k === "escape") {
        if (tab.selection) st.select(null);
        else if (tab.highlightIds.length && !tab.highlightTransient)
          st.clearHighlights();
        return;
      }
      if (k === "backspace") {
        if (tab.path.length > 1) {
          st.goUp();
          e.preventDefault();
        }
        return;
      }
      const n = selectedNode(tab, view);
      if (!n) return;
      const canGoInside = n.childCount > 0;
      const expanded = tab.expandedIds.includes(n.id);
      const canExpand = n.externalCount > 0 || expanded;
      if (k === "enter" && canGoInside) void st.drillInto(n.id);
      else if (k === "e" && canExpand) st.toggleExpanded(n.id);
      else if (k === "o" && canGoInside) st.toggleOpen(n.id);
      else if (k === "h") st.toggleHighlight(n.id);
      else if (k === "d") st.toggleDetails(n.id);
      else if (k === "f") void st.focusNode(n.id);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, view]);
}

function Key({ k }: { k: string }) {
  return (
    <kbd className="rounded border border-line bg-panel2 px-1.5 py-px font-mono text-[10.5px] font-semibold text-ink shadow-[0_1px_0_var(--border)]">
      {k}
    </kbd>
  );
}

type Hint = [key: string, label: string];

/** One line at the bottom of the canvas, like a game's control prompts. */
/** Reads the selection aloud for screen readers; invisible otherwise. */
export function SelectionAnnouncer({
  tab,
  view,
}: {
  tab: Tab;
  view?: GraphView;
}) {
  const n = selectedNode(tab, view);
  const text = n
    ? `Selected ${describeNode(n)}.${n.childCount > 0 ? " Press Enter to open it." : ""}`
    : tab.selection?.type === "relation"
      ? "Relationship selected."
      : "";
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {text}
    </div>
  );
}

export function HintBar({ tab, view }: { tab: Tab; view?: GraphView }) {
  const device = useDevice();
  if (device !== "desktop") return null;
  const n = selectedNode(tab, view);
  let lead = "";
  let hints: Hint[];
  if (n) {
    const expanded = tab.expandedIds.includes(n.id);
    const open = tab.openIds.includes(n.id);
    const lit = tab.highlightIds.includes(n.id);
    const details = tab.detailsOpen.includes(n.id);
    lead = n.name;
    hints = [["←↑↓→", "neighbours"]];
    if (n.childCount > 0) hints.push(["Enter", "open inside"]);
    if (n.externalCount > 0 || expanded)
      hints.push(["E", expanded ? "collapse" : "expand"]);
    if (n.childCount > 0) hints.push(["O", open ? "close here" : "open here"]);
    hints.push(["H", lit ? "clear spotlight" : "spotlight"]);
    hints.push(["D", details ? "hide details" : "details"]);
    hints.push(["F", "focus"]);
    if (tab.path.length > 1) hints.push(["Backspace", "go up"]);
    hints.push(["Esc", "deselect"]);
  } else if (tab.selection?.type === "relation") {
    lead = "Relationship selected";
    hints = [
      ["Esc", "deselect"],
      ["Click", "a node to continue"],
    ];
  } else {
    hints = [
      ["←↑↓→", "move between nodes"],
      ["Click", "select"],
      ["Scroll", "zoom"],
      ["Drag", "pan"],
      ["P", tab.lens === "problems" ? "lens off" : "problems lens"],
      ["Ctrl Z", "undo"],
      ["Ctrl/⌘ K", "search"],
    ];
  }
  return (
    <div
      className="flex h-7 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap border-t border-line bg-panel px-3 text-[11.5px] text-muted"
      role="note"
      aria-label="Keyboard hints"
    >
      {lead && (
        <span className="max-w-[16rem] shrink-0 truncate font-semibold text-ink">
          {lead}:
        </span>
      )}
      {hints.map(([k, l]) => (
        <span key={k} className="flex shrink-0 items-center gap-1.5">
          <Key k={k} />
          {l}
        </span>
      ))}
    </div>
  );
}
