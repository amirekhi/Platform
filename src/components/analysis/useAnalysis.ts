"use client";

import { useEffect, useMemo, useState } from "react";
import { getDataSource } from "@/data";
import type { GraphSnapshot } from "@/domain/analysis";
import type { AnalysisState } from "@/state/store";
import { type AnalysisResult, runAnalysis } from "./marks";

/** Runs the active analysis against a snapshot of the graph. */
export function useAnalysis(a: AnalysisState | null): {
  snap: GraphSnapshot | null;
  result: AnalysisResult | null;
} {
  const [snap, setSnap] = useState<GraphSnapshot | null>(null);
  const needs = a !== null;
  useEffect(() => {
    if (!needs || snap) return;
    let alive = true;
    void getDataSource()
      .getSnapshot()
      .then((s) => alive && setSnap(s));
    return () => {
      alive = false;
    };
  }, [needs, snap]);
  const result = useMemo(
    () => (snap && a ? runAnalysis(snap, a) : null),
    [snap, a],
  );
  return { snap, result };
}
