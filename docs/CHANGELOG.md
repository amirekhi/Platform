# Ecosystem patch v1.6.0 - infrastructure hierarchy

Apply on top of v1.5.0. Copy the files in `src/` over the same paths in your project.

## The model

Infrastructure is now its own hierarchy, next to the organisation and the software systems.

Containment is physical:

    Data centre  >  Rack  >  Physical host  >  Virtual machine
                                            >  Server (bare metal, no hypervisor)

A data centre is a top-level node. A host contains what runs directly on it, so moving a
machine to another host is a change of parent.

Clusters are logical (their nodes sit on several hosts), so they are top-level too and are tied
to their nodes by relations.

What runs on the infrastructure is tied to it by relations, and every arrow points down:

    service <- deployment_of - deployment - runs_on > cluster - has_node > machine
    database / cache / queue - hosted_on > machine or server
    machine - hosted_on > physical host          (it is also contained in it)
    environment - hosted_on > data centre

## Shapes
- New kind `vm` (Virtual machine) with a new shape: a frame holding a dashed inner frame (a
  machine inside a machine), and the picture-in-picture icon.
- Existing shapes kept: data centre, rack, physical host (chassis), switch, server unit, cluster
  stack. The `hardware` kind is now labelled "Physical host" (same id).

## New relation types
- `has_node` (cluster has node, soft): losing one node degrades a cluster, it does not stop it.
- `replicates_to` (dashed, soft): a database replica in another site.

## Data
- Second data centre: Amsterdam DC AMS1 (disaster recovery) with a rack, two hosts, a standby
  cluster `k8s-dr`, a standby deployment `checkout @ dr`, a Mongo replica `mongo-prod-02`,
  a core router and an inter-site link. `env-dr` added.
- Eight virtual machines (worker nodes of the three clusters, redis, postgres, kafka) on
  four virtualisation hosts; `cart`, `payments` deployments added.
- Placed: Cart Redis, Orders DB, order-events, Catalog MongoDB (+ replica), Prometheus, Grafana,
  and all deployments. Everything in Frankfurt except the standby (Amsterdam).
- Moved: data centres and the three clusters are now top-level; `srv-mongo-01` sits inside its
  host (it was under Delivery & Platform). Delivery & Platform now holds environments and
  observability only. Node ids did not change, so docs, diagrams and compliance still match.
- Removed: the shortcut relations from clusters straight to hardware (replaced by the chain).

## Tracing
- New "Where it runs" section in the details panel: every route from a node down to its rack
  and data centre, one chip per step, clickable. For infrastructure it opens the blast radius.
- New lens "Where it runs": colour by data centre, "More than one site", and red
  "No placement recorded". Click a legend row to isolate it.
- Explorer: new Infrastructure section (data centres, then clusters).
- Two new guided examples.

## Impact rules changed (so a failure travels sensibly through the stack)
- `deployment_of` now flows to the service (soft), except from a deployment whose environment has
  `servesTraffic: false` (staging, standby). A staging failure does not degrade production.
- `connects_to` now flows up the link only. Before, a failing host marked its switch and, through
  it, every other host and the other site as affected.
- `runs` (deployment runs image) now points the right way: a failing deployment no longer marks
  its image as affected.

## Checked
Run against the real fixtures: all node, parent and relation references resolve, every id used by
docs and diagrams still exists, all routes end in a data centre, strict TypeScript passes on the
domain and data files. Example results: losing the bare-metal Mongo host affects its database
(hard), the replica (soft, stale) and the ETL job; losing a staging VM leaves checkout untouched.

## Known gaps (honest ones)
- Not placed yet (red in the lens): Storefront BFF, Search, Auth, Identity DB, Order, Inventory,
  Shipping, Legacy Notifier, ETL, Warehouse, POS, WMS, ERP, HR and their data. They have no
  deployment, server or machine in the model yet.
- Redundancy is not modelled: a node failing shows its cluster as degraded, and losing a whole site
  shows services as degraded, never down.
- Docs and diagrams were not updated for the new model.
- Not run in the app (no build here). Run `npm run build` after copying.
