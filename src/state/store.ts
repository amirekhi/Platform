"use client";

import type { LensId } from "@/domain/lenses";
import { create } from "zustand";
import { getDataSource } from "@/data";
import type { Id, NodeView, RelationType, ScopeMode } from "@/domain/types";

/** How much each node and relation draws: by zoom (auto) or fixed. */
export type DetailMode = "auto" | "overview" | "standard" | "full";

export type Selection = { type: "node" | "relation"; id: Id } | null;
export type NodeDetailTab =
  "overview" | "docs" | "diagrams" | "monitoring" | "relations";
export type RelationDetailTab = "overview" | "docs" | "diagrams";
export type DetailTab = NodeDetailTab | RelationDetailTab;

/** One step on a tab's exploration path. */
export interface Scope {
  /** Null with mode "inside" is the whole landscape. */
  rootId: Id | null;
  mode: ScopeMode;
  label: string;
}

/** An analysis laid over the canvas. Pure data, so a future proposal can carry the same shape. */
export type AnalysisState =
  | { kind: "blast"; rootId: Id; maxDepth: number; includeSoft: boolean }
  | { kind: "path"; fromId: Id; toId: Id | null; route: number };

export interface Tab {
  id: string;
  /** Exploration path; the last entry is what the canvas shows. */
  path: Scope[];
  /** How many relation hops "around" views reach. */
  radius: 1 | 2 | 3;
  hiddenRelationTypes: RelationType[];
  showContainment: boolean;
  /** Follow and draw relations that exist between deeper nodes (lifted to this level). */
  showLifted: boolean;
  /** Which lens colours the canvas (see domain/lenses). */
  lens: LensId;
  /** A legend category picked to isolate. */
  lensFocus: string | null;
  /** In "inside" views, also draw the outside nodes the contents connect to. */
  showExternal: boolean;
  detailMode: DetailMode;
  /** Nodes whose details are expanded in place (shown as circles). */
  detailsOpen: Id[];
  /** Nodes expanded in place to show their neighbours. Expansions stack. */
  expandedIds: Id[];
  /** Nodes opened in place (their contents drawn inside them). */
  openIds: Id[];
  /** Nodes whose relations are emphasised. Everything else recedes. */
  highlightIds: Id[];
  /** True when the highlight came from expanding (it then goes away on the next selection). */
  highlightTransient: boolean;
  /** Blast radius or path trace currently drawn on the canvas. */
  analysis: AnalysisState | null;
  selection: Selection;
  detailTab: DetailTab;
  /** Document to open in the Docs tab (set by search results). */
  docId: Id | null;
}

/** What just happened on the canvas, so it can animate to match. */
export interface Motion {
  kind: "enter" | "exit" | "focus" | "expand" | "open" | "details" | "change";
  /** "out" is the lead-in (zoom into the node) before the new view is committed. */
  phase: "out" | "in";
  /** The node the motion is about (where new nodes grow from). */
  anchorId: Id | null;
  tabId: string;
  seq: number;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Performance setting. Auto switches to lite by itself if this device looks slow. */
export type PerfMode = "auto" | "full" | "lite";

/** True when animations and effects should be skipped (lite mode, or the OS asks for less motion). */
export const motionOff = () => {
  const s = useApp.getState();
  return (
    prefersReducedMotion() ||
    s.perfMode === "lite" ||
    (s.perfMode === "auto" && s.autoLite)
  );
};

/** Hook form: is lite mode in force? */
export const useLite = () =>
  useApp((s) => s.perfMode === "lite" || (s.perfMode === "auto" && s.autoLite));

export const currentScope = (t: Tab): Scope => t.path[t.path.length - 1];
export const tabTitle = (t: Tab): string => currentScope(t).label;

interface OpenOpts {
  newTab?: boolean;
  selection?: Selection;
  detailTab?: DetailTab;
  docId?: Id | null;
}

interface AppState {
  tabs: Tab[];
  activeTabId: string;
  searchOpen: boolean;
  explorerOpen: boolean;
  detailOpen: boolean;
  motion: Motion | null;
  perfMode: PerfMode;
  /** Set when the app measured slow frames while in auto mode. */
  autoLite: boolean;
  /** Zoom at which the current view fits the screen. Auto detail is measured relative to it. */
  fitZoom: number | null;

  setPerfMode: (mode: PerfMode) => void;
  setAutoLite: (on: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  toggleExplorer: () => void;
  setDetailOpen: (open: boolean) => void;

  activateTab: (id: string) => void;
  closeTab: (id: string) => void;
  /** Open a node as its own view (its surroundings). Reuses a tab already showing it. */
  openNode: (id: Id, opts?: OpenOpts) => Promise<void>;
  openLandscape: () => Promise<void>;

  /** Same level: re-centre the current tab on another node's surroundings. */
  focusNode: (id: Id, opts?: Omit<OpenOpts, "newTab">) => Promise<void>;
  /** Change level: show what is inside a node. */
  drillInto: (id: Id) => Promise<void>;
  /** Jump back to an earlier step of the path. */
  goToPath: (index: number) => void;
  goUp: () => void;

  select: (selection: Selection, detailTab?: DetailTab) => void;
  startBlast: (rootId: Id) => void;
  setBlast: (p: { maxDepth?: number; includeSoft?: boolean }) => void;
  /** Begin a path trace; the next node selected becomes the destination. */
  startPath: (fromId: Id) => void;
  setPathRoute: (n: number) => void;
  swapPath: () => void;
  clearAnalysis: () => void;
  setDetailTab: (tab: DetailTab) => void;
  setDocId: (id: Id | null) => void;

  toggleDetails: (id: Id) => void;
  /** Show or hide a node's neighbours without touching any other expansion. */
  toggleExpanded: (id: Id) => void;
  /** Open a node in place: show its contents inside it without changing level. */
  toggleOpen: (id: Id) => void;
  closeAllOpen: () => void;
  collapseAllExpanded: () => void;
  /** Turn one node's relation highlight on or off. Manual highlights stack and persist. */
  toggleHighlight: (id: Id) => void;
  clearHighlights: () => void;
  setDetailsFor: (ids: Id[], open: boolean) => void;
  setRadius: (r: 1 | 2 | 3) => void;
  toggleRelationType: (type: RelationType) => void;
  setShowContainment: (show: boolean) => void;
  setShowLifted: (show: boolean) => void;
  setLens: (lens: LensId) => void;
  /** What fills the main area: the graph or the compliance overview. */
  view: "graph" | "compliance";
  setView: (v: "graph" | "compliance") => void;
  hoverNode: { view: NodeView; rect: DOMRect } | null;
  setHoverNode: (h: { view: NodeView; rect: DOMRect } | null) => void;
  setLensFocus: (key: string | null) => void;
  setShowExternal: (show: boolean) => void;
  setDetailMode: (mode: DetailMode) => void;
  resetTab: () => void;
}

let counter = 0;
const newTabId = () => `tab-${++counter}`;

function makeTab(path: Scope[], partial: Partial<Tab> = {}): Tab {
  return {
    id: newTabId(),
    path,
    radius: 1,
    hiddenRelationTypes: [],
    showContainment: true,
    showLifted: true,
    lens: "kind",
    lensFocus: null,
    showExternal: false,
    detailMode: "auto",
    detailsOpen: [],
    expandedIds: [],
    openIds: [],
    highlightIds: [],
    highlightTransient: false,
    analysis: null,
    selection: null,
    detailTab: "overview",
    docId: null,
    ...partial,
  };
}

const LANDSCAPE: Scope = { rootId: null, mode: "inside", label: "Enterprise" };

const patch = (
  s: AppState,
  id: string,
  p: Partial<Tab>,
): Pick<AppState, "tabs"> => ({
  tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...p } : t)),
});
const patchActive = (s: AppState, p: Partial<Tab>) =>
  patch(s, s.activeTabId, p);

let motionSeq = 0;
let motionTimer: ReturnType<typeof setTimeout> | undefined;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Record a motion and clear it once it has had time to play. */
function announce(m: Omit<Motion, "seq">) {
  const seq = ++motionSeq;
  useApp.setState({ motion: { ...m, seq } });
  clearTimeout(motionTimer);
  motionTimer = setTimeout(() => {
    if (useApp.getState().motion?.seq === seq)
      useApp.setState({ motion: null });
  }, 900);
}

const sameScope = (a: Scope, b: Scope) =>
  a.rootId === b.rootId && a.mode === b.mode;

async function labelFor(id: Id): Promise<string | null> {
  return (await getDataSource().getNode(id))?.name ?? null;
}

export const useApp = create<AppState>((set, get) => ({
  tabs: [makeTab([LANDSCAPE])],
  activeTabId: "",
  searchOpen: false,
  explorerOpen: true,
  detailOpen: true,
  motion: null,
  perfMode: "auto",
  autoLite: false,
  fitZoom: null,

  setPerfMode: (mode) => {
    set({ perfMode: mode, autoLite: mode === "auto" ? get().autoLite : false });
    try {
      localStorage.setItem("eco.perf", mode);
    } catch {}
  },
  setAutoLite: (on) => set({ autoLite: on }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  toggleExplorer: () => set((s) => ({ explorerOpen: !s.explorerOpen })),
  setDetailOpen: (open) => set({ detailOpen: open }),

  activateTab: (id) => set({ activeTabId: id }),

  closeTab: (id) =>
    set((s) => {
      if (s.tabs.length === 1) return s;
      const idx = s.tabs.findIndex((t) => t.id === id);
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId =
        s.activeTabId === id ? tabs[Math.max(0, idx - 1)].id : s.activeTabId;
      return { tabs, activeTabId };
    }),

  openLandscape: async () => {
    const existing = get().tabs.find(
      (t) => t.path.length === 1 && sameScope(t.path[0], LANDSCAPE),
    );
    if (existing) return set({ activeTabId: existing.id });
    const tab = makeTab([LANDSCAPE]);
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  openNode: async (id, opts = {}) => {
    const label = await labelFor(id);
    if (!label) return;
    const scope: Scope = { rootId: id, mode: "around", label };
    const selection = opts.selection ?? { type: "node", id };
    const apply = {
      selection,
      detailTab: opts.detailTab ?? "overview",
      docId: opts.docId ?? null,
    } as const;
    const fresh = {
      expandedIds: [] as Id[],
      openIds: [] as Id[],
      highlightIds: [] as Id[],
      highlightTransient: false,
    };

    const existing = opts.newTab
      ? undefined
      : get().tabs.find((t) => sameScope(currentScope(t), scope));
    if (existing) {
      set((s) => ({
        ...patch(s, existing.id, { ...apply, ...fresh }),
        activeTabId: existing.id,
        detailOpen: true,
      }));
      return;
    }
    const tab = makeTab([scope], apply);
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.id,
      detailOpen: true,
    }));
  },

  focusNode: async (id, opts = {}) => {
    const label = await labelFor(id);
    if (!label) return;
    const tab = get().tabs.find((t) => t.id === get().activeTabId);
    if (!tab) return;
    const scope: Scope = { rootId: id, mode: "around", label };
    // Re-focusing the node already in view just selects it.
    const path = sameScope(currentScope(tab), scope)
      ? tab.path
      : [...tab.path, scope];
    if (path !== tab.path)
      announce({ kind: "focus", phase: "in", anchorId: id, tabId: tab.id });
    set((s) => ({
      ...patch(s, tab.id, {
        path,
        expandedIds: path === tab.path ? tab.expandedIds : [],
        openIds: path === tab.path ? tab.openIds : [],
        selection: opts.selection ?? { type: "node", id },
        detailTab: opts.detailTab ?? "overview",
        docId: opts.docId ?? null,
      }),
      detailOpen: true,
    }));
  },

  drillInto: async (id) => {
    const label = await labelFor(id);
    if (!label) return;
    const tab = get().tabs.find((t) => t.id === get().activeTabId);
    if (!tab) return;
    const scope: Scope = { rootId: id, mode: "inside", label };
    if (sameScope(currentScope(tab), scope)) return;
    // Lead-in: zoom into the node while the rest fades, then swap the view.
    if (!motionOff()) {
      announce({ kind: "enter", phase: "out", anchorId: id, tabId: tab.id });
      await sleep(380);
    }
    const now = get().tabs.find((t) => t.id === tab.id);
    if (!now) return;
    announce({ kind: "enter", phase: "in", anchorId: id, tabId: tab.id });
    set((s) =>
      patch(s, tab.id, {
        path: [...now.path, scope],
        expandedIds: [],
        openIds: [],
        highlightIds: [],
        highlightTransient: false,
        selection: { type: "node", id },
        detailTab: "overview",
        docId: null,
      }),
    );
  },

  goToPath: (index) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab || index < 0 || index >= tab.path.length - 1) return s;
      const path = tab.path.slice(0, index + 1);
      const scope = path[path.length - 1];
      announce({
        kind: "exit",
        phase: "in",
        anchorId: tab.path[tab.path.length - 1].rootId,
        tabId: tab.id,
      });
      return patchActive(s, {
        path,
        expandedIds: [],
        openIds: [],
        highlightIds: [],
        highlightTransient: false,
        selection: scope.rootId ? { type: "node", id: scope.rootId } : null,
        detailTab: "overview",
        docId: null,
      });
    }),

  goUp: () => {
    const tab = get().tabs.find((t) => t.id === get().activeTabId);
    if (tab && tab.path.length > 1) get().goToPath(tab.path.length - 2);
  },

  startBlast: (rootId) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      const scope = tab?.path[tab.path.length - 1];
      return patchActive(s, {
        analysis: { kind: "blast", rootId, maxDepth: 0, includeSoft: true },
        // An "around" view only reaches a few hops; open it wide enough to see the spread.
        ...(scope?.mode === "around" ? { radius: 3 as const } : {}),
      });
    }),
  setBlast: (p) =>
    set((s) => {
      const a = s.tabs.find((t) => t.id === s.activeTabId)?.analysis;
      return a?.kind === "blast"
        ? patchActive(s, { analysis: { ...a, ...p } })
        : s;
    }),
  startPath: (fromId) =>
    set((s) =>
      patchActive(s, {
        analysis: { kind: "path", fromId, toId: null, route: 0 },
      }),
    ),
  setPathRoute: (route) =>
    set((s) => {
      const a = s.tabs.find((t) => t.id === s.activeTabId)?.analysis;
      return a?.kind === "path"
        ? patchActive(s, { analysis: { ...a, route } })
        : s;
    }),
  swapPath: () =>
    set((s) => {
      const a = s.tabs.find((t) => t.id === s.activeTabId)?.analysis;
      return a?.kind === "path" && a.toId
        ? patchActive(s, {
            analysis: { ...a, fromId: a.toId, toId: a.fromId, route: 0 },
          })
        : s;
    }),
  clearAnalysis: () => set((s) => patchActive(s, { analysis: null })),

  select: (selection, detailTab) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      // While a path trace is waiting for its destination, the next node picked is it.
      const an = tab?.analysis;
      if (
        an?.kind === "path" &&
        an.toId === null &&
        selection?.type === "node" &&
        selection.id !== an.fromId
      ) {
        return {
          ...patchActive(s, {
            analysis: { ...an, toId: selection.id, route: 0 },
            selection,
            detailTab: detailTab ?? "overview",
            docId: null,
          }),
          detailOpen: true,
        };
      }
      // A highlight made by expanding fades once something else is selected; manual ones stay.
      const keep =
        !tab?.highlightTransient ||
        (selection?.type === "node" && tab.highlightIds.includes(selection.id));
      return {
        ...patchActive(s, {
          selection,
          detailTab: detailTab ?? "overview",
          docId: null,
          ...(keep ? {} : { highlightIds: [], highlightTransient: false }),
        }),
        detailOpen: selection ? true : s.detailOpen,
      };
    }),

  setDetailTab: (tab) =>
    set((s) => patchActive(s, { detailTab: tab, docId: null })),
  setDocId: (id) => set((s) => patchActive(s, { docId: id })),

  toggleDetails: (id) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab) return s;
      const open = tab.detailsOpen.includes(id)
        ? tab.detailsOpen.filter((x) => x !== id)
        : [...tab.detailsOpen, id];
      announce({ kind: "details", phase: "in", anchorId: id, tabId: tab.id });
      return patchActive(s, { detailsOpen: open });
    }),

  toggleExpanded: (id) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab) return s;
      const on = tab.expandedIds.includes(id);
      announce({ kind: "expand", phase: "in", anchorId: id, tabId: tab.id });
      // Expanding makes this node the only highlighted one (so the user keeps their place
      // while the layout moves). Collapsing just drops its own highlight.
      return patchActive(s, {
        expandedIds: on
          ? tab.expandedIds.filter((x) => x !== id)
          : [...tab.expandedIds, id],
        highlightIds: on ? tab.highlightIds.filter((x) => x !== id) : [id],
        highlightTransient: on
          ? tab.highlightTransient && tab.highlightIds.some((x) => x !== id)
          : true,
      });
    }),

  toggleOpen: (id) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab) return s;
      const on = tab.openIds.includes(id);
      announce({ kind: "open", phase: "in", anchorId: id, tabId: tab.id });
      return patchActive(s, {
        openIds: on
          ? tab.openIds.filter((x) => x !== id)
          : [...tab.openIds, id],
      });
    }),

  closeAllOpen: () => set((s) => patchActive(s, { openIds: [] })),

  toggleHighlight: (id) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab) return s;
      const on = tab.highlightIds.includes(id);
      announce({ kind: "change", phase: "in", anchorId: null, tabId: tab.id });
      // Turning one on by hand makes the whole set persistent.
      return patchActive(s, {
        highlightIds: on
          ? tab.highlightIds.filter((x) => x !== id)
          : [...tab.highlightIds, id],
        highlightTransient: false,
      });
    }),

  clearHighlights: () =>
    set((s) => patchActive(s, { highlightIds: [], highlightTransient: false })),

  collapseAllExpanded: () =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      return patchActive(s, {
        expandedIds: [],
        ...(tab?.highlightTransient
          ? { highlightIds: [], highlightTransient: false }
          : {}),
      });
    }),

  setDetailsFor: (ids, open) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab) return s;
      const keep = tab.detailsOpen.filter((x) => !ids.includes(x));
      return patchActive(s, { detailsOpen: open ? [...keep, ...ids] : keep });
    }),

  setRadius: (radius) =>
    set((s) => {
      announce({
        kind: "change",
        phase: "in",
        anchorId: null,
        tabId: s.activeTabId,
      });
      return patchActive(s, { radius });
    }),

  toggleRelationType: (type) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab) return s;
      const hidden = tab.hiddenRelationTypes.includes(type)
        ? tab.hiddenRelationTypes.filter((t) => t !== type)
        : [...tab.hiddenRelationTypes, type];
      return patchActive(s, { hiddenRelationTypes: hidden });
    }),

  setShowContainment: (show) =>
    set((s) => patchActive(s, { showContainment: show })),
  setShowLifted: (show) => set((s) => patchActive(s, { showLifted: show })),
  view: "graph",
  setView: (view) => set({ view }),
  hoverNode: null,
  setHoverNode: (h) => set({ hoverNode: h }),
  setLens: (lens) => set((s) => patchActive(s, { lens, lensFocus: null })),
  setLensFocus: (key) => set((s) => patchActive(s, { lensFocus: key })),
  setShowExternal: (show) => set((s) => patchActive(s, { showExternal: show })),
  setDetailMode: (mode) => set((s) => patchActive(s, { detailMode: mode })),

  resetTab: () =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab) return s;
      const first = tab.path[0];
      return patchActive(s, {
        path: [first],
        radius: 1,
        hiddenRelationTypes: [],
        showContainment: true,
        showLifted: true,
        showExternal: false,
        detailsOpen: [],
        expandedIds: [],
        openIds: [],
        highlightIds: [],
        highlightTransient: false,
        selection: first.rootId ? { type: "node", id: first.rootId } : null,
        detailTab: "overview",
        docId: null,
      });
    }),
}));

/** Initialise the first tab. */
let booted = false;
export function bootApp() {
  if (booted) return;
  booted = true;
  const tab = makeTab([LANDSCAPE]);
  useApp.setState({ tabs: [tab], activeTabId: tab.id });
}

export function useActiveTab(): Tab | undefined {
  return useApp((s) => s.tabs.find((t) => t.id === s.activeTabId));
}
