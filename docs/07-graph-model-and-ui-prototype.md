# 07. Graph Model and UI Prototype

Status: **Draft v0.1** (2026-11-11). This document **supersedes** the "documents are scoped to org/system/project" model in doc 03 and the slice order in doc 06. Docs 01 and 02 (architecture and stack) still stand.

## 1. What changed and why

The first design treated documentation as the core and the resource graph as a later slice. The product is the other way round: **everything is a node in a graph, and documentation, diagrams and monitoring attach to nodes and to relationships.** Users explore by opening a node in a tab and expanding its neighbours.

## 2. Model

### Nodes
Every modelled thing is a `GraphNode`: systems, services, APIs, databases, tables, queues, repositories, pipelines, images, deployments, environments, clusters, servers, dashboards, external systems and teams. The kind registry (`src/domain/registry.ts`) defines label, colour, icon, whether it is monitorable, and a **layer**, which is the future Z axis for the optional 3D view.

### Containment vs relations (kept separate)
- **Containment** is `parentId` on the node. It is the ownership tree (system → service → API).
- **Relations** are first-class records in **one `relations` collection**, so every relation touching a node can be found with two indexed queries (as source, as target).

```ts
Relation { id, type, sourceId, targetId, name?, description?, lifecycle, props }
```

Relation types are a closed registry (calls, depends_on, reads_from, publishes_to, deployed_to, monitors, ...). Each has a forward label, an inverse label, a colour and whether it is asynchronous. New types are added to the registry, not invented per record.

### Documents and diagrams attach to nodes **or relations**
```ts
Doc { id, title, docType, audience, content (markdown), attachedTo: [{ type: 'node'|'relation', id }], ... }
```
- A document attached to a **relation is owned by that relationship**. It appears when the relation is opened as an object and is **not** listed on either connected node. The node's Relations tab shows a document count per relation so it is discoverable.
- A document may attach to several targets. Its viewer shows "Also attached to" links.
- Diagrams are Mermaid source attached the same way.

### Monitoring
Per-node snapshot: health, metrics with a 30-point series, alerts, links. Systems roll up the worst health of what they contain. In the prototype this is generated; later it is read from Prometheus or similar and marked with observation time (see spec section 7 on observed state).

## 3. Mongo mapping (planned)

| Collection | Notes |
|---|---|
| `nodes` | `{organizationId, kind, parentId}` index; text/Atlas Search index on name, summary, tags |
| `relations` | indexes `{organizationId, sourceId, type}` and `{organizationId, targetId, type}` |
| `documents` + `document_revisions` | immutable revisions as in doc 05; `attachedTo` is a multikey index on `{type, id}` |
| `diagrams` | same attachment shape |
| `observations` | later, for monitoring and sync |

All collections carry `organizationId`. Containment and relation integrity (no dangling ids) is enforced in services, as in doc 03.

## 4. The data seam

All UI code talks to the `DataSource` interface (`src/data/datasource.ts`). Today it is backed by fixtures (`FixtureDataSource`). Replacing it with a MongoDB implementation behind route handlers should change **no component**. The interface is async on purpose and already includes the view-level query the canvas needs (`getScopeView`), so the server can return nodes, relations, health and counts in one round trip.

## 5. Levels, shapes and canvas behaviour (v2)

The first prototype accumulated nodes as you clicked, which exploded into a hairball. v2 replaces it with **bounded views, explicit levels and a shape language**.

### Two kinds of movement
| Movement | What it does | How |
|---|---|---|
| **Same level** | Shows a node and its *immediate* relation neighbours (a "root directory" of that node). Optional **reach** of 1 to 3 hops. | "Open as its own view", double-click a node, "Focus here" |
| **Change level** | **Go inside** a node to see its contents (children). A team contains what it owns. | Chip on the square, toolbar, or "Go inside" in the panel |

A tab keeps an **exploration path** (breadcrumb): `Landscape › Checkout & Payments (inside) › Checkout Service (around)`. Any step can be revisited; "up" goes back one.

### In-place details (no level change)
A square can expand **details** as circles: Properties, Docs, Diagrams, Health, Relations and Owner. Circles never reveal other components. Clicking one opens the matching tab in the side panel. Details can be toggled per node or for the whole view.

### Shape language
| Shape | Meaning |
|---|---|
| Square, colour stripe and icon by kind | A component at the current level |
| Square with accent ring and "focus" tag | The root of an "around" view |
| Circle | A detail of a component (docs, health, ...) |
| Dashed faded square | A node outside this level, shown only when "Outside links" is on |
| Dotted edge with an up-arrow label | A **lifted relation**: several relations between deeper nodes rolled up to this level |
| Solid or dashed coloured edge | A direct relation (dashed and animated when asynchronous) |

### Lifted relations
Inside a system you see its services, not their APIs, so relations that end at a deeper node (for example Checkout Service to Payments Internal API) are **lifted** to the nearest visible ancestor (Checkout Service to Payments Service). Opening a lifted edge lists the underlying relations, each openable with its own documents. A lifted edge is hidden if a direct relation already connects the same pair.

### Other behaviour
- **Click** selects; it never changes what is on screen. Double-click focuses.
- **Filters:** per-tab relation-type dropdown, containment lines, reach, outside links.
- **Cap:** "around" views stop at 60 nodes and say how many were left out.
- **Layout:** left-to-right layered (dagre). Squares reserve room for their circles. Nodes can be dragged (their circles follow).
- The **2D renderer is the default**. An optional 3D renderer would use the same view model and each kind's layer as depth. Not built yet.

## 6. Search

One index over nodes, relations and documents, with prefix matching, typo tolerance, field boosts (title, tags, ownership/path), AND-then-OR fallback, type and kind filters, highlighted terms and content snippets. Hits open the right object: a node opens or focuses a tab, a relation opens as an object, a document opens inside its owning node or relation.

The prototype uses MiniSearch in memory. Production options, to decide when the Mongo source lands: **MongoDB Atlas Search** (same database, no sync) or a dedicated engine such as OpenSearch if volume or ranking needs grow. Search must respect permissions: results are filtered by what the caller may read.

## 7. Known limits of the prototype

- Fake data only; nothing is persisted. Tab state resets on reload.
- No authentication, authorisation or audit yet. Doc 04 still describes the intended model.
- No editing: nodes, relations and docs are read-only.
- Large graphs are only tested at about 70 nodes (views are capped at 60).
- A team has no relations yet, so its "around" view is just itself; its contents (owned nodes) show when you go inside. Modelling ownership as a relation would fix this. Expect to need server-side expansion limits, clustering and virtualised rendering beyond a few hundred visible nodes.
- Layout re-runs when the view or the set of open details changes, so positions shift. Pinning stable positions is a follow-up.
- Monitoring links are placeholders.

## 8. Revised roadmap

1. **UI prototype on fixtures** (this document). Validate the model and interaction with real users.
2. **Mongo-backed DataSource** (read path), seeded from the fixture. Add Clerk and the authorisation layer so every query is scoped and permission-filtered.
3. **Editing:** create and edit nodes, relations and documents through forms, with immutable revisions and audit events.
4. **Search on Mongo** (Atlas Search or alternative), permission-aware.
5. **Real monitoring and first integration** (GitHub, then Prometheus), with observed vs desired state.
6. **Validation, change sets and approvals** as in docs 05 and the spec.
7. **Optional 3D view** spike.

## 9. Open questions

- Which relation types and node kinds are needed beyond the starter registry, and who may extend them?
- Should relation direction be strict, or may some be symmetric (e.g. integrates with)?
- Layout: persist user-arranged positions per saved view?
- Saved views (named, shareable tabs), such as "Deployment view" or "Data flow", are likely the next big UX feature.
- Should team ownership use the same relation mechanism (`owned_by`) instead of an `ownerId` field, so ownership is queryable as graph data?
