"use client";
import { NodeCompliance } from "@/components/compliance/NodeCompliance";
import { TryList } from "@/components/help/TryList";

import {
  ArrowRight,
  CornerDownRight,
  Crosshair,
  FileText,
  Layers,
  Maximize2,
  SquareArrowOutUpRight,
  X,
  Flame,
  Route as RouteIcon,
} from "lucide-react";
import { getDataSource } from "@/data";
import {
  HEALTH_COLOR,
  LIFECYCLE_LABEL,
  NODE_KINDS,
  RELATION_TYPES,
} from "@/domain/registry";
import type { GraphNode, Id, Relation } from "@/domain/types";
import { useAsync } from "@/lib/useAsync";
import { navigateTo } from "@/state/navigate";
import { type NodeDetailTab, type Tab, useApp } from "@/state/store";
import { KindIcon } from "../icons";
import { MonitoringPane } from "./MonitoringPane";
import { NodeHosting } from "./NodeHosting";
import {
  DiagramsPane,
  DocsPane,
  Empty,
  NodeChip,
  PropsTable,
  SectionTitle,
} from "./parts";

export function DetailPanel({
  tab,
  onClose,
}: {
  tab: Tab;
  onClose?: () => void;
}) {
  const setDetailOpen = useApp((s) => s.setDetailOpen);
  const sel = tab.selection;

  return (
    <aside
      className="flex h-full w-full flex-col border-l border-line bg-panel"
      aria-label="Details"
    >
      <button
        type="button"
        onClick={() => (onClose ? onClose() : setDetailOpen(false))}
        className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted hover:bg-panel2 hover:text-ink"
        aria-label="Close details"
        title="Close details"
      >
        <X size={15} />
      </button>
      {!sel && (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-[13px] text-muted">
            Select a node or a relationship on the canvas to see its documents,
            diagrams and monitoring.
          </p>
          <div className="w-full max-w-[320px] text-left">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Try this
            </div>
            <TryList limit={3} />
          </div>
        </div>
      )}
      {sel?.type === "node" && (
        <NodeDetail key={sel.id} id={sel.id} tab={tab} />
      )}
      {sel?.type === "relation" &&
        (sel.id.startsWith("derived|") || sel.id.startsWith("bundle|") ? (
          <DerivedDetail key={sel.id} id={sel.id} />
        ) : (
          <RelationDetail key={sel.id} id={sel.id} tab={tab} />
        ))}
    </aside>
  );
}

/* ====================== Node ====================== */

function NodeDetail({ id, tab }: { id: Id; tab: Tab }) {
  const setDetailTab = useApp((s) => s.setDetailTab);
  const { data } = useAsync(`node-detail:${id}`, async () => {
    const ds = getDataSource();
    const t = { type: "node" as const, id };
    const [node, ancestors, children, docs, diagrams, monitoring, relations] =
      await Promise.all([
        ds.getNode(id),
        ds.getAncestors(id),
        ds.getChildren(id),
        ds.getDocsFor(t),
        ds.getDiagramsFor(t),
        ds.getMonitoring(id),
        ds.getRelationsOf(id),
      ]);
    return { node, ancestors, children, docs, diagrams, monitoring, relations };
  });

  if (!data?.node)
    return <div className="p-5 text-sm text-muted">Loading…</div>;
  const { node, ancestors, children, docs, diagrams, monitoring, relations } =
    data;
  const kind = NODE_KINDS[node.kind];
  const active = (tab.detailTab as NodeDetailTab) ?? "overview";

  const tabs: { id: NodeDetailTab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "docs", label: "Docs", count: docs.length },
    { id: "diagrams", label: "Diagrams", count: diagrams.length },
    ...(monitoring ? [{ id: "monitoring" as const, label: "Monitoring" }] : []),
    { id: "relations", label: "Relations", count: relations.length },
  ];

  return (
    <>
      <header className="border-b border-line px-5 pb-0 pt-4">
        <div className="flex items-start gap-3 pr-6">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${kind.color}22`, color: kind.color }}
          >
            <KindIcon kind={node.kind} size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-semibold leading-tight text-ink">
              {node.name}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
              <span>{kind.label}</span>
              <span>·</span>
              <span>{LIFECYCLE_LABEL[node.lifecycle]}</span>
              {node.external && (
                <span className="rounded bg-panel2 px-1 text-[10px] uppercase">
                  external
                </span>
              )}
              {monitoring && (
                <span className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: HEALTH_COLOR[monitoring.health] }}
                  />
                  {monitoring.health}
                </span>
              )}
            </div>
          </div>
        </div>
        <TabStrip
          tabs={tabs}
          active={active}
          onChange={(t) => setDetailTab(t)}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {active === "overview" && (
          <NodeOverview
            node={node}
            ancestors={ancestors}
            contained={children}
          />
        )}
        {active === "docs" && <DocsPane target={{ type: "node", id }} />}
        {active === "diagrams" && (
          <DiagramsPane target={{ type: "node", id }} />
        )}
        {active === "monitoring" && <MonitoringPane nodeId={id} />}
        {active === "relations" && (
          <NodeRelations nodeId={id} relations={relations} />
        )}
      </div>
    </>
  );
}

function TabStrip<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div role="tablist" className="-mb-px mt-3 flex gap-1 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`whitespace-nowrap border-b-2 px-2.5 py-2 text-[12.5px] font-medium ${
            active === t.id
              ? "border-accent text-ink"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined && t.count > 0 && (
            <span className="ml-1.5 rounded-full bg-panel2 px-1.5 py-px text-[10.5px] text-muted">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function NodeOverview({
  node,
  ancestors,
  contained,
}: {
  node: GraphNode;
  ancestors: GraphNode[];
  contained: GraphNode[];
}) {
  const openNode = useApp((s) => s.openNode);
  const startBlast = useApp((s) => s.startBlast);
  const startPath = useApp((s) => s.startPath);
  const focusNode = useApp((s) => s.focusNode);
  const drillInto = useApp((s) => s.drillInto);
  const toggleOpen = useApp((s) => s.toggleOpen);
  const opened = useApp(
    (s) =>
      s.tabs.find((t) => t.id === s.activeTabId)?.openIds.includes(node.id) ??
      false,
  );
  return (
    <div>
      {ancestors.length > 0 && (
        <nav
          className="mb-3 flex flex-wrap items-center gap-1 text-[12px] text-muted"
          aria-label="Containment path"
        >
          {ancestors.map((a) => (
            <span key={a.id} className="flex items-center gap-1">
              <button
                type="button"
                className="hover:text-ink hover:underline"
                onClick={() => void navigateTo({ type: "node", id: a.id })}
              >
                {a.name}
              </button>
              <span>›</span>
            </span>
          ))}
          <span className="text-ink">{node.name}</span>
        </nav>
      )}
      <p className="text-[13.5px] leading-relaxed text-ink">{node.summary}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <ActionButton
          onClick={() => void focusNode(node.id)}
          icon={<Crosshair size={13} />}
          hint="Same level: show this node and its immediate neighbours"
        >
          Focus here
        </ActionButton>
        {contained.length > 0 && (
          <ActionButton
            onClick={() => toggleOpen(node.id)}
            icon={<Maximize2 size={13} />}
            hint="Same level: show what is inside, drawn inside this node in the current view"
          >
            {opened ? "Close in place" : "Open in place"}
          </ActionButton>
        )}
        {contained.length > 0 && (
          <ActionButton
            onClick={() => void drillInto(node.id)}
            icon={<CornerDownRight size={13} />}
            hint="Next level down: show what is inside"
          >
            Go inside ({contained.length})
          </ActionButton>
        )}
        <ActionButton
          onClick={() => startBlast(node.id)}
          icon={<Flame size={13} />}
          hint="Highlight everything that breaks if this goes down"
        >
          Blast radius
        </ActionButton>
        <ActionButton
          onClick={() => startPath(node.id)}
          icon={<RouteIcon size={13} />}
          hint="Pick another node and see how they connect"
        >
          Trace path
        </ActionButton>
        <ActionButton
          onClick={() => void openNode(node.id, { newTab: true })}
          icon={<SquareArrowOutUpRight size={13} />}
          hint="Open in a new tab"
        >
          New tab
        </ActionButton>
      </div>

      <SectionTitle>Ownership</SectionTitle>
      {node.ownerId ? (
        <NodeChip id={node.ownerId} />
      ) : (
        <span className="text-[13px] text-muted">Unowned</span>
      )}

      <NodeHosting nodeId={node.id} />

      {(node.kind === "system" || node.kind === "process") && (
        <NodeCompliance nodeId={node.id} />
      )}

      {node.tags.length > 0 && (
        <>
          <SectionTitle>Tags</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {node.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-line px-2 py-0.5 text-[11.5px] text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Properties</SectionTitle>
      <PropsTable props={node.props} />

      {contained.length > 0 && (
        <>
          <SectionTitle>Contains ({contained.length})</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {contained.map((c) => (
              <NodeChip key={c.id} id={c.id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NodeRelations({
  nodeId,
  relations,
}: {
  nodeId: Id;
  relations: Relation[];
}) {
  const { data: counts } = useAsync(`relcounts:${nodeId}`, () =>
    getDataSource().getDocCounts(
      relations.map((r) => ({ type: "relation" as const, id: r.id })),
    ),
  );
  if (!relations.length) return <Empty>No relations recorded.</Empty>;

  const outgoing = relations.filter((r) => r.sourceId === nodeId);
  const incoming = relations.filter((r) => r.targetId === nodeId);

  // Selects the relation if it is on the canvas, otherwise re-centres on it.
  const open = (r: Relation) => navigateTo({ type: "relation", id: r.id });

  const Row = ({ r, dir }: { r: Relation; dir: "out" | "in" }) => {
    const def = RELATION_TYPES[r.type];
    const other = dir === "out" ? r.targetId : r.sourceId;
    const docs = counts?.[`relation:${r.id}`] ?? 0;
    return (
      <li className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: def.color }}
          aria-hidden
        />
        <span className="shrink-0 text-[12px] text-muted">
          {dir === "out" ? def.label : def.inverse}
        </span>
        <div className="min-w-0 flex-1">
          <NodeChip id={other} />
        </div>
        <button
          type="button"
          onClick={() => void open(r)}
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-accent hover:bg-accent-soft"
          title="Open this relationship as an object"
        >
          {docs > 0 && (
            <span className="flex items-center gap-0.5">
              <FileText size={11} /> {docs}
            </span>
          )}
          <ArrowRight size={12} />
        </button>
      </li>
    );
  };

  return (
    <div>
      {outgoing.length > 0 && (
        <>
          <SectionTitle>Outgoing ({outgoing.length})</SectionTitle>
          <ul className="space-y-1.5">
            {outgoing.map((r) => (
              <Row key={r.id} r={r} dir="out" />
            ))}
          </ul>
        </>
      )}
      {incoming.length > 0 && (
        <>
          <SectionTitle>Incoming ({incoming.length})</SectionTitle>
          <ul className="space-y-1.5">
            {incoming.map((r) => (
              <Row key={r.id} r={r} dir="in" />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* ====================== Relation ====================== */

function RelationDetail({ id, tab }: { id: Id; tab: Tab }) {
  const setDetailTab = useApp((s) => s.setDetailTab);
  const { data } = useAsync(`rel-detail:${id}`, async () => {
    const ds = getDataSource();
    const t = { type: "relation" as const, id };
    const [rel, docs, diagrams] = await Promise.all([
      ds.getRelation(id),
      ds.getDocsFor(t),
      ds.getDiagramsFor(t),
    ]);
    return { rel, docs, diagrams };
  });
  if (!data?.rel) return <div className="p-5 text-sm text-muted">Loading…</div>;
  const { rel, docs, diagrams } = data;
  const def = RELATION_TYPES[rel.type];
  const active =
    tab.detailTab === "docs" || tab.detailTab === "diagrams"
      ? tab.detailTab
      : "overview";

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "docs" as const, label: "Docs", count: docs.length },
    { id: "diagrams" as const, label: "Diagrams", count: diagrams.length },
  ];

  return (
    <>
      <header className="border-b border-line px-5 pb-0 pt-4">
        <div
          className="pr-6 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: def.color }}
        >
          Relationship · {def.label}
        </div>
        <h2 className="mt-0.5 text-[16px] font-semibold leading-tight text-ink">
          {rel.name ?? def.label}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <NodeChip id={rel.sourceId} />
          <span className="text-[12px] text-muted">{def.label}</span>
          <NodeChip id={rel.targetId} />
        </div>
        <TabStrip
          tabs={tabs}
          active={active}
          onChange={(t) => setDetailTab(t)}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {active === "overview" && (
          <div>
            {rel.description ? (
              <p className="text-[13.5px] leading-relaxed text-ink">
                {rel.description}
              </p>
            ) : (
              <p className="text-[13px] text-muted">No description yet.</p>
            )}
            <SectionTitle>Properties</SectionTitle>
            <PropsTable
              props={{
                type: def.label,
                lifecycle: LIFECYCLE_LABEL[rel.lifecycle],
                ...rel.props,
              }}
            />
            <p className="mt-4 rounded-lg bg-panel2 p-3 text-[12px] leading-relaxed text-muted">
              Documents and diagrams attached to a relationship belong to it
              alone. They are shown here, and are not listed on either connected
              node.
            </p>
          </div>
        )}
        {active === "docs" && <DocsPane target={{ type: "relation", id }} />}
        {active === "diagrams" && (
          <DiagramsPane target={{ type: "relation", id }} />
        )}
      </div>
    </>
  );
}

/* ====================== Lifted relation ====================== */

function ActionButton({
  onClick,
  icon,
  hint,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink hover:border-accent"
    >
      {icon} {children}
    </button>
  );
}

/** A relation lifted to the visible level from relations between deeper nodes. */
function DerivedDetail({ id }: { id: Id }) {
  const [, sourceId, targetId, via] = id.split("|");
  const viaIds = via ? via.split(",") : [];
  const { data: rels } = useAsync(`derived:${id}`, async () => {
    const ds = getDataSource();
    const found = await Promise.all(viaIds.map((v) => ds.getRelation(v)));
    return found.filter((r): r is Relation => Boolean(r));
  });
  return (
    <>
      <header className="border-b border-line px-5 pb-4 pt-4">
        <div className="flex items-center gap-1.5 pr-6 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <Layers size={12} />{" "}
          {id.startsWith("bundle|")
            ? "Grouped relationships"
            : "Lifted relationship"}
        </div>
        <h2 className="mt-0.5 text-[16px] font-semibold leading-tight text-ink">
          {id.startsWith("bundle|")
            ? `${viaIds.length} relations between these two`
            : viaIds.length === 1
              ? "1 relation rolls up here"
              : `${viaIds.length} relations roll up here`}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <NodeChip id={sourceId} />
          <span className="text-[12px] text-muted">→</span>
          <NodeChip id={targetId} />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="rounded-lg bg-panel2 p-3 text-[12px] leading-relaxed text-muted">
          {id.startsWith("bundle|") ? (
            <>
              These relations run the same way between the same two nodes, so
              they share one line. The thicker the line, the more it stands for.
              Open one to see its own documents.
            </>
          ) : (
            <>
              This line summarises relations between nodes <em>inside</em> these
              components. Open one to see its own documents.
            </>
          )}
        </p>
        <SectionTitle>Underlying relations</SectionTitle>
        <ul className="space-y-1.5">
          {rels?.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-line bg-panel p-2.5"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <NodeChip
                  id={r.sourceId}
                  onClick={() =>
                    void navigateTo({ type: "node", id: r.sourceId })
                  }
                />
                <span className="text-[12px] text-muted">
                  {RELATION_TYPES[r.type].label}
                </span>
                <NodeChip
                  id={r.targetId}
                  onClick={() =>
                    void navigateTo({ type: "node", id: r.targetId })
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => void navigateTo({ type: "relation", id: r.id })}
                className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline"
              >
                {r.name ?? "Open relationship"} <ArrowRight size={11} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
