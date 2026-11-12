import type { PropValue, Relation, RelationType } from "@/domain/types";

/** Stable relation ids make fixtures and documents easy to reference. */
export function relId(source: string, type: RelationType, target: string): string {
  return `${source}__${type}__${target}`;
}

const out: Relation[] = [];

function r(
  source: string,
  type: RelationType,
  target: string,
  extra: { name?: string; description?: string; props?: Record<string, PropValue> } = {},
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
r("sys-storefront", "depends_on", "sys-checkout", { description: "Storefront hands the customer over to checkout." });
r("sys-storefront", "depends_on", "sys-catalog", { description: "Product pages and listings come from the catalog." });
r("sys-storefront", "depends_on", "sys-identity", { description: "Customer sign-in and sessions." });
r("sys-checkout", "depends_on", "sys-fulfilment", { description: "Completed checkouts become orders.", props: { mode: "async" } });
r("sys-checkout", "depends_on", "sys-catalog", { description: "Price and availability validation." });
r("sys-fulfilment", "depends_on", "sys-catalog", { description: "Product identifiers and dimensions." });
r("sys-data", "reads_from", "sys-fulfilment");
r("sys-data", "reads_from", "sys-catalog");
r("sys-storefront", "runs_on", "sys-platform");
r("sys-checkout", "runs_on", "sys-platform");
r("sys-catalog", "runs_on", "sys-platform");

/* ---------- Storefront ---------- */
r("app-web", "calls", "api-bff", { props: { protocol: "GraphQL over HTTPS" } });
r("app-mobile", "calls", "api-bff", { props: { protocol: "GraphQL over HTTPS" } });
r("app-web", "depends_on", "lib-design");
r("svc-bff", "exposes", "api-bff");
r("svc-bff", "calls", "api-catalog", { name: "Product queries", props: { protocol: "GraphQL", timeoutMs: 800 } });
r("svc-bff", "calls", "api-checkout", { name: "Start and complete checkout", props: { protocol: "REST/JSON", timeoutMs: 3000 } });
r("svc-bff", "calls", "api-auth", { name: "Token validation", props: { protocol: "OIDC introspection" } });
r("svc-bff", "implemented_in", "repo-web");
r("app-web", "implemented_in", "repo-web");

/* ---------- Checkout & Payments ---------- */
r("svc-checkout", "exposes", "api-checkout");
r("svc-payments", "exposes", "api-payments");
r("svc-checkout", "calls", "api-payments", {
  name: "Payment authorisation",
  description: "Checkout requests an authorisation and later a capture for the cart total.",
  props: { protocol: "gRPC", timeoutMs: 5000, retries: 0, idempotent: true },
});
r("svc-checkout", "calls", "svc-cart", { name: "Load and lock cart", props: { protocol: "gRPC" } });
r("svc-cart", "writes_to", "cache-cart");
r("svc-cart", "reads_from", "cache-cart");
r("svc-checkout", "calls", "api-catalog", { name: "Price validation", props: { protocol: "GraphQL", timeoutMs: 800 } });
r("svc-checkout", "publishes_to", "q-order-events", {
  name: "OrderPlaced event",
  description: "Published once payment is captured. The topic is the contract between checkout and fulfilment.",
  props: { schema: "OrderPlaced v3", delivery: "at-least-once" },
});
r("svc-payments", "integrates_with", "ext-stripe", {
  name: "Payment provider integration",
  description: "Card authorisation, capture, refunds and webhooks.",
  props: { protocol: "HTTPS REST + webhooks", auth: "API key + signed webhooks", pci: true },
});
r("svc-checkout", "implemented_in", "repo-checkout");
r("svc-cart", "implemented_in", "repo-checkout");
r("svc-payments", "implemented_in", "repo-checkout");
r("repo-checkout", "triggers", "pipe-checkout");
r("pipe-checkout", "produces", "img-checkout");
r("dep-checkout-prod", "runs", "img-checkout");
r("dep-checkout-stg", "runs", "img-checkout");
r("dep-checkout-prod", "deployment_of", "svc-checkout");
r("dep-checkout-stg", "deployment_of", "svc-checkout");
r("dep-checkout-prod", "deployed_to", "env-prod");
r("dep-checkout-stg", "deployed_to", "env-staging");
r("dep-checkout-prod", "runs_on", "k8s-prod");
r("dep-checkout-stg", "runs_on", "k8s-stg");

/* ---------- Catalog ---------- */
r("svc-catalog", "exposes", "api-catalog");
r("svc-catalog", "reads_from", "tbl-products");
r("svc-catalog", "writes_to", "tbl-products");
r("svc-catalog", "writes_to", "tbl-categories");
r("svc-catalog", "writes_to", "idx-search", {
  name: "Search index sync",
  description: "Catalog changes are pushed to the search index through change streams.",
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
  description: "Staff identities are authenticated against LDAP and mapped to roles.",
  props: { protocol: "LDAPS", syncInterval: "15m" },
});

/* ---------- Fulfilment ---------- */
r("svc-orders", "exposes", "api-orders");
r("svc-orders", "consumes_from", "q-order-events", {
  name: "OrderPlaced consumer",
  description: "Creates the order record and starts stock reservation.",
  props: { consumerGroup: "orders-v3", ordering: "per order id" },
});
r("svc-shipping", "consumes_from", "q-order-events", { name: "Shipment trigger", props: { consumerGroup: "shipping-v2" } });
r("svc-legacy-notify", "consumes_from", "q-order-events", { name: "Email notifications", props: { consumerGroup: "notify-legacy" } });
r("svc-orders", "writes_to", "tbl-orders");
r("svc-orders", "writes_to", "tbl-order-items");
r("tbl-order-items", "references", "tbl-orders", { name: "orderId" });
r("svc-orders", "calls", "svc-inventory", { name: "Reserve stock", props: { protocol: "gRPC" } });
r("svc-inventory", "reads_from", "tbl-products", { name: "Product identifiers", description: "Inventory reads product ids directly from the catalog database. Flagged for replacement with an API call." });
r("svc-shipping", "integrates_with", "ext-carrier", { name: "Carrier labels & tracking", props: { protocol: "HTTPS REST", auth: "OAuth client credentials" } });
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

export const RELATIONS: Relation[] = out;
