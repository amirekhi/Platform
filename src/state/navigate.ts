"use client";

import { getDataSource } from "@/data";
import type { DocTarget, Id } from "@/domain/types";
import { currentScope, type Tab, useApp } from "./store";

async function currentView(tab: Tab) {
  const scope = currentScope(tab);
  return getDataSource().getScopeView({
    rootId: scope.rootId,
    mode: scope.mode,
    radius: tab.radius,
    hiddenRelationTypes: tab.hiddenRelationTypes,
    showContainment: tab.showContainment,
    showExternal: tab.showExternal,
  });
}

/**
 * Go to a node or relation from anywhere (links in docs, relation lists,
 * search results). If it is already in the current view it is just selected;
 * otherwise the current tab re-centres on it (same level), so exploring from
 * a link continues the path instead of opening a pile of tabs.
 */
export async function navigateTo(
  target: DocTarget,
  opts: { detailTab?: "docs" | "overview"; docId?: Id | null; newTab?: boolean } = {},
) {
  const app = useApp.getState();
  const tab = app.tabs.find((t) => t.id === app.activeTabId);

  if (target.type === "node") {
    if (tab && !opts.newTab) {
      const view = await currentView(tab);
      if (view.nodes.some((n) => n.id === target.id)) {
        app.select({ type: "node", id: target.id }, opts.detailTab);
        if (opts.docId) app.setDocId(opts.docId);
        return;
      }
      await app.focusNode(target.id, { detailTab: opts.detailTab, docId: opts.docId });
      return;
    }
    await app.openNode(target.id, { newTab: true, detailTab: opts.detailTab, docId: opts.docId });
    return;
  }

  const rel = await getDataSource().getRelation(target.id);
  if (!rel) return;
  const selection = { type: "relation" as const, id: rel.id };
  if (tab && !opts.newTab) {
    const view = await currentView(tab);
    if (view.relations.some((r) => r.id === rel.id)) {
      app.select(selection, opts.detailTab);
      if (opts.docId) app.setDocId(opts.docId);
      return;
    }
    await app.focusNode(rel.sourceId, { selection, detailTab: opts.detailTab, docId: opts.docId });
    return;
  }
  await app.openNode(rel.sourceId, { newTab: true, selection, detailTab: opts.detailTab, docId: opts.docId });
}
