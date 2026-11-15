"use client";

import { ChevronRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { getDataSource } from "@/data";
import {
  assessProgramme,
  type ComplianceModel,
  type Control,
  deviationCounter,
  type Framework,
  FRAMEWORK_KIND,
  type Programme,
  type ProgrammeAssessment,
  SOLIDITY,
  type Solidity,
  SUPPORT_ROLE,
} from "@/domain/compliance";
import type { GraphSnapshot } from "@/domain/analysis";
import { computeScope } from "@/domain/scope";
import { useAsync } from "@/lib/useAsync";
import { navigateTo } from "@/state/navigate";
import { useApp } from "@/state/store";
import { StatusBadge } from "../detail/DocRecordView";
import { KindIcon } from "../icons";

const APPROACH_HELP = {
  CSV: "Computer system validation: scripted, document-heavy evidence for the whole system.",
  CSA: "Computer software assurance: effort follows risk, with less scripting for low-risk functions.",
};

function Pill({ level }: { level: Solidity }) {
  const s = SOLIDITY[level];
  return (
    <span
      title={s.hint}
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[10.5px] font-semibold"
      style={{
        color: s.color,
        background: `color-mix(in srgb, ${s.color} 14%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.color }}
      />
      {s.label}
    </span>
  );
}

function Bar({ a }: { a: ProgrammeAssessment }) {
  return (
    <div
      className="flex h-2 w-full overflow-hidden rounded-full bg-panel2"
      role="img"
      aria-label={`${a.counts[3]} of ${a.total} requirements approved`}
    >
      {([3, 2, 1, 0] as Solidity[]).map((l) =>
        a.counts[l] ? (
          <span
            key={l}
            title={`${SOLIDITY[l].label}: ${a.counts[l]}`}
            style={{
              width: `${(a.counts[l] / Math.max(1, a.total)) * 100}%`,
              background: SOLIDITY[l].color,
              opacity: l === 0 ? 0.55 : 1,
            }}
          />
        ) : null,
      )}
    </div>
  );
}

function NodeChip({ snap, id }: { snap: GraphSnapshot | null; id: string }) {
  const setView = useApp((s) => s.setView);
  const n = snap?.nodes.get(id);
  if (!n) return null;
  return (
    <button
      type="button"
      onClick={() => {
        setView("graph");
        void navigateTo({ type: "node", id });
      }}
      title="Show in the graph"
      className="inline-flex items-center gap-1 rounded-md border border-line bg-panel px-1.5 py-0.5 text-[11.5px] text-ink hover:border-accent"
    >
      <KindIcon kind={n.kind} size={11} />
      {n.name}
    </button>
  );
}

function Controls({
  controls,
  snap,
}: {
  controls: Control[];
  snap: GraphSnapshot | null;
}) {
  if (!controls.length)
    return (
      <p className="flex items-center gap-1 text-[11.5px] text-[#ef4444]">
        <ShieldAlert size={12} /> No control meets this yet.
      </p>
    );
  return (
    <ul className="space-y-1.5">
      {controls.map((c) => (
        <li key={c.id} className="text-[11.5px]">
          <div className="text-ink">{c.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="text-muted">Enforced at</span>
            {c.enforcedAt.length ? (
              c.enforcedAt.map((id) => (
                <NodeChip key={id} snap={snap} id={id} />
              ))
            ) : (
              <span className="font-medium text-[#ef4444]">
                nothing yet (
                {c.type === "procedural" ? "procedure only" : "not built"})
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProgrammeCard({
  p,
  model,
  a,
  snap,
}: {
  p: Programme;
  model: ComplianceModel;
  a: ProgrammeAssessment;
  snap: GraphSnapshot | null;
}) {
  const [open, setOpen] = useState(false);
  const setView = useApp((s) => s.setView);
  const sys = snap?.nodes.get(p.nodeId);
  const docs = new Map(model.docs.map((d) => [d.id, d]));
  const frameworks = p.frameworkIds
    .map((id) => model.frameworks.find((f) => f.id === id))
    .filter((f): f is Framework => !!f);
  const plan = p.planDocId ? docs.get(p.planDocId) : undefined;
  const gaps = a.counts[0];
  return (
    <section className="rounded-xl border border-line bg-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-3.5 text-left"
      >
        <ChevronRight
          size={15}
          className={`mt-1 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-ink">
              {sys?.name ?? p.nodeId}
            </span>
            <span
              title={APPROACH_HELP[p.approach]}
              className="rounded bg-accent-soft px-1.5 py-px text-[11px] font-semibold text-accent"
            >
              {p.approach}
            </span>
            <span className="text-[11.5px] text-muted">{p.risk} risk</span>
            <span className="ml-auto text-[11.5px] text-muted">
              {a.counts[3]} of {a.total} approved
              {gaps > 0 && (
                <span className="ml-2 font-semibold text-[#ef4444]">
                  {gaps} with nothing
                </span>
              )}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {frameworks.map((f) => (
              <span
                key={f.id}
                className="rounded-full border border-line px-2 py-px text-[11px] text-ink"
              >
                {f.short}
              </span>
            ))}
          </div>
          <div className="mt-2.5">
            <Bar a={a} />
          </div>
        </div>
      </button>
      {open && (
        <div className="fade-in-anim border-t border-line px-3.5 pb-3.5 pt-3">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
            {plan ? (
              <button
                type="button"
                onClick={() =>
                  void navigateTo(plan.attachedTo[0], {
                    detailTab: "docs",
                    docId: plan.id,
                  })
                }
                className="rounded-md border border-line px-2 py-0.5 text-ink hover:border-accent"
              >
                Validation plan: {plan.record?.key ?? plan.title}
              </button>
            ) : (
              <span className="text-[#ef4444]">No validation plan yet.</span>
            )}
            <button
              type="button"
              onClick={() => {
                setView("graph");
                void navigateTo({ type: "node", id: p.nodeId });
              }}
              className="rounded-md border border-line px-2 py-0.5 text-ink hover:border-accent"
            >
              Show in the graph
            </button>
          </div>
          {frameworks.map((f) => (
            <div key={f.id} className="mb-4 last:mb-0">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {f.short} · {f.name}
              </div>
              <ul className="space-y-2">
                {a.items
                  .filter((i) => i.req.frameworkId === f.id)
                  .map(({ req, a: ra }) => {
                    const controls = model.controls.filter((c) =>
                      c.requirementIds.includes(req.id),
                    );
                    return (
                      <li
                        key={req.id}
                        className="rounded-lg border border-line p-2.5"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-px shrink-0 font-mono text-[11px] text-muted">
                            {req.ref}
                          </span>
                          <span className="min-w-0 flex-1 text-[12.5px] font-medium text-ink">
                            {req.title}
                          </span>
                          <Pill level={ra.level} />
                        </div>
                        {ra.reasons.length > 0 && (
                          <ul className="mt-1 text-[11.5px] text-muted">
                            {[...new Set(ra.reasons)].map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                        )}
                        {ra.docs.length > 0 && (
                          <ul className="mt-1.5 flex flex-wrap gap-1">
                            {ra.docs.map((d) => {
                              const doc = docs.get(d.docId);
                              if (!doc) return null;
                              return (
                                <li key={d.docId + d.role}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void navigateTo(doc.attachedTo[0], {
                                        detailTab: "docs",
                                        docId: doc.id,
                                      })
                                    }
                                    title={SUPPORT_ROLE[d.role]}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-1.5 py-0.5 text-[11.5px] text-ink hover:border-accent"
                                  >
                                    <span className="font-mono text-[10.5px] text-muted">
                                      {doc.record?.key ?? "doc"}
                                    </span>
                                    <span className="max-w-[200px] truncate">
                                      {doc.title}
                                    </span>
                                    {doc.record && (
                                      <StatusBadge status={doc.record.status} />
                                    )}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {(req.enforced || controls.length > 0) && (
                          <div className="mt-2 border-t border-line pt-2">
                            <Controls controls={controls} snap={snap} />
                          </div>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FrameworkList({
  model,
  snap,
}: {
  model: ComplianceModel;
  snap: GraphSnapshot | null;
}) {
  const sorted = [...model.frameworks].sort(
    (a, b) => b.precedence - a.precedence,
  );
  return (
    <ul className="space-y-2">
      {sorted.map((f) => {
        const users = model.programmes.filter((p) =>
          p.frameworkIds.includes(f.id),
        );
        const reqs = model.requirements.filter((r) => r.frameworkId === f.id);
        const from = (f.derivedFrom ?? [])
          .map((id) => model.frameworks.find((x) => x.id === id)?.short)
          .filter(Boolean);
        return (
          <li
            key={f.id}
            className="rounded-xl border border-line bg-panel p-3.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold text-ink">
                {f.short}
              </span>
              <span className="rounded bg-panel2 px-1.5 py-px text-[10.5px] uppercase tracking-wide text-muted">
                {FRAMEWORK_KIND[f.kind]}
              </span>
              <span className="text-[11.5px] text-muted">
                v{f.version} · {f.authority}
              </span>
              <span className="ml-auto text-[11.5px] text-muted">
                {reqs.length} requirements
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-ink">{f.name}</p>
            <p className="mt-0.5 text-[12px] text-muted">{f.summary}</p>
            {from.length > 0 && (
              <p className="mt-1.5 text-[11.5px] text-muted">
                Built on: {from.join(", ")}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px]">
              {users.length ? (
                <>
                  <span className="text-muted">Used by</span>
                  {users.map((p) => (
                    <NodeChip key={p.id} snap={snap} id={p.nodeId} />
                  ))}
                </>
              ) : (
                <span className="font-medium text-[#f59e0b]">
                  No programme uses this yet. Nothing shows we meet it.
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ComplianceView() {
  const { data: model } = useAsync("compliance", () =>
    getDataSource().getCompliance(),
  );
  const { data: snap } = useAsync("snapshot", () =>
    getDataSource().getSnapshot(),
  );
  const [tab, setTab] = useState<"programmes" | "frameworks">("programmes");
  const assessed = useMemo(() => {
    if (!model) return [];
    const dev = deviationCounter(model.docs);
    return model.programmes.map((p) => ({
      p,
      a: assessProgramme(p, model, dev),
    }));
  }, [model]);
  const covered = new Set(model?.programmes.map((p) => p.nodeId));
  const scope = snap ? computeScope(snap) : null;
  const unassessed = snap
    ? [...snap.nodes.values()].filter(
        (n) => n.kind === "system" && !covered.has(n.id),
      )
    : [];
  const mustHave = unassessed.filter((n) => scope?.has(n.id));
  const mayBeOut = unassessed.filter((n) => !scope?.has(n.id));

  return (
    <div className="absolute inset-0 overflow-y-auto bg-bg">
      <div className="mx-auto max-w-[900px] px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <ShieldCheck size={20} className="text-accent" />
          <h1 className="text-[18px] font-semibold tracking-tight text-ink">
            Compliance
          </h1>
          <div
            role="tablist"
            className="ml-auto inline-flex overflow-hidden rounded-lg border border-line text-[12px]"
          >
            {(
              [
                ["programmes", "Programmes"],
                ["frameworks", "Frameworks and policies"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`px-3 py-1.5 ${tab === id ? "bg-accent text-white" : "text-muted hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-[12.5px] text-muted">
          {tab === "programmes"
            ? "Each programme is one system's assurance stance: CSV or CSA, against which frameworks, and what proves it."
            : "What we must satisfy, from regulation down to our own policy, and which systems answer to it."}
        </p>
        {!model ? (
          <p className="mt-6 text-[13px] text-muted">Loading…</p>
        ) : tab === "frameworks" ? (
          <div className="mt-4">
            <FrameworkList model={model} snap={snap ?? null} />
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11.5px] text-muted">
              {([3, 2, 1, 0] as Solidity[]).map((l) => (
                <span
                  key={l}
                  className="flex items-center gap-1"
                  title={SOLIDITY[l].hint}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: SOLIDITY[l].color }}
                  />
                  {SOLIDITY[l].label}
                </span>
              ))}
            </div>
            <div className="mt-3 space-y-3">
              {assessed.map(({ p, a }) => (
                <ProgrammeCard
                  key={p.id}
                  p={p}
                  a={a}
                  model={model}
                  snap={snap ?? null}
                />
              ))}
            </div>
            {mustHave.length > 0 && (
              <div className="mt-6">
                <h2 className="text-[12px] font-semibold uppercase tracking-wide text-[#ef4444]">
                  In scope, no programme
                </h2>
                <p className="mt-0.5 text-[12px] text-muted">
                  A regulated business process runs on each of these, so each
                  needs a stated CSV or CSA stance. This is the gap list.
                </p>
                <ul className="mt-2 space-y-1.5">
                  {mustHave.map((n) => {
                    const sc = scope?.get(n.id);
                    return (
                      <li
                        key={n.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12px]"
                      >
                        <NodeChip snap={snap ?? null} id={n.id} />
                        <span className="text-muted">
                          runs{" "}
                          {sc?.processIds
                            .map((id) => snap?.nodes.get(id)?.name)
                            .join(", ")}
                        </span>
                        <span className="ml-auto text-muted">
                          {sc?.frameworks.join(", ")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {mayBeOut.length > 0 && (
              <div className="mt-6">
                <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                  Not in scope
                </h2>
                <p className="mt-0.5 text-[12px] text-muted">
                  No regulated process runs on these. If that is right, record
                  it as a decision. If a process is missing from the model, add
                  it.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {mayBeOut.map((n) => (
                    <NodeChip key={n.id} snap={snap ?? null} id={n.id} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
