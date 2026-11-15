"use client";

import { ShieldCheck } from "lucide-react";
import { useApp } from "@/state/store";

/** Header toggle between the graph and the compliance overview. */
export function ComplianceButton() {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const on = view === "compliance";
  return (
    <button
      type="button"
      data-tour="compliance"
      onClick={() => setView(on ? "graph" : "compliance")}
      aria-pressed={on}
      aria-label="Compliance"
      title={
        on
          ? "Back to the graph"
          : "Compliance: programmes, frameworks and evidence"
      }
      className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-[12.5px] ${
        on
          ? "bg-accent-soft text-accent"
          : "text-muted hover:bg-panel2 hover:text-ink"
      }`}
    >
      <ShieldCheck size={16} />
      <span className="hidden lg:inline">Compliance</span>
    </button>
  );
}
