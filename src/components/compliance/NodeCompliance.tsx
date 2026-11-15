"use client";

import { getDataSource } from "@/data";
import {
  assessProgramme,
  deviationCounter,
  SOLIDITY,
  type Solidity,
} from "@/domain/compliance";
import { useAsync } from "@/lib/useAsync";
import { computeScope, processFrameworks, programmeFor } from "@/domain/scope";
import { useApp } from "@/state/store";
import { SectionTitle } from "../detail/parts";

/** A system's assurance stance in one place, in its details. */
export function NodeCompliance({ nodeId }: { nodeId: string }) {
  const { data: model } = useAsync("compliance", () =>
    getDataSource().getCompliance(),
  );
  const { data: snap } = useAsync("snapshot", () =>
    getDataSource().getSnapshot(),
  );
  const setView = useApp((s) => s.setView);
  if (!model || !snap) return null;
  const mine = model.programmes.filter((p) => p.nodeId === nodeId);
  const dev = deviationCounter(model.docs);
  const scope = computeScope(snap).get(nodeId);
  const node = snap.nodes.get(nodeId);
  if (node?.kind === "process") {
    const fws = processFrameworks(snap, nodeId);
    const targets = (snap.outgoing.get(nodeId) ?? []).filter(
      (r) => r.type === "supported_by",
    );
    return (
      <>
        <SectionTitle>Compliance</SectionTitle>
        {fws.length === 0 ? (
          <p className="text-[12.5px] text-muted">
            Not regulated, so nothing it runs on needs validation because of it.
          </p>
        ) : (
          <>
            <p className="text-[12.5px] text-ink">
              Regulated by {fws.join(", ")}. What runs it is in scope for CSV or
              CSA.
            </p>
            <ul className="mt-2 space-y-1.5">
              {targets.map((r) => {
                const t = snap.nodes.get(r.targetId);
                const p = programmeFor(snap, model, r.targetId);
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12.5px]"
                  >
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {t?.name}
                    </span>
                    {p ? (
                      <span className="shrink-0 rounded bg-accent-soft px-1.5 text-[11px] font-semibold text-accent">
                        {p.approach}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11.5px] font-semibold text-[#ef4444]">
                        No programme
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <button
          type="button"
          onClick={() => setView("compliance")}
          className="mt-2 text-[12px] font-medium text-accent hover:underline"
        >
          Open in Compliance
        </button>
      </>
    );
  }
  return (
    <>
      <SectionTitle>Compliance</SectionTitle>
      {scope && (
        <p className="mb-2 text-[12.5px] text-ink">
          In scope because it runs{" "}
          {scope.processIds
            .map((id) => snap.nodes.get(id)?.name)
            .filter(Boolean)
            .join(", ")}{" "}
          <span className="text-muted">({scope.frameworks.join(", ")})</span>.
        </p>
      )}
      {mine.length === 0 ? (
        <p className="text-[12.5px] text-muted">
          {scope
            ? "No programme. A regulated process runs on this, so it needs one."
            : "No programme, and no regulated process runs on it, so it may be out of scope. That should be recorded."}
        </p>
      ) : (
        <ul className="space-y-2">
          {mine.map((p) => {
            const a = assessProgramme(p, model, dev);
            return (
              <li
                key={p.id}
                className="rounded-lg border border-line bg-panel p-2.5"
              >
                <div className="flex items-center gap-2 text-[12.5px]">
                  <span className="rounded bg-accent-soft px-1.5 py-px text-[11px] font-semibold text-accent">
                    {p.approach}
                  </span>
                  <span className="text-muted">{p.risk} risk</span>
                  <span className="ml-auto text-muted">
                    {a.counts[3]} of {a.total} approved
                  </span>
                </div>
                <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-panel2">
                  {([3, 2, 1, 0] as Solidity[]).map((l) =>
                    a.counts[l] ? (
                      <span
                        key={l}
                        style={{
                          width: `${(a.counts[l] / Math.max(1, a.total)) * 100}%`,
                          background: SOLIDITY[l].color,
                          opacity: l === 0 ? 0.55 : 1,
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <div className="mt-1.5 text-[11.5px] text-muted">
                  {p.frameworkIds
                    .map(
                      (id) => model.frameworks.find((f) => f.id === id)?.short,
                    )
                    .join(" · ")}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setView("compliance")}
        className="mt-2 text-[12px] font-medium text-accent hover:underline"
      >
        Open in Compliance
      </button>
    </>
  );
}
