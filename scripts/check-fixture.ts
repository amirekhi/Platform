import { NODES } from "../src/data/fixture/nodes";
import { RELATIONS } from "../src/data/fixture/relations";
import { DOCS } from "../src/data/fixture/docs";
import { DIAGRAMS } from "../src/data/fixture/diagrams";
import { FixtureDataSource } from "../src/data/fixtureSource";

const ids = new Set(NODES.map((n) => n.id));
const rids = new Set(RELATIONS.map((r) => r.id));
const errs: string[] = [];
if (ids.size !== NODES.length) errs.push("duplicate node ids");
if (rids.size !== RELATIONS.length) errs.push("duplicate relation ids");
for (const n of NODES) {
  if (n.parentId && !ids.has(n.parentId)) errs.push(`node ${n.id}: missing parent ${n.parentId}`);
  if (n.ownerId && !ids.has(n.ownerId)) errs.push(`node ${n.id}: missing owner ${n.ownerId}`);
}
for (const r of RELATIONS) {
  if (!ids.has(r.sourceId)) errs.push(`rel ${r.id}: bad source`);
  if (!ids.has(r.targetId)) errs.push(`rel ${r.id}: bad target`);
}
for (const d of [...DOCS, ...DIAGRAMS]) {
  for (const t of d.attachedTo) {
    if (!(t.type === "node" ? ids : rids).has(t.id)) errs.push(`${d.id}: bad target ${t.type}:${t.id}`);
  }
}
console.log(`nodes=${NODES.length} relations=${RELATIONS.length} docs=${DOCS.length} diagrams=${DIAGRAMS.length}`);
(async () => {
  const ds = new FixtureDataSource();
  for (const q of ["payments", "idempotency", "stripe webhook", "redis", "rollback", "ldap", "pci", "kafka", "paymnts"]) {
    const hits = await ds.search(q);
    console.log(q.padEnd(16), hits.length, hits.slice(0, 3).map((h) => `${h.type}:${h.title}`).join(" | "));
  }
  const show = async (label: string, q: Parameters<typeof ds.getScopeView>[0]) => {
    const g = await ds.getScopeView(q);
    console.log(label.padEnd(34), `nodes=${g.nodes.length} rels=${g.relations.length} (derived ${g.relations.filter((r) => r.derived).length}) ghosts=${g.nodes.filter((n) => n.role === "ghost").length} trunc=${g.truncated}`);
    for (const r of g.relations) if (!ids.has(r.sourceId) || !ids.has(r.targetId)) errs.push(`bad edge ${r.id}`);
    return g;
  };
  await show("landscape", { rootId: null, mode: "inside", radius: 1 });
  await show("inside Checkout & Payments", { rootId: "sys-checkout", mode: "inside", radius: 1 });
  await show("inside Checkout (+external)", { rootId: "sys-checkout", mode: "inside", radius: 1, showExternal: true });
  await show("inside Checkout Service", { rootId: "svc-checkout", mode: "inside", radius: 1, showExternal: true });
  await show("around Checkout Service r1", { rootId: "svc-checkout", mode: "around", radius: 1 });
  await show("around Checkout Service r2", { rootId: "svc-checkout", mode: "around", radius: 2 });
  await show("around Checkout Service r3", { rootId: "svc-checkout", mode: "around", radius: 3 });
  await show("inside Checkout Team", { rootId: "team-checkout", mode: "inside", radius: 1 });
  const g = await ds.getScopeView({ rootId: "svc-payments", mode: "around", radius: 1 });
  console.log("payments r1:", g.nodes.map((n) => `${n.role[0]}:${n.name}`).join(", "));
  if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
  console.log("fixture OK");
})();
