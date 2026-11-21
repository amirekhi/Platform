import type { PropValue, Relation, RelationType } from "@/domain/types";

/** Stable relation ids make fixtures and documents easy to reference. */
export function relId(
  source: string,
  type: RelationType,
  target: string,
): string {
  return `${source}__${type}__${target}`;
}

const out: Relation[] = [];

function r(
  source: string,
  type: RelationType,
  target: string,
  extra: {
    name?: string;
    description?: string;
    props?: Record<string, PropValue>;
  } = {},
) {
  out.push({
    id: relId(source, type, target),
    type,
    sourceId: source,
    targetId: target,
    name: extra.name,
    description: extra.description,
    lifecycle: "active",
    props: extra.props ?? {},
  });
}

/* ---------- System level ---------- */
r("sys-storefront", "depends_on", "sys-checkout", {
  description: "Storefront hands the customer over to checkout.",
});
r("sys-storefront", "depends_on", "sys-catalog", {
  description: "Product pages and listings come from the catalog.",
});
r("sys-storefront", "depends_on", "sys-identity", {
  description: "Customer sign-in and sessions.",
});
r("sys-checkout", "depends_on", "sys-fulfilment", {
  description: "Completed checkouts become orders.",
  props: { mode: "async" },
});
r("sys-checkout", "depends_on", "sys-catalog", {
  description: "Price and availability validation.",
});
r("sys-fulfilment", "depends_on", "sys-catalog", {
  description: "Product identifiers and dimensions.",
});
r("sys-data", "reads_from", "sys-fulfilment");
r("sys-data", "reads_from", "sys-catalog");
r("sys-storefront", "runs_on", "sys-platform");
r("sys-checkout", "runs_on", "sys-platform");
r("sys-catalog", "runs_on", "sys-platform");

/* ---------- Storefront ---------- */
r("app-web", "calls", "api-bff", { props: { protocol: "GraphQL over HTTPS" } });
r("app-mobile", "calls", "api-bff", {
  props: { protocol: "GraphQL over HTTPS" },
});
r("app-web", "depends_on", "lib-design");
r("svc-bff", "exposes", "api-bff");
r("svc-bff", "calls", "api-catalog", {
  name: "Product queries",
  props: { protocol: "GraphQL", timeoutMs: 800 },
});
r("svc-bff", "calls", "api-checkout", {
  name: "Start and complete checkout",
  props: { protocol: "REST/JSON", timeoutMs: 3000 },
});
r("svc-bff", "calls", "api-auth", {
  name: "Token validation",
  props: { protocol: "OIDC introspection" },
});
r("svc-bff", "implemented_in", "repo-web");
r("app-web", "implemented_in", "repo-web");

/* ---------- Checkout & Payments ---------- */
r("svc-checkout", "exposes", "api-checkout");
r("svc-payments", "exposes", "api-payments");
r("svc-checkout", "calls", "api-payments", {
  name: "Payment authorisation",
  description:
    "Checkout requests an authorisation and later a capture for the cart total.",
  props: { protocol: "gRPC", timeoutMs: 5000, retries: 0, idempotent: true },
});
r("svc-checkout", "calls", "svc-cart", {
  name: "Load and lock cart",
  props: { protocol: "gRPC" },
});
r("svc-cart", "writes_to", "cache-cart");
r("svc-cart", "reads_from", "cache-cart");
r("svc-checkout", "calls", "api-catalog", {
  name: "Price validation",
  props: { protocol: "GraphQL", timeoutMs: 800 },
});
r("svc-checkout", "publishes_to", "q-order-events", {
  name: "OrderPlaced event",
  description:
    "Published once payment is captured. The topic is the contract between checkout and fulfilment.",
  props: { schema: "OrderPlaced v3", delivery: "at-least-once" },
});
r("svc-payments", "integrates_with", "ext-stripe", {
  name: "Payment provider integration",
  description: "Card authorisation, capture, refunds and webhooks.",
  props: {
    protocol: "HTTPS REST + webhooks",
    auth: "API key + signed webhooks",
    pci: true,
  },
});
r("svc-checkout", "implemented_in", "repo-checkout");
r("svc-cart", "implemented_in", "repo-checkout");
r("svc-payments", "implemented_in", "repo-checkout");
r("repo-checkout", "triggers", "pipe-checkout");
r("pipe-checkout", "produces", "img-checkout");
r("dep-checkout-prod", "runs", "img-checkout");
r("dep-checkout-stg", "runs", "img-checkout");
r("dep-checkout-dr", "runs", "img-checkout");
r("dep-checkout-prod", "deployment_of", "svc-checkout");
r("dep-checkout-stg", "deployment_of", "svc-checkout");
r("dep-checkout-dr", "deployment_of", "svc-checkout");
r("dep-payments-prod", "deployment_of", "svc-payments");
r("dep-cart-prod", "deployment_of", "svc-cart");
r("dep-checkout-prod", "deployed_to", "env-prod");
r("dep-checkout-stg", "deployed_to", "env-staging");
r("dep-checkout-dr", "deployed_to", "env-dr");
r("dep-payments-prod", "deployed_to", "env-prod");
r("dep-cart-prod", "deployed_to", "env-prod");
r("dep-checkout-prod", "runs_on", "k8s-prod");
r("dep-checkout-stg", "runs_on", "k8s-stg");
r("dep-checkout-dr", "runs_on", "k8s-dr");
r("dep-payments-prod", "runs_on", "k8s-prod");
r("dep-cart-prod", "runs_on", "k8s-prod");

/* ---------- Catalog ---------- */
r("svc-catalog", "exposes", "api-catalog");
r("svc-catalog", "reads_from", "tbl-products");
r("svc-catalog", "writes_to", "tbl-products");
r("svc-catalog", "writes_to", "tbl-categories");
r("svc-catalog", "writes_to", "idx-search", {
  name: "Search index sync",
  description:
    "Catalog changes are pushed to the search index through change streams.",
  props: { mechanism: "MongoDB change stream", lagTargetSeconds: 5 },
});
r("svc-search", "reads_from", "idx-search");
r("svc-search", "calls", "api-catalog", { name: "Hydrate product details" });
r("tbl-products", "references", "tbl-categories", { name: "categoryId" });
r("db-catalog", "hosted_on", "srv-mongo-01");
r("svc-catalog", "implemented_in", "repo-catalog");
r("svc-search", "implemented_in", "repo-catalog");
r("repo-catalog", "triggers", "pipe-catalog");
r("pipe-catalog", "produces", "img-catalog");
r("dep-catalog-prod", "runs", "img-catalog");
r("dep-catalog-prod", "deployment_of", "svc-catalog");
r("dep-catalog-prod", "deployed_to", "env-prod");
r("dep-catalog-prod", "runs_on", "k8s-prod");
r("proposed-recs", "reads_from", "api-catalog");
r("proposed-recs", "reads_from", "db-warehouse");
r("app-web", "depends_on", "proposed-recs");

/* ---------- Identity ---------- */
r("svc-auth", "exposes", "api-auth");
r("svc-auth", "reads_from", "tbl-users");
r("svc-auth", "reads_from", "tbl-roles");
r("svc-auth", "writes_to", "tbl-users");
r("tbl-users", "references", "tbl-roles", { name: "roleId" });
r("svc-auth", "integrates_with", "ext-directory", {
  name: "Staff directory sync",
  description:
    "Staff identities are authenticated against LDAP and mapped to roles.",
  props: { protocol: "LDAPS", syncInterval: "15m" },
});

/* ---------- Fulfilment ---------- */
r("svc-orders", "exposes", "api-orders");
r("svc-orders", "consumes_from", "q-order-events", {
  name: "OrderPlaced consumer",
  description: "Creates the order record and starts stock reservation.",
  props: { consumerGroup: "orders-v3", ordering: "per order id" },
});
r("svc-shipping", "consumes_from", "q-order-events", {
  name: "Shipment trigger",
  props: { consumerGroup: "shipping-v2" },
});
r("svc-legacy-notify", "consumes_from", "q-order-events", {
  name: "Email notifications",
  props: { consumerGroup: "notify-legacy" },
});
r("svc-orders", "writes_to", "tbl-orders");
r("svc-orders", "writes_to", "tbl-order-items");
r("tbl-order-items", "references", "tbl-orders", { name: "orderId" });
r("svc-orders", "calls", "svc-inventory", {
  name: "Reserve stock",
  props: { protocol: "gRPC" },
});
r("svc-inventory", "reads_from", "tbl-products", {
  name: "Product identifiers",
  description:
    "Inventory reads product ids directly from the catalog database. Flagged for replacement with an API call.",
});
r("svc-shipping", "integrates_with", "ext-carrier", {
  name: "Carrier labels & tracking",
  props: { protocol: "HTTPS REST", auth: "OAuth client credentials" },
});
r("svc-shipping", "calls", "api-orders", { name: "Update shipment status" });

/* ---------- Data ---------- */
r("svc-etl", "reads_from", "db-orders");
r("svc-etl", "reads_from", "db-catalog");
r("svc-etl", "writes_to", "tbl-fact-sales");
r("dash-sales", "reads_from", "tbl-fact-sales");

/* ---------- Monitoring ---------- */
r("obs-prom", "monitors", "dep-checkout-prod");
r("obs-prom", "monitors", "dep-catalog-prod");
r("obs-prom", "monitors", "svc-checkout");
r("obs-prom", "monitors", "svc-payments");
r("obs-prom", "monitors", "db-catalog");
r("obs-prom", "monitors", "k8s-prod");
r("obs-grafana", "reads_from", "obs-prom");

/* ---------- Enterprise: software serves the business ---------- */
r("sys-storefront", "serves", "co-retail", {
  description: "The online storefront is Northwind Retail's online shop.",
});
r("sys-erp", "serves", "co-group", {
  description: "General ledger and procurement for the group.",
});
r("sys-erp", "serves", "dept-finance");
r("sys-hr", "serves", "dept-hr");
r("sys-hr", "serves", "bld-hq", {
  description: "Badge access and desk booking for HQ.",
});
r("svc-pos", "serves", "store-berlin", {
  name: "Berlin till estate",
  props: { tills: 22 },
});
r("svc-pos", "serves", "store-munich", {
  name: "Munich till estate",
  props: { tills: 12 },
});
r("svc-pos", "serves", "store-paris", {
  name: "Paris till estate",
  props: { tills: 16 },
});
r("svc-wms", "serves", "wh-rotterdam");
r("svc-wms", "serves", "wh-hamburg");
r("svc-wms", "tracks", "stock-electronics", {
  name: "Electronics stock positions",
});
r("svc-wms", "tracks", "stock-apparel", { name: "Apparel stock positions" });
r("svc-wms", "tracks", "stock-home", { name: "Home & garden stock positions" });
r("svc-inventory", "tracks", "stock-electronics", {
  name: "Sellable availability",
  description:
    "Fulfilment's view of sellable electronics stock, fed by the WMS.",
});
r("svc-inventory", "tracks", "stock-apparel", {
  name: "Sellable availability",
});
r("co-logistics", "supplies", "co-retail", {
  description: "Logistics holds and ships the stock sold by Retail.",
});
r("wh-rotterdam", "supplies", "store-berlin", { name: "Berlin replenishment" });
r("wh-rotterdam", "supplies", "store-munich", { name: "Munich replenishment" });
r("wh-hamburg", "supplies", "store-paris", { name: "Paris replenishment" });
r("stock-electronics", "supplies", "store-berlin");
r("sys-wms", "depends_on", "sys-fulfilment", {
  description: "Order allocation hands picks to the warehouse.",
});
r("sys-pos", "depends_on", "sys-catalog", {
  description: "Prices and product data for tills.",
});
r("sys-pos", "depends_on", "sys-identity", {
  description: "Staff sign-in at the till.",
});
r("sys-data", "reads_from", "sys-erp");
r("sys-data", "reads_from", "sys-pos");
r("sys-pos", "runs_on", "sys-platform");
r("sys-wms", "runs_on", "sys-platform");
r("sys-erp", "runs_on", "sys-platform");
r("sys-hr", "runs_on", "sys-platform");
r("app-till", "calls", "svc-pos");
r("svc-pos", "writes_to", "db-pos");
r("app-scanner", "calls", "svc-wms");
r("svc-wms", "writes_to", "db-wms");
r("svc-wms", "writes_to", "cache-wms");
r("svc-erp", "writes_to", "db-erp");
r("app-hr", "calls", "svc-hr");
r("svc-hr", "writes_to", "db-hr");
r("svc-hr", "integrates_with", "ext-directory", { name: "Directory sync" });

/* ---------- Infrastructure: from a service down to the hardware ----------
 *
 * Containment already says where machines physically are (data centre > rack > host > machine).
 * These relations say what runs on what:
 *
 *   service <- deployment_of - deployment - runs_on > cluster - has_node > machine
 *   database / cache / queue - hosted_on > machine or server
 *   machine - hosted_on > physical host            (also contained in it)
 *   environment - hosted_on > data centre
 *
 * Every arrow points down the stack, so a trace from a deployment to the hardware follows the
 * arrows all the way.
 */

/* Environments are hosted in a data centre. */
r("env-prod", "hosted_on", "dc-fra1");
r("env-staging", "hosted_on", "dc-fra1");
r("env-dr", "hosted_on", "dc-ams1");

/* Clusters and their nodes. */
r("k8s-prod", "has_node", "vm-k8sp-w1", { name: "Worker node" });
r("k8s-prod", "has_node", "vm-k8sp-w2", { name: "Worker node" });
r("k8s-prod", "has_node", "vm-k8sp-w3", { name: "Worker node" });
r("k8s-stg", "has_node", "vm-k8ss-w1", { name: "Worker node" });
r("k8s-dr", "has_node", "vm-k8sdr-w1", { name: "Worker node" });

/* Virtual machines on their physical hosts. */
const placed = (vm: string, host: string) =>
  r(vm, "hosted_on", host, {
    name: "Virtual machine placement",
    description: "Runs as a virtual machine on this physical host.",
  });
placed("vm-k8sp-w1", "hw-fra-a12-05");
placed("vm-redis-cart-01", "hw-fra-a12-05");
placed("vm-k8sp-w2", "hw-fra-a13-02");
placed("vm-k8ss-w1", "hw-fra-a13-02");
placed("vm-k8sp-w3", "hw-fra-a13-04");
placed("vm-pg-orders-01", "hw-fra-a13-04");
placed("vm-kafka-01", "hw-fra-a13-04");
placed("vm-k8sdr-w1", "hw-ams-b03-01");

/* Servers directly on hardware, with no hypervisor. */
r("srv-mongo-01", "hosted_on", "hw-fra-a12-07", {
  name: "Bare-metal placement",
  description:
    "mongo-prod-01 is a dedicated host: no hypervisor, direct NVMe access for the catalog database.",
});
r("srv-mongo-02", "hosted_on", "hw-ams-b03-02", {
  name: "Bare-metal placement",
  description:
    "mongo-prod-02 is a dedicated host in Amsterdam: the replica of the catalog database.",
});
r("srv-mongo-01", "replicates_to", "srv-mongo-02", {
  name: "Replica set replication",
  description:
    "The Amsterdam replica keeps a copy of the catalog database for a failover.",
  props: { mode: "asynchronous", lagTargetSeconds: 5 },
});

/* Data stores and platform tools on the machines or the cluster that run them. */
r("cache-cart", "hosted_on", "vm-redis-cart-01");
r("db-orders", "hosted_on", "vm-pg-orders-01");
r("q-order-events", "hosted_on", "vm-kafka-01");
r("obs-prom", "runs_on", "k8s-prod");
r("obs-grafana", "runs_on", "k8s-prod");

/* Network inside a site and between the two sites. */
r("hw-fra-a12-05", "connects_to", "net-tor-a12", {
  props: { speed: "25G", port: "Et12" },
});
r("hw-fra-a12-07", "connects_to", "net-tor-a12", {
  props: { speed: "25G", port: "Et14" },
});
r("hw-fra-a13-02", "connects_to", "net-tor-a13", {
  props: { speed: "25G", port: "Et03" },
});
r("hw-fra-a13-04", "connects_to", "net-tor-a13", {
  props: { speed: "25G", port: "Et05" },
});
r("hw-ams-b03-01", "connects_to", "net-tor-b03", {
  props: { speed: "25G", port: "Et01" },
});
r("hw-ams-b03-02", "connects_to", "net-tor-b03", {
  props: { speed: "25G", port: "Et02" },
});
r("net-tor-a12", "connects_to", "net-core-01", { props: { speed: "100G" } });
r("net-tor-a13", "connects_to", "net-core-01", { props: { speed: "100G" } });
r("net-tor-b03", "connects_to", "net-core-02", { props: { speed: "100G" } });
r("net-core-01", "connects_to", "net-core-02", {
  name: "Inter-site link",
  description: "Dedicated link between Frankfurt and Amsterdam.",
  props: { speed: "10G", latencyMs: 7 },
});
r("obs-prom", "monitors", "hw-fra-a12-07", {
  name: "Hardware exporter",
  description: "Node and IPMI exporters on the bare-metal host.",
});
r("obs-prom", "monitors", "net-core-01");

/* ---------- Business processes: who does them, who they serve, what runs them ---------- */
const sup = (proc: string, target: string, description?: string) =>
  r(proc, "supported_by", target, { description });
const by = (proc: string, role: string) => r(proc, "performed_by", role);
const inv = (proc: string, client: string) => r(proc, "involves", client);

sup("proc-o2c", "sys-checkout", "Checkout turns the cart into a paid order.");
sup("proc-o2c", "sys-storefront");
sup("proc-o2c", "sys-fulfilment");
sup("proc-take-order", "sys-storefront");
sup("proc-take-order", "svc-checkout");
sup(
  "proc-take-payment",
  "svc-payments",
  "Only the Payments Service talks to the provider.",
);
sup("proc-ship", "sys-fulfilment");
sup("proc-invoice", "sys-erp");
sup("proc-returns", "sys-fulfilment");
inv("proc-o2c", "cl-online");
inv("proc-o2c", "cl-wholesale");
inv("proc-take-order", "cl-online");
inv("proc-take-payment", "cl-online");
inv("proc-ship", "cl-online");
inv("proc-o2c", "cl-auditors");
by("proc-returns", "role-support");
by("proc-invoice", "role-finance-ctrl");
by("proc-ship", "role-picker");

sup("proc-fulfil", "sys-wms");
sup("proc-pick", "app-scanner");
sup("proc-dispatch", "sys-fulfilment");
by("proc-pick", "role-picker");
by("proc-fulfil", "role-picker");
inv("proc-fulfil", "cl-wholesale");

sup("proc-p2p", "sys-erp");
sup("proc-approve-po", "sys-erp");
sup("proc-receive", "sys-wms");
sup("proc-pay-supplier", "sys-erp");
by("proc-approve-po", "role-finance-ctrl");
by("proc-pay-supplier", "role-finance-ctrl");

sup("proc-close", "sys-erp");
sup("proc-close", "sys-data");
by("proc-close", "role-finance-ctrl");
inv("proc-close", "cl-auditors");

sup("proc-access", "sys-identity");
sup("proc-access", "sys-hr");
sup("proc-grant", "svc-auth");
sup("proc-review-access", "sys-identity");
sup("proc-remove", "sys-hr");
by("proc-review-access", "role-qa");
inv("proc-access", "cl-auditors");

sup("proc-release", "sys-platform");
sup("proc-build-test", "pipe-checkout");
sup("proc-build-test", "pipe-catalog");
sup("proc-approve-change", "sys-platform");
sup("proc-deploy", "dep-checkout-prod");
by("proc-approve-change", "role-release-mgr");
by("proc-release", "role-qa");
inv("proc-release", "cl-auditors");

sup("proc-catalog", "sys-catalog");
by("proc-catalog", "role-support");

sup("proc-store-ops", "sys-pos");
by("proc-store-ops", "role-store-mgr");
inv("proc-store-ops", "cl-instore");

export const RELATIONS: Relation[] = out;
