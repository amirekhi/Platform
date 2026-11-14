"use client";

import { CornerDownLeft, FileText, Link2, Search } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { getDataSource } from "@/data";
import { NODE_KINDS, RELATION_TYPES } from "@/domain/registry";
import type { NodeKind, SearchHit, SearchResultType } from "@/domain/types";
import { useAsync } from "@/lib/useAsync";
import { navigateTo } from "@/state/navigate";
import { useApp } from "@/state/store";
import { KindIcon } from "../icons";

const TYPE_FILTERS: { id: SearchResultType | "all"; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "node", label: "Nodes" },
  { id: "relation", label: "Relations" },
  { id: "doc", label: "Documents" },
];

const SUGGESTIONS = ["payments", "runbook", "stripe webhook", "idempotency", "ldap", "kafka", "rollback"];

export function SearchPalette() {
  const open = useApp((s) => s.searchOpen);
  const setOpen = useApp((s) => s.setSearchOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useApp.getState().setSearchOpen(!useApp.getState().searchOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;
  return <Palette onClose={() => setOpen(false)} />;
}

function Palette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchResultType | "all">("all");
  const [kind, setKind] = useState<NodeKind | "all">("all");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const key = `${query}|${type}|${kind}`;
  const { data, last } = useAsync(`search:${key}`, () =>
    getDataSource().search(query, {
      types: type === "all" ? undefined : [type],
      kinds: kind === "all" ? undefined : [kind],
      limit: 40,
    }),
  );
  const hits: SearchHit[] = (query.trim() ? (data ?? last) : []) ?? [];
  const active = Math.min(cursor, Math.max(0, hits.length - 1));

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = async (hit: SearchHit, newTab: boolean) => {
    onClose();
    if (hit.type === "node") {
      await useApp.getState().openNode(hit.id, { newTab });
    } else if (hit.type === "relation") {
      if (newTab) await useApp.getState().openNode(hit.anchorNodeId, { newTab: true, selection: { type: "relation", id: hit.id } });
      else await navigateTo({ type: "relation", id: hit.id });
    } else {
      const doc = await getDataSource().getDoc(hit.id);
      const target = doc?.attachedTo[0];
      if (!target) return;
      await navigateTo(target, { detailTab: "docs", docId: hit.id });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(Math.min(active + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(Math.max(active - 1, 0));
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      void choose(hits[active], e.shiftKey || e.metaKey || e.ctrlKey);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[10vh] max-sm:px-2 max-sm:pt-[4vh] backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onKeyDown={onKeyDown}
        className="flex max-h-[72vh] max-sm:max-h-[80dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow)]"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search size={16} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder="Search nodes, relationships and documents…"
            aria-label="Search query"
            className="h-12 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
            role="combobox"
            aria-expanded
            aria-controls="search-results"
            aria-activedescendant={hits[active] ? `hit-${active}` : undefined}
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10.5px] text-muted">esc</kbd>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setType(f.id);
                setCursor(0);
              }}
              aria-pressed={type === f.id}
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                type === f.id ? "bg-accent text-white" : "bg-panel2 text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-[12px] text-muted">
            Kind
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as NodeKind | "all");
                setType((t) => (e.target.value !== "all" && t !== "node" ? "node" : t));
                setCursor(0);
              }}
              className="rounded-md border border-line bg-panel px-1.5 py-1 text-[12px] text-ink"
            >
              <option value="all">Any</option>
              {(Object.keys(NODE_KINDS) as NodeKind[]).map((k) => (
                <option key={k} value={k}>
                  {NODE_KINDS[k].label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ul id="search-results" ref={listRef} role="listbox" className="min-h-[120px] flex-1 overflow-y-auto p-2">
          {!query.trim() && (
            <li className="px-3 py-6 text-center text-[13px] text-muted">
              Search across everything you can access. Typos are forgiven, and words match as prefixes.
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="rounded-full border border-line px-2.5 py-1 text-[12px] text-ink hover:border-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </li>
          )}
          {query.trim() && data && hits.length === 0 && (
            <li className="px-3 py-8 text-center text-[13px] text-muted">No results for “{query}”.</li>
          )}
          {hits.map((h, i) => (
            <li key={h.key} role="option" id={`hit-${i}`} aria-selected={i === active} data-index={i}>
              <button
                type="button"
                onMouseMove={() => setCursor(i)}
                onClick={(e) => void choose(h, e.shiftKey || e.metaKey || e.ctrlKey)}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left ${i === active ? "bg-accent-soft" : ""}`}
              >
                <HitIcon hit={h} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium text-ink">
                    <Highlight text={h.title} terms={h.terms} />
                  </div>
                  <div className="truncate text-[11.5px] text-muted">{h.subtitle}</div>
                  {h.snippet && (
                    <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">
                      <Highlight text={h.snippet} terms={h.terms} />
                    </div>
                  )}
                </div>
                {i === active && <CornerDownLeft size={13} className="mt-1 shrink-0 text-muted" />}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-muted">
          <span>
            <kbd className="rounded border border-line px-1">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="rounded border border-line px-1">↵</kbd> open
          </span>
          <span>
            <kbd className="rounded border border-line px-1">⇧↵</kbd> open in new tab
          </span>
          {hits.length > 0 && <span className="ml-auto">{hits.length} results</span>}
        </div>
      </div>
    </div>
  );
}

function HitIcon({ hit }: { hit: SearchHit }) {
  if (hit.type === "node" && hit.kind) {
    const k = NODE_KINDS[hit.kind];
    return (
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ background: `${k.color}22`, color: k.color }}>
        <KindIcon kind={hit.kind} size={14} />
      </span>
    );
  }
  if (hit.type === "relation") {
    const color = hit.relationType ? RELATION_TYPES[hit.relationType].color : "var(--muted)";
    return (
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ background: `${color}22`, color }}>
        <Link2 size={14} />
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-panel2 text-muted">
      <FileText size={14} />
    </span>
  );
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const cleaned = terms.filter((t) => t.length > 1).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!cleaned.length) return <>{text}</>;
  const re = new RegExp(`(${cleaned.join("|")})`, "ig");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="hl">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
