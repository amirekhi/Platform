"use client";

import { ArrowLeft, FileText } from "lucide-react";
import { useState } from "react";
import { getDataSource } from "@/data";
import { NODE_KINDS } from "@/domain/registry";
import type { Diagram, Doc, DocTarget, Id, PropValue } from "@/domain/types";
import { useAsync } from "@/lib/useAsync";
import { navigateTo } from "@/state/navigate";
import { useApp } from "@/state/store";
import dynamic from "next/dynamic";

// Markdown (and its parser) loads only when a document is opened.
const Markdown = dynamic(
  () => import("../docs/Markdown").then((m) => m.Markdown),
  {
    ssr: false,
    loading: () => <p className="text-[12px] text-muted">Loading document…</p>,
  },
);
import { MermaidView } from "../docs/MermaidView";
import { KindIcon } from "../icons";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted first:mt-0">
      {children}
    </h3>
  );
}

export function PropsTable({ props }: { props: Record<string, PropValue> }) {
  const entries = Object.entries(props);
  if (!entries.length)
    return <p className="text-[13px] text-muted">No properties recorded.</p>;
  return (
    <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line text-[12.5px]">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5">
          <dt className="truncate text-muted">{k}</dt>
          <dd className="break-words font-mono text-[12px] text-ink">
            {String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[13px] text-muted">
      {children}
    </p>
  );
}

export function NodeChip({ id, onClick }: { id: Id; onClick?: () => void }) {
  const { data: node } = useAsync(`chip:${id}`, () =>
    getDataSource().getNode(id),
  );
  if (!node) return <span className="text-muted">…</span>;
  const kind = NODE_KINDS[node.kind];
  return (
    <button
      type="button"
      onClick={onClick ?? (() => void navigateTo({ type: "node", id }))}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-panel px-1.5 py-0.5 text-[12px] font-medium text-ink hover:border-accent"
    >
      <span style={{ color: kind.color }}>
        <KindIcon kind={node.kind} size={12} />
      </span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function TargetChip({ target }: { target: DocTarget }) {
  if (target.type === "node") return <NodeChip id={target.id} />;
  return <RelationChip id={target.id} />;
}

function RelationChip({ id }: { id: Id }) {
  const { data } = useAsync(`relchip:${id}`, async () => {
    const ds = getDataSource();
    const rel = await ds.getRelation(id);
    if (!rel) return null;
    const [s, t] = await Promise.all([
      ds.getNode(rel.sourceId),
      ds.getNode(rel.targetId),
    ]);
    return { rel, s, t };
  });
  if (!data) return <span className="text-muted">…</span>;
  return (
    <button
      type="button"
      onClick={() => void navigateTo({ type: "relation", id })}
      className="inline-flex max-w-full items-center gap-1 rounded-md border border-dashed border-accent/60 bg-accent-soft px-1.5 py-0.5 text-[12px] font-medium text-accent"
      title="Relation"
    >
      <span className="truncate">
        {data.rel.name ?? `${data.s?.name} → ${data.t?.name}`}
      </span>
    </button>
  );
}

/* ---------------- Documents ---------------- */

export function DocsPane({ target }: { target: DocTarget }) {
  const docId = useApp(
    (s) => s.tabs.find((t) => t.id === s.activeTabId)?.docId ?? null,
  );
  const setDocId = useApp((s) => s.setDocId);
  const { data: docs } = useAsync(`docs:${target.type}:${target.id}`, () =>
    getDataSource().getDocsFor(target),
  );

  if (!docs) return <p className="text-sm text-muted">Loading…</p>;
  const open = docId ? docs.find((d) => d.id === docId) : undefined;
  if (open)
    return (
      <DocViewer
        doc={open}
        onBack={() => setDocId(null)}
        currentTarget={target}
      />
    );
  if (!docs.length) {
    return (
      <Empty>
        {target.type === "relation"
          ? "No documents are owned by this relationship yet."
          : "No documents are attached to this node yet."}
      </Empty>
    );
  }
  return (
    <ul className="space-y-2">
      {docs.map((d) => (
        <li key={d.id}>
          <button
            type="button"
            onClick={() => setDocId(d.id)}
            className="w-full rounded-lg border border-line bg-panel p-3 text-left hover:border-accent"
          >
            <div className="flex items-start gap-2">
              <FileText size={15} className="mt-0.5 shrink-0 text-muted" />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink">
                  {d.title}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                  <span className="rounded bg-panel2 px-1.5 py-px font-medium uppercase tracking-wide">
                    {d.docType}
                  </span>
                  <span>rev {d.revision}</span>
                  <span>·</span>
                  <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>{d.author}</span>
                </div>
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function DocViewer({
  doc,
  onBack,
  currentTarget,
}: {
  doc: Doc;
  onBack: () => void;
  currentTarget: DocTarget;
}) {
  const others = doc.attachedTo.filter(
    (t) => !(t.type === currentTarget.type && t.id === currentTarget.id),
  );
  return (
    <article>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-[12px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft size={13} /> All documents
      </button>
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
        <span className="rounded bg-panel2 px-1.5 py-px font-medium uppercase tracking-wide">
          {doc.docType}
        </span>
        <span>rev {doc.revision}</span>
        <span>·</span>
        <span>{doc.author}</span>
        <span>·</span>
        <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
        {doc.audience.map((a) => (
          <span
            key={a}
            className="rounded-full border border-line px-1.5 py-px"
          >
            {a}
          </span>
        ))}
      </div>
      {others.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
          Also attached to:
          {others.map((t) => (
            <TargetChip key={`${t.type}:${t.id}`} target={t} />
          ))}
        </div>
      )}
      <Markdown>{doc.content}</Markdown>
    </article>
  );
}

/* ---------------- Diagrams ---------------- */

export function DiagramsPane({ target }: { target: DocTarget }) {
  const { data } = useAsync(`dg:${target.type}:${target.id}`, () =>
    getDataSource().getDiagramsFor(target),
  );
  if (!data) return <p className="text-sm text-muted">Loading…</p>;
  if (!data.length) return <Empty>No diagrams yet.</Empty>;
  return (
    <div className="space-y-5">
      {data.map((d) => (
        <DiagramCard key={d.id} d={d} />
      ))}
    </div>
  );
}

function DiagramCard({ d }: { d: Diagram }) {
  const [showSource, setShowSource] = useState(false);
  return (
    <figure>
      <figcaption className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">{d.title}</span>
        <button
          type="button"
          onClick={() => setShowSource((s) => !s)}
          className="text-[11px] text-muted hover:text-ink"
        >
          {showSource ? "Hide source" : "View source"}
        </button>
      </figcaption>
      <MermaidView source={d.mermaid} />
      {showSource && (
        <pre className="overflow-x-auto rounded-lg border border-line bg-panel2 p-3 font-mono text-[11.5px] text-muted">
          {d.mermaid}
        </pre>
      )}
    </figure>
  );
}
