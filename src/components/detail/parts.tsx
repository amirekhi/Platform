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
import {
  DocRecordPanel,
  openDeviations,
  signatureSummary,
  StatusBadge,
  useFamily,
} from "./DocRecordView";
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
        key={open.id}
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
        <span className="mt-1 block text-[12px]">
          Missing docs show up under the Docs lens, so owners can find and fill
          the gaps.
        </span>
      </Empty>
    );
  }
  // Documents nested under another document of the same topic sit beneath it.
  const ids = new Set(docs.map((d) => d.id));
  const kids = (id: string) =>
    docs
      .filter((d) => d.record?.parentId === id)
      .sort((x, y) => (x.record?.order ?? 0) - (y.record?.order ?? 0));
  const roots = docs.filter(
    (d) => !d.record?.parentId || !ids.has(d.record.parentId),
  );
  const openDev = (id: string) =>
    docs.filter(
      (d) =>
        d.record?.deviation?.raisedAgainst.docId === id &&
        d.record.deviation.status !== "closed",
    ).length;
  const Row = ({ d, nested }: { d: Doc; nested?: boolean }) => (
    <li>
      <button
        type="button"
        onClick={() => setDocId(d.id)}
        className={`w-full rounded-lg border border-line bg-panel text-left hover:border-accent ${nested ? "p-2.5" : "p-3"}`}
      >
        <div className="flex items-start gap-2">
          <FileText size={15} className="mt-0.5 shrink-0 text-muted" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink">{d.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
              {d.record && <StatusBadge status={d.record.status} />}
              <span className="rounded bg-panel2 px-1.5 py-px font-medium uppercase tracking-wide">
                {d.record?.stage ? `${d.record.stage} · ` : ""}
                {d.docType}
              </span>
              {d.record && <span className="font-mono">{d.record.key}</span>}
              <span>v{d.revision}</span>
              {!nested && kids(d.id).length > 0 && (
                <span className="rounded-full bg-panel2 px-1.5">
                  {kids(d.id).length} part{kids(d.id).length > 1 ? "s" : ""}
                </span>
              )}
              {openDev(d.id) > 0 && (
                <span className="rounded-full bg-[#ef444418] px-1.5 font-semibold text-[#ef4444]">
                  {openDev(d.id)} open deviation{openDev(d.id) > 1 ? "s" : ""}
                </span>
              )}
              <span>·</span>
              <span>{d.author}</span>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
  return (
    <ul className="space-y-2">
      {roots.map((d) => (
        <li key={d.id} className="list-none">
          <ul className="space-y-1.5">
            <Row d={d} />
            {kids(d.id).length > 0 && (
              <li className="list-none">
                <ul className="ml-4 space-y-1.5 border-l-2 border-line pl-3">
                  {kids(d.id).map((c) => (
                    <Row key={c.id} d={c} nested />
                  ))}
                </ul>
              </li>
            )}
          </ul>
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
  const [picked, setPicked] = useState<number | null>(null);
  const record = doc.record;
  const current = record?.versions[0];
  const shown =
    record?.versions.find(
      (v) => v.revision === (picked ?? current?.revision),
    ) ?? current;
  const isCurrent = !record || shown?.revision === current?.revision;
  const text = isCurrent ? doc.content : shown?.content;
  const warn = record && shown ? signatureSummary(shown, shown.status) : null;
  const { data: family } = useFamily(doc.id);
  const devs = openDeviations(family);
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
        {record && shown && <StatusBadge status={shown.status} />}
        <span className="rounded bg-panel2 px-1.5 py-px font-medium uppercase tracking-wide">
          {record?.stage ? `${record.stage} · ` : ""}
          {doc.docType}
        </span>
        {record && <span className="font-mono">{record.key}</span>}
        <span>v{shown?.revision ?? doc.revision}</span>
        <span>·</span>
        <span>{doc.author}</span>
        <span>·</span>
        <span>{new Date(shown?.at ?? doc.updatedAt).toLocaleDateString()}</span>
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
      {devs.length > 0 && (
        <div className="mb-3 rounded-lg border border-[#ef4444] px-3 py-2 text-[12px] text-[#ef4444]">
          {devs.length} open deviation{devs.length > 1 ? "s" : ""} found against
          this document.{" "}
          <span className="text-muted">See Deviations below.</span>
        </div>
      )}
      {warn && (
        <div
          role="alert"
          className="mb-3 rounded-lg border px-3 py-2 text-[12px]"
          style={{
            borderColor: warn.tone === "bad" ? "#ef4444" : "#f59e0b",
            color: warn.tone === "bad" ? "#ef4444" : "#f59e0b",
          }}
        >
          {warn.text}. <span className="text-muted">See Signatures below.</span>
        </div>
      )}
      {!isCurrent && current && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-panel2 px-3 py-2 text-[12px] text-muted">
          You are reading v{shown?.revision}, which is not the current version.
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="ml-auto font-medium text-accent hover:underline"
          >
            Go to v{current.revision}
          </button>
        </div>
      )}
      {text ? (
        <Markdown>{text}</Markdown>
      ) : (
        <p className="rounded-lg border border-dashed border-line p-4 text-[12.5px] text-muted">
          The text of this version is not in the demo data. In the real system
          every version is kept in full and can be compared with any other.
        </p>
      )}
      {record && (
        <DocRecordPanel
          doc={doc}
          record={record}
          revision={shown?.revision ?? doc.revision}
          onSelect={setPicked}
        />
      )}
    </article>
  );
}

/* ---------------- Diagrams ---------------- */

export function DiagramsPane({ target }: { target: DocTarget }) {
  const { data } = useAsync(`dg:${target.type}:${target.id}`, () =>
    getDataSource().getDiagramsFor(target),
  );
  if (!data) return <p className="text-sm text-muted">Loading…</p>;
  if (!data.length)
    return (
      <Empty>
        No diagrams yet. Diagrams you attach to this node will appear here.
      </Empty>
    );
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
