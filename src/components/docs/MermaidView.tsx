"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

let seq = 0;

function isDark() {
  if (typeof document === "undefined") return false;
  const t = document.documentElement.dataset.theme;
  if (t) return t === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Renders Mermaid source to SVG client-side. The library is loaded lazily. */
export function MermaidView({ source }: { source: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: isDark() ? "dark" : "neutral",
          fontFamily: "inherit",
        });
        const { svg } = await mermaid.render(`mm-${reactId}-${++seq}`, source);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not render diagram");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, reactId, theme]);

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-lg border border-line bg-panel2 p-3 text-xs text-muted">
        {`Diagram could not be rendered.\n\n${source}`}
      </pre>
    );
  }
  return (
    <div
      ref={ref}
      className="my-3 flex justify-center overflow-x-auto rounded-lg border border-line bg-panel p-3"
    />
  );
}
