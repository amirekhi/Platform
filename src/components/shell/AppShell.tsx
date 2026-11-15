"use client";

import { PanelLeft, PanelRight, Search, Waypoints } from "lucide-react";
import { useEffect } from "react";
import { useDevice } from "@/lib/useDevice";
import { CompactShell } from "./CompactShell";
import { bootApp, useActiveTab, useApp } from "@/state/store";
import { Canvas } from "../canvas/Canvas";
import { DetailPanel } from "../detail/DetailPanel";
import { SearchPalette } from "../search/SearchPalette";
import { Explorer } from "./Explorer";
import { useExitable } from "@/lib/useExitable";
import { PerfMenu } from "./PerfMenu";
import { ComplianceView } from "../compliance/ComplianceView";
import { ComplianceButton } from "../compliance/ComplianceButton";
import { HelpMenu } from "@/components/help/HelpMenu";
import { ThemeToggle } from "./ThemeToggle";
import { TabBar } from "./TabBar";

export function AppShell() {
  const tab = useActiveTab();
  const explorerOpen = useApp((s) => s.explorerOpen);
  const detailOpen = useApp((s) => s.detailOpen);
  const ex = useExitable(explorerOpen);
  const dt = useExitable(detailOpen && !!tab);
  const toggleExplorer = useApp((s) => s.toggleExplorer);
  const setDetailOpen = useApp((s) => s.setDetailOpen);
  const setSearchOpen = useApp((s) => s.setSearchOpen);
  const view = useApp((s) => s.view);

  const device = useDevice();
  useEffect(() => {
    void bootApp();
  }, []);
  // CSS for phones and tablets hangs off this attribute; desktop has no rules of its own.
  useEffect(() => {
    document.documentElement.dataset.device = device;
  }, [device]);

  // Phones and tablets get their own layout. The desktop layout below is unchanged.
  if (device !== "desktop") return <CompactShell tab={tab} device={device} />;

  return (
    <div className="flex h-screen flex-col bg-bg text-ink">
      <header className="flex items-end gap-2 border-b border-line bg-panel px-3 pt-2">
        <div className="mb-1.5 flex items-center gap-2 pr-2">
          <button
            type="button"
            onClick={toggleExplorer}
            aria-label="Toggle explorer"
            aria-pressed={explorerOpen}
            className="rounded-md p-1.5 text-muted hover:bg-panel2 hover:text-ink"
          >
            <PanelLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5 text-[13.5px] font-semibold tracking-tight">
            <Waypoints size={16} className="text-accent" /> Ecosystem
          </div>
        </div>
        <TabBar />
        <div className="mb-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            data-tour="search"
            className="flex w-56 items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-[12.5px] text-muted hover:border-accent"
          >
            <Search size={13} />
            <span className="flex-1 text-left">Search everything</span>
            <kbd className="rounded border border-line px-1 text-[10px]">
              ⌘K
            </kbd>
          </button>
          <ComplianceButton />
          <ThemeToggle />
          <HelpMenu />
          <PerfMenu />
          <button
            type="button"
            onClick={() => setDetailOpen(!detailOpen)}
            aria-label="Toggle details"
            aria-pressed={detailOpen}
            className="rounded-md p-1.5 text-muted hover:bg-panel2 hover:text-ink"
          >
            <PanelRight size={16} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {ex.mounted && (
          <div
            className="shrink-0 overflow-hidden transition-[width] duration-300 ease-out"
            style={{ width: ex.visible ? 248 : 0 }}
          >
            <div className="h-full w-[248px]">
              <Explorer />
            </div>
          </div>
        )}
        <main className="relative min-w-0 flex-1">
          {/* The graph stays mounted underneath so nothing resets when you come back. */}
          <div
            className={view === "compliance" ? "invisible h-full" : "h-full"}
          >
            {tab ? <Canvas key={tab.id} tab={tab} /> : null}
          </div>
          {view === "compliance" && <ComplianceView />}
        </main>
        {dt.mounted && tab && (
          <div
            className="relative shrink-0 overflow-hidden transition-[width] duration-300 ease-out"
            style={{ width: dt.visible ? "min(440px, 45vw)" : 0 }}
          >
            <div className="h-full w-[min(440px,45vw)]">
              <DetailPanel tab={tab} />
            </div>
          </div>
        )}
      </div>
      <SearchPalette />
    </div>
  );
}
