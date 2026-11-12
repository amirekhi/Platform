"use client";

import { create } from "zustand";
import { getDataSource } from "@/data";
import type { Id, RelationType, ScopeMode } from "@/domain/types";

export type Selection = { type: "node" | "relation"; id: Id } | null;
export type NodeDetailTab = "overview" | "docs" | "diagrams" | "monitoring" | "relations";
export type RelationDetailTab = "overview" | "docs" | "diagrams";
export type DetailTab = NodeDetailTab | RelationDetailTab;

/** One step on a tab's exploration path. */
export interface Scope {
  /** Null with mode "inside" is the whole landscape. */
  rootId: Id | null;
  mode: ScopeMode;
  label: string;
}

export interface Tab {
  id: string;
  /** Exploration path; the last entry is what the canvas shows. */
  path: Scope[];
  /** How many relation hops "around" views reach. */
  radius: 1 | 2 | 3;
  hiddenRelationTypes: RelationType[];
  showContainment: boolean;
  /** In "inside" views, also draw the outside nodes the contents connect to. */
  showExternal: boolean;
  /** Nodes whose details are expanded in place (shown as circles). */
  detailsOpen: Id[];
  selection: Selection;
  detailTab: DetailTab;
  /** Document to open in the Docs tab (set by search results). */
  docId: Id | null;
}

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
  setDetailTab: (tab: DetailTab) => void;
  setDocId: (id: Id | null) => void;

  toggleDetails: (id: Id) => void;
  setDetailsFor: (ids: Id[], open: boolean) => void;
  setRadius: (r: 1 | 2 | 3) => void;
  toggleRelationType: (type: RelationType) => void;
  setShowContainment: (show: boolean) => void;
  setShowExternal: (show: boolean) => void;
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
    showExternal: false,
    detailsOpen: [],
    selection: null,
    detailTab: "overview",
    docId: null,
    ...partial,
  };
}

const LANDSCAPE: Scope = { rootId: null, mode: "inside", label: "Landscape" };

const patch = (s: AppState, id: string, p: Partial<Tab>): Pick<AppState, "tabs"> => ({
  tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...p } : t)),
});
const patchActive = (s: AppState, p: Partial<Tab>) => patch(s, s.activeTabId, p);

const sameScope = (a: Scope, b: Scope) => a.rootId === b.rootId && a.mode === b.mode;

async function labelFor(id: Id): Promise<string | null> {
  return (await getDataSource().getNode(id))?.name ?? null;
}

export const useApp = create<AppState>((set, get) => ({
  tabs: [makeTab([LANDSCAPE])],
  activeTabId: "",
  searchOpen: false,
  explorerOpen: true,
  detailOpen: true,

  setSearchOpen: (open) => set({ searchOpen: open }),
  toggleExplorer: () => set((s) => ({ explorerOpen: !s.explorerOpen })),
  setDetailOpen: (open) => set({ detailOpen: open }),

  activateTab: (id) => set({ activeTabId: id }),

  closeTab: (id) =>
    set((s) => {
      if (s.tabs.length === 1) return s;
      const idx = s.tabs.findIndex((t) => t.id === id);
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId = s.activeTabId === id ? tabs[Math.max(0, idx - 1)].id : s.activeTabId;
      return { tabs, activeTabId };
    }),

  openLandscape: async () => {
    const existing = get().tabs.find((t) => t.path.length === 1 && sameScope(t.path[0], LANDSCAPE));
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

    const existing = opts.newTab ? undefined : get().tabs.find((t) => sameScope(currentScope(t), scope));
    if (existing) {
      set((s) => ({ ...patch(s, existing.id, apply), activeTabId: existing.id, detailOpen: true }));
      return;
    }
    const tab = makeTab([scope], apply);
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id, detailOpen: true }));
  },

  focusNode: async (id, opts = {}) => {
    const label = await labelFor(id);
    if (!label) return;
    const tab = get().tabs.find((t) => t.id === get().activeTabId);
    if (!tab) return;
    const scope: Scope = { rootId: id, mode: "around", label };
    // Re-focusing the node already in view just selects it.
    const path = sameScope(currentScope(tab), scope) ? tab.path : [...tab.path, scope];
    set((s) => ({
      ...patch(s, tab.id, {
        path,
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
    const path = sameScope(currentScope(tab), scope) ? tab.path : [...tab.path, scope];
    set((s) =>
      patch(s, tab.id, { path, selection: { type: "node", id }, detailTab: "overview", docId: null }),
    );
  },

  goToPath: (index) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab || index < 0 || index >= tab.path.length - 1) return s;
      const path = tab.path.slice(0, index + 1);
      const scope = path[path.length - 1];
      return patchActive(s, {
        path,
        selection: scope.rootId ? { type: "node", id: scope.rootId } : null,
        detailTab: "overview",
        docId: null,
      });
    }),

  goUp: () => {
    const tab = get().tabs.find((t) => t.id === get().activeTabId);
    if (tab && tab.path.length > 1) get().goToPath(tab.path.length - 2);
  },

  select: (selection, detailTab) =>
    set((s) => ({
      ...patchActive(s, { selection, detailTab: detailTab ?? "overview", docId: null }),
      detailOpen: selection ? true : s.detailOpen,
    })),

  setDetailTab: (tab) => set((s) => patchActive(s, { detailTab: tab, docId: null })),
  setDocId: (id) => set((s) => patchActive(s, { docId: id })),

  toggleDetails: (id) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab) return s;
      const open = tab.detailsOpen.includes(id)
        ? tab.detailsOpen.filter((x) => x !== id)
        : [...tab.detailsOpen, id];
      return patchActive(s, { detailsOpen: open });
    }),

  setDetailsFor: (ids, open) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab) return s;
      const keep = tab.detailsOpen.filter((x) => !ids.includes(x));
      return patchActive(s, { detailsOpen: open ? [...keep, ...ids] : keep });
    }),

  setRadius: (radius) => set((s) => patchActive(s, { radius })),

  toggleRelationType: (type) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab) return s;
      const hidden = tab.hiddenRelationTypes.includes(type)
        ? tab.hiddenRelationTypes.filter((t) => t !== type)
        : [...tab.hiddenRelationTypes, type];
      return patchActive(s, { hiddenRelationTypes: hidden });
    }),

  setShowContainment: (show) => set((s) => patchActive(s, { showContainment: show })),
  setShowExternal: (show) => set((s) => patchActive(s, { showExternal: show })),

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
        showExternal: false,
        detailsOpen: [],
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
