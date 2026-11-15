"use client";

import {
  AlertTriangle,
  Check,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { SUPPORT_ROLE } from "@/domain/compliance";
import { getDataSource } from "@/data";
import type { DocFamily } from "@/data/datasource";
import {
  checkSignature,
  DOC_LINK,
  DEVIATION_STATUS,
  DOC_STATUS,
  type DocComment,
  type DocRecord,
  type DocStatus,
  type DocVersion,
  missingSignatures,
  SIGNATURE_MEANING,
} from "@/domain/documents";
import type { Doc } from "@/domain/types";
import { useAsync } from "@/lib/useAsync";
import { navigateTo } from "@/state/navigate";
import { useApp } from "@/state/store";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export function StatusBadge({ status }: { status: DocStatus }) {
  const s = DOC_STATUS[status];
  return (
    <span
      title={s.hint}
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10.5px] font-semibold"
      style={{
        color: s.color,
        background: `color-mix(in srgb, ${s.color} 14%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.color }}
        aria-hidden
      />
      {s.label}
    </span>
  );
}

/** What is still missing or wrong on the version being read. One line. */
export function signatureSummary(v: DocVersion, status: DocStatus) {
  const bad = v.signatures.filter((s) => checkSignature(s, v) === "changed");
  const missing = missingSignatures(v);
  if (bad.length)
    return { tone: "bad" as const, text: "Changed after it was signed" };
  if (status === "effective" && missing.length)
    return { tone: "bad" as const, text: `Missing: ${missing.join(", ")}` };
  if (missing.length && v.signatures.length)
    return { tone: "warn" as const, text: `Needs: ${missing.join(", ")}` };
  return null;
}

function Section({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 py-2.5 text-left text-[12px] font-semibold text-ink"
      >
        <ChevronRight
          size={13}
          className={`text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        {title}
        {count !== undefined && (
          <span className="rounded-full bg-panel2 px-1.5 text-[10.5px] font-medium text-muted">
            {count}
          </span>
        )}
      </button>
      {open && <div className="fade-in-anim pb-3">{children}</div>}
    </section>
  );
}

function Signatures({ v }: { v: DocVersion }) {
  const missing = missingSignatures(v);
  if (!v.signatures.length)
    return (
      <p className="text-[12px] text-muted">Nobody has signed this version.</p>
    );
  return (
    <div>
      <ul className="space-y-1.5">
        {v.signatures.map((s) => {
          const c = checkSignature(s, v);
          return (
            <li
              key={`${s.meaning}-${s.signerName}`}
              className="rounded-lg border border-line bg-panel px-2.5 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {SIGNATURE_MEANING[s.meaning]}
                </span>
                <span className="ml-auto flex items-center gap-1 text-[11px]">
                  {c === "valid" && (
                    <span className="flex items-center gap-1 text-[#22c55e]">
                      <Check size={12} /> Valid
                    </span>
                  )}
                  {c === "changed" && (
                    <span className="flex items-center gap-1 text-[#ef4444]">
                      <AlertTriangle size={12} /> Text changed since
                    </span>
                  )}
                  {c === "weak" && (
                    <span className="flex items-center gap-1 text-[#f59e0b]">
                      <AlertTriangle size={12} /> No re-authentication
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-0.5 text-[12.5px] text-ink">
                {s.signerName}
                <span className="text-muted"> · {s.role}</span>
              </div>
              <div className="text-[11px] text-muted">
                {new Date(s.at).toLocaleString()}
              </div>
            </li>
          );
        })}
      </ul>
      {missing.length > 0 && (
        <p className="mt-2 text-[11.5px] text-muted">
          Still needed: {missing.map((m) => SIGNATURE_MEANING[m]).join(", ")}.
        </p>
      )}
      <p className="mt-2 break-all font-mono text-[10.5px] text-muted">
        SHA-256 {v.contentHash}
      </p>
    </div>
  );
}

function Versions({
  versions,
  selected,
  onSelect,
}: {
  versions: DocVersion[];
  selected: number;
  onSelect: (rev: number) => void;
}) {
  return (
    <ol className="space-y-1">
      {versions.map((v) => (
        <li key={v.revision}>
          <button
            type="button"
            onClick={() => onSelect(v.revision)}
            aria-current={v.revision === selected}
            className={`w-full rounded-lg border px-2.5 py-2 text-left ${
              v.revision === selected
                ? "border-accent bg-accent-soft"
                : "border-line bg-panel hover:border-accent"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-ink">
                v{v.revision}
              </span>
              <StatusBadge status={v.status} />
              <span className="ml-auto text-[11px] text-muted">
                {fmt(v.at)}
              </span>
            </div>
            <div className="mt-0.5 text-[12px] text-muted">
              {v.summary} <span className="opacity-70">· {v.author}</span>
            </div>
          </button>
        </li>
      ))}
    </ol>
  );
}

function Related({ docId }: { docId: string }) {
  const { data } = useAsync(`doclinks:${docId}`, () =>
    getDataSource().getLinkedDocs(docId),
  );
  if (!data) return <p className="text-[12px] text-muted">Loading…</p>;
  if (!data.length)
    return <p className="text-[12px] text-muted">No linked documents.</p>;
  return (
    <ul className="space-y-1">
      {data.map((l) => (
        <li key={`${l.direction}-${l.type}-${l.doc.id}`}>
          <button
            type="button"
            onClick={() =>
              void navigateTo(l.doc.attachedTo[0], {
                detailTab: "docs",
                docId: l.doc.id,
              })
            }
            className="flex w-full items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-left hover:border-accent"
          >
            <span className="shrink-0 text-[11px] text-muted">
              {l.direction === "out"
                ? DOC_LINK[l.type].label
                : DOC_LINK[l.type].inverse}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
              {l.doc.title}
            </span>
            {l.doc.record && <StatusBadge status={l.doc.record.status} />}
          </button>
        </li>
      ))}
    </ul>
  );
}

function DocChip({ doc }: { doc: Doc }) {
  return (
    <button
      type="button"
      onClick={() =>
        void navigateTo(doc.attachedTo[0], { detailTab: "docs", docId: doc.id })
      }
      className="flex w-full items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-left hover:border-accent"
    >
      {doc.record && (
        <span className="shrink-0 font-mono text-[10.5px] text-muted">
          {doc.record.key}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
        {doc.title}
      </span>
      {doc.record?.deviation && (
        <span
          className="shrink-0 text-[10.5px] font-semibold"
          style={{ color: DEVIATION_STATUS[doc.record.deviation.status].color }}
        >
          {doc.record.deviation.severity} ·{" "}
          {DEVIATION_STATUS[doc.record.deviation.status].label}
        </span>
      )}
      {doc.record && <StatusBadge status={doc.record.status} />}
    </button>
  );
}

/** Parent, nested documents and deviations. */
export function useFamily(docId: string) {
  return useAsync(`docfamily:${docId}`, () =>
    getDataSource().getDocFamily(docId),
  );
}

export function openDeviations(family?: { deviations: Doc[] }) {
  return (family?.deviations ?? []).filter(
    (d) => d.record?.deviation && d.record.deviation.status !== "closed",
  );
}

function Family({ family }: { family: DocFamily }) {
  return (
    <div className="space-y-3">
      {family.parent && (
        <div>
          <div className="mb-1 text-[11px] text-muted">Part of</div>
          <DocChip doc={family.parent} />
        </div>
      )}
      {family.children.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] text-muted">
            Parts of this document
          </div>
          <ul className="space-y-1">
            {family.children.map((c) => (
              <li key={c.id}>
                <DocChip doc={c} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Deviations({ docs }: { docs: Doc[] }) {
  if (!docs.length)
    return (
      <p className="text-[12px] text-muted">
        No deviations found against this document.
      </p>
    );
  return (
    <ul className="space-y-1">
      {docs.map((d) => (
        <li key={d.id}>
          <DocChip doc={d} />
          {d.record?.deviation?.raisedAgainst.section && (
            <div className="ml-2 mt-0.5 text-[11px] text-muted">
              Found in {d.record.deviation.raisedAgainst.section} (v
              {d.record.deviation.raisedAgainst.revision})
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function DocLinkById({ id }: { id: string }) {
  const { data } = useAsync(`doc:${id}`, () => getDataSource().getDoc(id));
  if (!data) return null;
  return (
    <div>
      <div className="mb-0.5 text-[11px] text-muted">Documented in</div>
      <DocChip doc={data} />
    </div>
  );
}

function Comments({ comments }: { comments: DocComment[] }) {
  if (!comments.length)
    return <p className="text-[12px] text-muted">No comments.</p>;
  const roots = comments.filter((c) => !c.parentId);
  return (
    <ul className="space-y-2">
      {roots.map((c) => (
        <li key={c.id} className="rounded-lg border border-line bg-panel p-2.5">
          {[c, ...comments.filter((r) => r.parentId === c.id)].map((x, i) => (
            <div
              key={x.id}
              className={i ? "mt-2 border-t border-line pt-2" : ""}
            >
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <span className="font-semibold text-ink">{x.author}</span>
                {x.section && <span>on {x.section}</span>}
                <span>· v{x.revision}</span>
                {i === 0 && (
                  <span
                    className={`ml-auto rounded-full px-1.5 ${x.resolved ? "bg-panel2" : "bg-[#f59e0b22] text-[#f59e0b]"}`}
                  >
                    {x.resolved ? "Resolved" : "Open"}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink">{x.text}</p>
              {x.needsDoc && (
                <div className="mt-1.5">
                  {x.documentedBy ? (
                    <DocLinkById id={x.documentedBy} />
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#ef444418] px-2 py-0.5 text-[11px] font-medium text-[#ef4444]">
                      <AlertTriangle size={11} /> Needs a document
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}

/** Everything about a document that is not its text. */
export function DocRecordPanel({
  doc,
  record,
  revision,
  onSelect,
}: {
  doc: Doc;
  record: DocRecord;
  revision: number;
  onSelect: (rev: number) => void;
}) {
  const v =
    record.versions.find((x) => x.revision === revision) ?? record.versions[0];
  const open = record.comments.filter((c) => !c.resolved && !c.parentId).length;
  const { data: family0 } = useFamily(doc.id);
  const family: DocFamily = family0 ?? { children: [], deviations: [] };
  return (
    <div className="mt-6">
      <Section title="Signatures" count={v.signatures.length} defaultOpen>
        <Signatures v={v} />
      </Section>
      <Section title="Versions" count={record.versions.length}>
        <Versions
          versions={record.versions}
          selected={v.revision}
          onSelect={onSelect}
        />
      </Section>
      {(family.parent || family.children.length > 0) && (
        <Section
          title="Same topic"
          count={family.children.length + (family.parent ? 1 : 0)}
          defaultOpen
        >
          <Family family={family} />
        </Section>
      )}
      <Section
        title="Deviations"
        count={family.deviations.length}
        defaultOpen={openDeviations(family).length > 0}
      >
        <Deviations docs={family.deviations} />
      </Section>
      <Section title="Related documents">
        <Related docId={doc.id} />
      </Section>
      <Section
        title="Comments"
        count={record.comments.length}
        defaultOpen={record.comments.some((c) => c.needsDoc && !c.documentedBy)}
      >
        {open > 0 && (
          <p className="mb-2 flex items-center gap-1 text-[11.5px] text-[#f59e0b]">
            <MessageSquare size={12} /> {open} open
          </p>
        )}
        <Comments comments={record.comments} />
      </Section>
      <p className="mt-1 flex items-center gap-1 text-[10.5px] text-muted">
        <ShieldCheck size={11} /> Read-only until the database and storage are
        connected.
      </p>
    </div>
  );
}

/** What this document is gathered for: programme, requirement, and where it is enforced. */
export function DocSupports({ docId }: { docId: string }) {
  const { data } = useAsync(`docsupports:${docId}`, () =>
    getDataSource().getDocSupports(docId),
  );
  const setView = useApp((s) => s.setView);
  if (!data) return null;
  return (
    <div className="mt-6 rounded-xl border border-line bg-panel p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <ShieldCheck size={12} /> Gathered for
      </div>
      {data.length === 0 ? (
        <p className="text-[12.5px] text-[#f59e0b]">
          This document is not linked to any requirement, so nothing says what
          it proves. Link it to a requirement in a programme, or it is just a
          file.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.map((s) => (
            <li key={s.programme.id + s.requirement.id}>
              <div className="text-[12.5px] text-ink">
                <b>{s.system?.name ?? s.programme.nodeId}</b>{" "}
                <span className="rounded bg-accent-soft px-1 text-[10.5px] font-semibold text-accent">
                  {s.programme.approach}
                </span>{" "}
                <span className="text-muted">against</span> {s.framework.short}{" "}
                <span className="font-mono text-[11.5px]">
                  {s.requirement.ref}
                </span>
              </div>
              <div className="text-[12px] text-muted">
                {s.requirement.title} · {SUPPORT_ROLE[s.role]}
              </div>
              {s.controls.map(({ control, nodes }) => (
                <div
                  key={control.id}
                  className="mt-1 flex flex-wrap items-center gap-1 text-[11.5px]"
                >
                  <span className="text-muted">Enforced at</span>
                  {nodes.length ? (
                    nodes.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setView("graph");
                          void navigateTo({ type: "node", id: n.id });
                        }}
                        className="rounded-md border border-line px-1.5 py-0.5 text-ink hover:border-accent"
                      >
                        {n.name}
                      </button>
                    ))
                  ) : (
                    <span className="font-medium text-[#ef4444]">
                      nothing yet
                    </span>
                  )}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setView("compliance")}
        className="mt-3 text-[12px] font-medium text-accent hover:underline"
      >
        Open in Compliance
      </button>
    </div>
  );
}
