"use client";

import { Home, Plus, X } from "lucide-react";
import { getDataSource } from "@/data";
import { NODE_KINDS } from "@/domain/registry";
import { useAsync } from "@/lib/useAsync";
import { currentScope, tabTitle, useApp } from "@/state/store";
import { KindIcon } from "../icons";

export function TabBar() {
  const tabs = useApp((s) => s.tabs);
  const activeId = useApp((s) => s.activeTabId);
  const activate = useApp((s) => s.activateTab);
  const close = useApp((s) => s.closeTab);
  const setSearchOpen = useApp((s) => s.setSearchOpen);

  return (
    <div
      role="tablist"
      aria-label="Open views"
      className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto pr-2"
    >
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <div
            key={t.id}
            role="tab"
            aria-selected={active}
            className={`group flex max-w-[220px] shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 text-[12.5px] ${
              active
                ? "border-line bg-bg font-medium text-ink"
                : "border-transparent text-muted hover:bg-panel2"
            }`}
          >
            <button
              type="button"
              onClick={() => activate(t.id)}
              className="flex min-w-0 items-center gap-1.5"
            >
              {currentScope(t).rootId ? (
                <TabIcon id={currentScope(t).rootId!} />
              ) : (
                <Home size={13} />
              )}
              <span className="truncate">{tabTitle(t)}</span>
            </button>
            {tabs.length > 1 && (
              <button
                type="button"
                onClick={() => close(t.id)}
                aria-label={`Close ${tabTitle(t)}`}
                className="rounded p-0.5 text-muted opacity-60 hover:bg-panel2 hover:opacity-100 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Open a node in a new tab"
        title="Find a node to open in a new tab"
        className="mb-1 ml-1 shrink-0 rounded-md p-1.5 text-muted hover:bg-panel2 hover:text-ink"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function TabIcon({ id }: { id: string }) {
  const { data } = useAsync(`tabicon:${id}`, () => getDataSource().getNode(id));
  if (!data) return <span className="h-3 w-3" />;
  return (
    <span style={{ color: NODE_KINDS[data.kind].color }}>
      <KindIcon kind={data.kind} size={13} />
    </span>
  );
}
