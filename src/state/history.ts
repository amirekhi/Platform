"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { LENS_BY_ID } from "@/domain/lenses";
import { type Tab, useApp } from "./store";

/**
 * Undo and redo for how you are looking at things: where you went, what you expanded, opened,
 * highlighted or filtered. Each tab has its own stack. Selection is left out on purpose, so
 * clicking around never fills the stack. It sits beside the path in the bar, not in a panel.
 */
const KEYS = [
  "path",
  "radius",
  "hiddenRelationTypes",
  "showContainment",
  "showLifted",
  "showExternal",
  "lens",
  "detailMode",
  "detailsOpen",
  "expandedIds",
  "openIds",
  "highlightIds",
  "highlightTransient",
] as const;

type Snap = Pick<Tab, (typeof KEYS)[number]>;
interface Entry {
  snap: Snap;
  label: string;
}
interface Stacks {
  past: Entry[];
  future: Entry[];
}

const MAX = 100;
/** Changes closer together than this belong to one action (a drill-in changes several things). */
const COALESCE_MS = 450;

const snapOf = (t: Tab): Snap =>
  Object.fromEntries(KEYS.map((k) => [k, t[k]])) as unknown as Snap;
const keyOf = (s: Snap) => JSON.stringify(s);

function labelFor(from: Snap, to: Snap): string {
  if (from.path.length !== to.path.length)
    return to.path.length > from.path.length
      ? `going inside ${to.path[to.path.length - 1]?.label ?? ""}`.trim()
      : "going back up";
  if (JSON.stringify(from.path) !== JSON.stringify(to.path))
    return "changing focus";
  const grew = (a: unknown[], b: unknown[]) => b.length > a.length;
  if (JSON.stringify(from.expandedIds) !== JSON.stringify(to.expandedIds))
    return grew(from.expandedIds, to.expandedIds) ? "expanding" : "collapsing";
  if (JSON.stringify(from.openIds) !== JSON.stringify(to.openIds))
    return grew(from.openIds, to.openIds)
      ? "opening in place"
      : "closing in place";
  if (JSON.stringify(from.detailsOpen) !== JSON.stringify(to.detailsOpen))
    return "details circles";
  if (JSON.stringify(from.highlightIds) !== JSON.stringify(to.highlightIds))
    return "spotlight";
  if (from.lens !== to.lens) return `lens: ${LENS_BY_ID[to.lens].label}`;
  if (from.detailMode !== to.detailMode) return "detail level";
  return "view change";
}

export const useHistory = create<{
  tabs: Record<string, Stacks>;
}>(() => ({ tabs: {} }));

let applying = false;
let lastPush = 0;

const stacksOf = (id: string): Stacks =>
  useHistory.getState().tabs[id] ?? { past: [], future: [] };
const put = (id: string, s: Stacks) =>
  useHistory.setState((h) => ({ tabs: { ...h.tabs, [id]: s } }));

function activeTab() {
  const s = useApp.getState();
  return s.tabs.find((t) => t.id === s.activeTabId);
}

function restore(tabId: string, snap: Snap) {
  applying = true;
  useApp.setState((s) => ({
    tabs: s.tabs.map((t) =>
      t.id === tabId
        ? {
            ...t,
            ...snap,
            // What was selected may not exist in the restored view.
            selection: null,
            lensFocus: null,
          }
        : t,
    ),
  }));
  applying = false;
}

export function undo() {
  const t = activeTab();
  if (!t) return;
  const st = stacksOf(t.id);
  const e = st.past[st.past.length - 1];
  if (!e) return;
  const now = snapOf(t);
  put(t.id, {
    past: st.past.slice(0, -1),
    future: [...st.future, { snap: now, label: e.label }],
  });
  restore(t.id, e.snap);
}

export function redo() {
  const t = activeTab();
  if (!t) return;
  const st = stacksOf(t.id);
  const e = st.future[st.future.length - 1];
  if (!e) return;
  const now = snapOf(t);
  put(t.id, {
    past: [...st.past, { snap: now, label: e.label }],
    future: st.future.slice(0, -1),
  });
  restore(t.id, e.snap);
}

// Record every change to the view state of the active tab.
if (typeof window !== "undefined") {
  useApp.subscribe((s, prev) => {
    if (applying) return;
    const t = s.tabs.find((x) => x.id === s.activeTabId);
    const p = prev.tabs.find((x) => x.id === t?.id);
    if (!t || !p) return;
    const a = snapOf(p);
    const b = snapOf(t);
    if (keyOf(a) === keyOf(b)) return;
    const now = Date.now();
    const st = stacksOf(t.id);
    if (now - lastPush < COALESCE_MS && st.past.length > 0) {
      lastPush = now;
      // Same action: keep the earlier "before" state, but update the label to the latest cause.
      return;
    }
    lastPush = now;
    put(t.id, {
      past: [...st.past, { snap: a, label: labelFor(a, b) }].slice(-MAX),
      future: [],
    });
  });
}

/** Current undo/redo state of the active tab, for buttons. */
export function useHistoryState() {
  const id = useApp((s) => s.activeTabId);
  const st = useHistory((h) => h.tabs[id]);
  const past = st?.past ?? [];
  const future = st?.future ?? [];
  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoLabel: past[past.length - 1]?.label,
    redoLabel: future[future.length - 1]?.label,
  };
}

/** Ctrl/Cmd+Z undoes, Ctrl+Y or Ctrl+Shift+Z redoes. Leaves text fields to the browser. */
export function useHistoryShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      )
        return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) undo();
      else if (k === "y" || (k === "z" && e.shiftKey)) redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
