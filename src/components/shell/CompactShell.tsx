"use client";

import {
  ChevronUp,
  CornerDownRight,
  Crosshair,
  Expand,
  Highlighter,
  Maximize2,
  Menu,
  Orbit,
  Search,
  Shrink,
  SquareArrowOutUpRight,
  Waypoints,
  X,
} from "lucide-react";
import { useState } from "react";
import { getDataSource } from "@/data";
import { NODE_KINDS, RELATION_TYPES } from "@/domain/registry";
import { useAsync } from "@/lib/useAsync";
import type { Device } from "@/lib/useDevice";
import { currentScope, type Tab, useActiveTab, useApp } from "@/state/store";
import { Canvas } from "../canvas/Canvas";
import { DetailPanel } from "../detail/DetailPanel";
import { KindIcon } from "../icons";
import { SearchPalette } from "../search/SearchPalette";
import { Explorer } from "./Explorer";
import { useExitable } from "@/lib/useExitable";
import { PerfMenu } from "./PerfMenu";
import { ComplianceView } from "../compliance/ComplianceView";
import { ComplianceButton } from "../compliance/ComplianceButton";
import { HelpMenu } from "@/components/help/HelpMenu";
import { ThemeToggle } from "./ThemeToggle";
import { TabBar } from "./TabBar";

/**
 * Layout for phones and tablets. The explorer becomes a drawer and the details panel a
 * bottom sheet that starts as a one-line "peek" so it never covers the canvas by surprise.
 */
export function CompactShell({
  tab,
  device,
}: {
  tab: Tab | undefined;
  device: Device;
}) {
  const setSearchOpen = useApp((s) => s.setSearchOpen);
  const select = useApp((s) => s.select);
  const view = useApp((s) => s.view);
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState(false);

  // Navigating somewhere closes the drawer (adjusted during render, not in an effect).
  const scopeKey = tab
    ? `${tab.id}|${currentScope(tab).rootId ?? "~"}|${currentScope(tab).mode}`
    : "";
  const [prevScope, setPrevScope] = useState(scopeKey);
  if (prevScope !== scopeKey) {
    setPrevScope(scopeKey);
    setDrawer(false);
  }

  const sel = tab?.selection ?? null;
  // The sheet only exists while something is selected.
  const sheetOpen = sheet && sel !== null;
  const dr = useExitable(drawer);
  const sh = useExitable(sheetOpen);

  return (
    <div className="flex h-screen max-[1199px]:h-dvh flex-col overflow-hidden bg-bg text-ink">
      <header className="border-b border-line bg-panel pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-1 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Open explorer"
            className="rounded-md p-2 text-muted hover:bg-panel2 hover:text-ink"
          >
            <Menu size={18} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[13.5px] font-semibold tracking-tight">
            <Waypoints size={16} className="shrink-0 text-accent" />{" "}
            <span className="truncate">Ecosystem</span>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            data-tour="search"
            className={`flex items-center gap-2 rounded-lg border border-line bg-bg text-[12.5px] text-muted ${
              device === "tablet" ? "w-52 px-2.5 py-1.5" : "p-2"
            }`}
          >
            <Search size={device === "tablet" ? 13 : 16} />
            {device === "tablet" && (
              <span className="flex-1 text-left">Search</span>
            )}
          </button>
          <ComplianceButton />
          <ThemeToggle />
          <HelpMenu />
          <PerfMenu />
        </div>
        <div className="flex px-2">
          <TabBar />
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        <div className={view === "compliance" ? "invisible h-full" : "h-full"}>
          {tab ? <Canvas key={tab.id} tab={tab} /> : null}
        </div>
        {view === "compliance" && <ComplianceView />}
      </main>

      {/* Peek: what is selected, one tap from its details. */}
      {tab && sel && !sheetOpen && (
        <Peek
          sel={sel}
          onOpen={() => setSheet(true)}
          onClear={() => select(null)}
        />
      )}

      {dr.mounted && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
            style={{ opacity: dr.visible ? 1 : 0 }}
            onClick={() => setDrawer(false)}
            aria-hidden
          />
          <div
            className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-line bg-panel shadow-[var(--shadow)] pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out"
            style={{ transform: dr.visible ? "none" : "translateX(-100%)" }}
          >
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="text-[13px] font-semibold">Explorer</span>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close explorer"
                className="rounded-md p-2 text-muted hover:bg-panel2"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Explorer />
            </div>
          </div>
        </>
      )}

      {tab && sh.mounted && (
        <div
          className={`fixed inset-x-0 bottom-0 z-40 flex h-[78dvh] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-line bg-panel shadow-[0_-8px_30px_rgb(0_0_0/0.25)] transition-transform duration-300 ease-out ${
            device === "tablet" ? "mx-auto max-w-[680px]" : ""
          }`}
          style={{ transform: sh.visible ? "none" : "translateY(100%)" }}
        >
          <button
            type="button"
            onClick={() => setSheet(false)}
            aria-label="Collapse details"
            className="flex shrink-0 justify-center py-2"
          >
            <span className="h-1 w-10 rounded-full bg-line" />
          </button>
          <div className="relative min-h-0 flex-1 pb-[env(safe-area-inset-bottom)]">
            <DetailPanel tab={tab} onClose={() => setSheet(false)} />
          </div>
        </div>
      )}
      <SearchPalette />
    </div>
  );
}

function Peek({
  sel,
  onOpen,
  onClear,
}: {
  sel: NonNullable<Tab["selection"]>;
  onOpen: () => void;
  onClear: () => void;
}) {
  const { data, last } = useAsync(`peek:${sel.type}:${sel.id}`, async () => {
    const ds = getDataSource();
    if (sel.type === "node") {
      const n = await ds.getNode(sel.id);
      const kids = n ? (await ds.getChildren(n.id)).length : 0;
      return n
        ? { title: n.name, sub: NODE_KINDS[n.kind].label, kind: n.kind, kids }
        : null;
    }
    const r = await ds.getRelation(sel.id);
    return r
      ? {
          title: r.name ?? RELATION_TYPES[r.type].label,
          sub: "Relation",
          kind: null,
          kids: 0,
        }
      : null;
  });
  const info = data ?? last;
  const tab = useActiveTab();
  const a = useApp.getState();
  const id = sel.id;
  const on = {
    detail: tab?.detailsOpen.includes(id) ?? false,
    hl: tab?.highlightIds.includes(id) ?? false,
    ex: tab?.expandedIds.includes(id) ?? false,
    open: tab?.openIds.includes(id) ?? false,
  };
  return (
    <div className="slide-up shrink-0 border-t border-line bg-panel pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-1 px-2 pt-1.5">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1 text-left active:bg-panel2"
        >
          {info?.kind ? <KindIcon kind={info.kind} size={18} /> : null}
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13.5px] font-semibold">
              {info?.title ?? "Selected"}
            </span>
            <span className="block truncate text-[11.5px] text-muted">
              {info?.sub ?? ""}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-[12px] font-medium text-accent">
            Details <ChevronUp size={14} />
          </span>
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="rounded-md p-2.5 text-muted hover:bg-panel2"
        >
          <X size={16} />
        </button>
      </div>
      {sel.type === "node" && (
        <div
          className="flex gap-1.5 overflow-x-auto px-2 pb-1 pt-1.5"
          aria-label="Node actions"
        >
          <Act
            label="Highlight"
            on={on.hl}
            onClick={() => a.toggleHighlight(id)}
            icon={<Highlighter size={15} />}
          />
          <Act
            label={on.ex ? "Collapse" : "Expand"}
            on={on.ex}
            onClick={() => a.toggleExpanded(id)}
            icon={on.ex ? <Shrink size={15} /> : <Expand size={15} />}
          />
          {(info?.kids ?? 0) > 0 && (
            <Act
              label={on.open ? "Close" : "Open here"}
              on={on.open}
              onClick={() => a.toggleOpen(id)}
              icon={<Maximize2 size={15} />}
            />
          )}
          {(info?.kids ?? 0) > 0 && (
            <Act
              label="Go inside"
              onClick={() => void a.drillInto(id)}
              icon={<CornerDownRight size={15} />}
            />
          )}
          <Act
            label="Focus"
            onClick={() => void a.focusNode(id)}
            icon={<Crosshair size={15} />}
          />
          <Act
            label="Circles"
            on={on.detail}
            onClick={() => a.toggleDetails(id)}
            icon={<Orbit size={15} />}
          />
          <Act
            label="New tab"
            onClick={() => void a.openNode(id, { newTab: true })}
            icon={<SquareArrowOutUpRight size={15} />}
          />
        </div>
      )}
    </div>
  );
}

function Act({
  label,
  icon,
  onClick,
  on,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  on?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium ${
        on
          ? "border-accent bg-accent-soft text-accent"
          : "border-line text-ink active:bg-panel2"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
