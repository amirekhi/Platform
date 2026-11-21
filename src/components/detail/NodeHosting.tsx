"use client";

import { ChevronRight, Flame } from "lucide-react";
import { useMemo, useState } from "react";
import { getDataSource } from "@/data";
import type { GraphSnapshot } from "@/domain/analysis";
import { hostingChains, INFRA_KINDS, PLACED_KINDS } from "@/domain/placement";
import { NODE_KINDS } from "@/domain/registry";
import type { Id } from "@/domain/types";
import { useAsync } from "@/lib/useAsync";
import { navigateTo } from "@/state/navigate";
import { useApp } from "@/state/store";
import { KindIcon } from "../icons";
import { SectionTitle } from "./parts";

const SHOWN = 6;

function Step({
  snap,
  id,
  site,
}: {
  snap: GraphSnapshot;
  id: Id;
  site?: boolean;
}) {
  const n = snap.nodes.get(id);
  if (!n) return null;
  const k = NODE_KINDS[n.kind];
  return (
    <button
      type="button"
      onClick={() => void navigateTo({ type: "node", id })}
      title={`${k.label}: ${n.name}`}
      className={`inline-flex max-w-full items-center gap-1 rounded-md border bg-panel px-1.5 py-0.5 text-[11.5px] text-ink hover:border-accent ${
        site ? "border-accent" : "border-line"
      }`}
    >
      <span style={{ color: k.color }}>
        <KindIcon kind={n.kind} size={11} />
      </span>
      <span className="truncate">{n.name}</span>
    </button>
  );
}

/**
 * Where a node runs: every route from it down to a data centre, step by step
 * (service, deployment, cluster, node, host, rack, data centre). For the infrastructure
 * itself it says what depends on it instead, and opens the blast radius.
 */
export function NodeHosting({ nodeId }: { nodeId: Id }) {
  const { data: snap } = useAsync("snapshot", () =>
    getDataSource().getSnapshot(),
  );
  const startBlast = useApp((s) => s.startBlast);
  const [all, setAll] = useState(false);
  const chains = useMemo(
    () => (snap ? hostingChains(snap, nodeId) : []),
    [snap, nodeId],
  );
  if (!snap) return null;
  const node = snap.nodes.get(nodeId);
  if (!node || !PLACED_KINDS.has(node.kind)) return null;

  const infra = INFRA_KINDS.has(node.kind);
  const sites = [...new Set(chains.map((c) => c.site))];
  // A data centre has nothing below it to trace; a route that is only itself says nothing.
  const routes = chains.filter((c) => c.ids.length > 1);
  const shown = all ? routes : routes.slice(0, SHOWN);

  return (
    <>
      <SectionTitle>{infra ? "Place in the infrastructure" : "Where it runs"}</SectionTitle>
      {routes.length === 0 ? (
        node.kind === "datacenter" ? null : (
          <p className="text-[12.5px] text-muted">
            No placement recorded. Nothing links this to a deployment, a server or
            a machine, so it cannot be traced to hardware. Add a runs on or hosted
            on relation.
          </p>
        )
      ) : (
        <>
          <p className="mb-2 text-[12.5px] text-ink">
            {sites.length === 1 ? "One site: " : `${sites.length} sites: `}
            {sites.map((s) => snap.nodes.get(s)?.name ?? s).join(", ")}.{" "}
            <span className="text-muted">
              {routes.length} {routes.length === 1 ? "route" : "routes"} down to
              the hardware.
            </span>
          </p>
          <ul className="space-y-1.5">
            {shown.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1">
                {c.ids.slice(1).map((id, j, rest) => (
                  <span key={id} className="flex min-w-0 items-center gap-1">
                    {j > 0 && (
                      <ChevronRight
                        size={11}
                        className="shrink-0 text-muted"
                        aria-hidden
                      />
                    )}
                    <Step snap={snap} id={id} site={j === rest.length - 1} />
                  </span>
                ))}
              </li>
            ))}
          </ul>
          {routes.length > SHOWN && (
            <button
              type="button"
              onClick={() => setAll((a) => !a)}
              className="mt-2 text-[12px] font-medium text-accent hover:underline"
            >
              {all ? "Show fewer" : `Show all ${routes.length} routes`}
            </button>
          )}
        </>
      )}
      {infra && (
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] text-muted">
            Everything that runs on this, directly or through the machines inside
            it, is affected if it goes down.
          </p>
          <button
            type="button"
            onClick={() => startBlast(node.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink hover:border-accent"
          >
            <Flame size={13} /> See what runs here
          </button>
        </div>
      )}
    </>
  );
}
