import type { GraphNode, Lifecycle, NodeKind, PropValue } from "@/domain/types";

interface Opts {
  lifecycle?: Lifecycle;
  external?: boolean;
  owner?: string;
  tags?: string[];
  props?: Record<string, PropValue>;
}

const out: GraphNode[] = [];

function n(
  id: string,
  kind: NodeKind,
  name: string,
  parentId: string | null,
  summary: string,
  o: Opts = {},
) {
  out.push({
    id,
    kind,
    name,
    summary,
    parentId,
    lifecycle: o.lifecycle ?? "active",
    external: o.external ?? kind === "external",
    ownerId: o.owner,
    tags: o.tags ?? [],
    props: o.props ?? {},
  });
}

/* ---------------- Teams ---------------- */
n("team-checkout", "team", "Checkout Team", null, "Owns the purchase flow: cart, checkout and payments.", { tags: ["payments", "squad"] });
n("team-catalog", "team", "Catalog Team", null, "Owns product data, search and merchandising feeds.", { tags: ["catalog", "squad"] });
n("team-platform", "team", "Platform Team", null, "Owns CI/CD, Kubernetes, observability and shared infrastructure.", { tags: ["platform", "sre"] });
n("team-growth", "team", "Growth Team", null, "Owns the storefront experience and conversion.", { tags: ["frontend", "squad"] });
n("team-identity", "team", "Identity Team", null, "Owns authentication, authorisation and directory integration.", { tags: ["security"] });
n("team-fulfilment", "team", "Fulfilment Team", null, "Owns orders, inventory and shipping.", { tags: ["logistics", "squad"] });
n("team-data", "team", "Data Team", null, "Owns the warehouse, ETL and reporting.", { tags: ["analytics"] });

/* ---------------- Systems ---------------- */
n("sys-storefront", "system", "Storefront", null, "Customer-facing web and mobile shopping experience.", { owner: "team-growth", tags: ["customer-facing", "tier-1"] });
n("sys-checkout", "system", "Checkout & Payments", null, "Cart, checkout orchestration and payment processing.", { owner: "team-checkout", tags: ["revenue-critical", "pci", "tier-1"] });
n("sys-catalog", "system", "Product Catalog", null, "Product data, categories, pricing and search.", { owner: "team-catalog", tags: ["tier-1"] });
n("sys-identity", "system", "Identity & Access", null, "Customer and staff authentication and authorisation.", { owner: "team-identity", tags: ["security", "tier-1"] });
n("sys-fulfilment", "system", "Order Fulfilment", null, "Order lifecycle, stock reservation and shipping.", { owner: "team-fulfilment", tags: ["tier-2"] });
n("sys-data", "system", "Data & Analytics", null, "Warehouse, ETL and business reporting.", { owner: "team-data", tags: ["tier-3", "reporting"] });
n("sys-platform", "system", "Delivery & Platform", null, "Environments, clusters, servers and observability tooling shared by all systems.", { owner: "team-platform", tags: ["shared", "tier-1"] });

/* ---------------- Storefront ---------------- */
n("app-web", "ui-app", "Web Storefront", "sys-storefront", "Next.js storefront served to customers on the web.", { owner: "team-growth", props: { framework: "Next.js 16", rendering: "SSR + ISR" }, tags: ["frontend"] });
n("app-mobile", "ui-app", "Mobile App", "sys-storefront", "React Native shopping app for iOS and Android.", { owner: "team-growth", props: { framework: "React Native", platforms: "iOS, Android" }, tags: ["frontend", "mobile"] });
n("svc-bff", "service", "Storefront BFF", "sys-storefront", "Backend-for-frontend that aggregates catalog, cart and auth for the clients.", { owner: "team-growth", props: { language: "TypeScript", runtime: "Node 22" }, tags: ["bff"] });
n("api-bff", "api", "BFF GraphQL API", "svc-bff", "Single GraphQL endpoint consumed by web and mobile.", { owner: "team-growth", props: { protocol: "GraphQL", version: "v3" } });
n("repo-web", "repository", "storefront-web", "sys-storefront", "Monorepo containing the web app, BFF and shared UI.", { owner: "team-growth", props: { host: "GitHub", defaultBranch: "main" } });
n("lib-design", "library", "Design System", "sys-storefront", "Shared React component library and design tokens.", { owner: "team-growth", props: { package: "@northwind/ui" }, tags: ["frontend"] });

/* ---------------- Checkout & Payments ---------------- */
n("svc-cart", "service", "Cart Service", "sys-checkout", "Maintains customer carts and applies promotions.", { owner: "team-checkout", props: { language: "Go", runtime: "Go 1.24" } });
n("svc-checkout", "service", "Checkout Service", "sys-checkout", "Orchestrates cart validation, payment and order creation.", { owner: "team-checkout", props: { language: "Go", runtime: "Go 1.24", slo: "99.95%" }, tags: ["revenue-critical"] });
n("svc-payments", "service", "Payments Service", "sys-checkout", "Authorises, captures and refunds payments through the payment provider.", { owner: "team-checkout", props: { language: "Go", pci: true }, tags: ["pci", "revenue-critical"] });
n("api-checkout", "api", "Checkout REST API", "svc-checkout", "Public REST API used to start and complete a checkout.", { owner: "team-checkout", props: { protocol: "REST/JSON", version: "v2" } });
n("api-payments", "api", "Payments Internal API", "svc-payments", "Internal gRPC API used by the checkout service.", { owner: "team-checkout", props: { protocol: "gRPC", version: "v1" } });
n("cache-cart", "cache", "Cart Redis", "sys-checkout", "Redis cluster holding active carts with a 7 day TTL.", { owner: "team-checkout", props: { engine: "Redis 7", persistence: "AOF" } });
n("repo-checkout", "repository", "checkout-platform", "sys-checkout", "Go monorepo for cart, checkout and payments services.", { owner: "team-checkout", props: { host: "GitHub", defaultBranch: "main" } });
n("pipe-checkout", "pipeline", "checkout-ci", "sys-checkout", "Builds, tests, scans and publishes checkout images.", { owner: "team-checkout", props: { provider: "GitHub Actions" } });
n("img-checkout", "image", "checkout:1.42.0", "sys-checkout", "Container image for the checkout service.", { owner: "team-checkout", props: { registry: "ghcr.io/northwind", digest: "sha256:9f2c…e41a" } });
n("dep-checkout-prod", "deployment", "checkout @ production", "sys-checkout", "Production deployment of the checkout service (6 replicas).", { owner: "team-checkout", props: { replicas: 6, strategy: "RollingUpdate" } });
n("dep-checkout-stg", "deployment", "checkout @ staging", "sys-checkout", "Staging deployment of the checkout service (2 replicas).", { owner: "team-checkout", props: { replicas: 2 } });
n("ext-stripe", "external", "Stripe", "sys-checkout", "Third-party payment processor. Managed by Stripe, owned commercially by Finance.", { external: true, props: { contact: "Finance", contract: "Enterprise" }, tags: ["vendor", "pci"] });

/* ---------------- Product Catalog ---------------- */
n("svc-catalog", "service", "Catalog Service", "sys-catalog", "Source of product, category and price data.", { owner: "team-catalog", props: { language: "TypeScript", runtime: "Node 22" } });
n("svc-search", "service", "Search Service", "sys-catalog", "Full-text and faceted product search.", { owner: "team-catalog", props: { language: "Java", runtime: "JVM 21" } });
n("api-catalog", "api", "Catalog GraphQL API", "svc-catalog", "Read API for products, categories and prices.", { owner: "team-catalog", props: { protocol: "GraphQL", version: "v2" } });
n("db-catalog", "database", "Catalog MongoDB", "sys-catalog", "Primary datastore for catalog data.", { owner: "team-catalog", props: { engine: "MongoDB 8", topology: "3-node replica set" } });
n("tbl-products", "table", "products", "db-catalog", "Product documents including variants and pricing.", { owner: "team-catalog", props: { documents: "1.2M" } });
n("tbl-categories", "table", "categories", "db-catalog", "Category tree used for navigation and facets.", { owner: "team-catalog", props: { documents: "4.1k" } });
n("idx-search", "database", "Search Index", "sys-catalog", "OpenSearch index serving product search.", { owner: "team-catalog", props: { engine: "OpenSearch 3", shards: 6 } });
n("repo-catalog", "repository", "catalog-platform", "sys-catalog", "Repository for catalog and search services.", { owner: "team-catalog", props: { host: "GitHub", defaultBranch: "main" } });
n("pipe-catalog", "pipeline", "catalog-ci", "sys-catalog", "Builds and publishes catalog and search images.", { owner: "team-catalog", props: { provider: "GitHub Actions" } });
n("img-catalog", "image", "catalog:3.8.1", "sys-catalog", "Container image for the catalog service.", { owner: "team-catalog", props: { registry: "ghcr.io/northwind" } });
n("dep-catalog-prod", "deployment", "catalog @ production", "sys-catalog", "Production deployment of the catalog service (4 replicas).", { owner: "team-catalog", props: { replicas: 4 } });

/* ---------------- Identity & Access ---------------- */
n("svc-auth", "service", "Auth Service", "sys-identity", "OIDC provider issuing tokens for customers and staff.", { owner: "team-identity", props: { language: "Kotlin", runtime: "JVM 21" }, tags: ["security"] });
n("api-auth", "api", "Auth OIDC API", "svc-auth", "OIDC and token introspection endpoints.", { owner: "team-identity", props: { protocol: "OIDC / OAuth 2.1" } });
n("db-identity", "database", "Identity DB", "sys-identity", "Stores accounts, credentials hashes and consents.", { owner: "team-identity", props: { engine: "PostgreSQL 17" }, tags: ["pii"] });
n("tbl-users", "table", "users", "db-identity", "Customer and staff accounts.", { owner: "team-identity", tags: ["pii"], props: { rows: "3.4M" } });
n("tbl-roles", "table", "roles", "db-identity", "Role definitions and permission sets.", { owner: "team-identity", props: { rows: 42 } });
n("ext-directory", "external", "Corporate LDAP", "sys-identity", "Enterprise directory for staff identities, managed by IT.", { external: true, props: { managedBy: "IT Operations" }, tags: ["directory"] });

/* ---------------- Order Fulfilment ---------------- */
n("svc-orders", "service", "Order Service", "sys-fulfilment", "Owns the order lifecycle from creation to delivery.", { owner: "team-fulfilment", props: { language: "Java", runtime: "JVM 21" } });
n("svc-inventory", "service", "Inventory Service", "sys-fulfilment", "Tracks stock levels and reservations.", { owner: "team-fulfilment", props: { language: "Java", runtime: "JVM 21" } });
n("svc-shipping", "service", "Shipping Service", "sys-fulfilment", "Creates shipments and tracks carrier events.", { owner: "team-fulfilment", props: { language: "TypeScript" } });
n("api-orders", "api", "Orders REST API", "svc-orders", "Read and update orders.", { owner: "team-fulfilment", props: { protocol: "REST/JSON", version: "v1" } });
n("db-orders", "database", "Orders DB", "sys-fulfilment", "Relational store for orders and order items.", { owner: "team-fulfilment", props: { engine: "PostgreSQL 17" } });
n("tbl-orders", "table", "orders", "db-orders", "One row per customer order.", { owner: "team-fulfilment", props: { rows: "18M" } });
n("tbl-order-items", "table", "order_items", "db-orders", "Line items belonging to an order.", { owner: "team-fulfilment", props: { rows: "61M" } });
n("q-order-events", "queue", "order-events", "sys-fulfilment", "Kafka topic carrying order lifecycle events.", { owner: "team-fulfilment", props: { engine: "Kafka", partitions: 12, retention: "7d" } });
n("ext-carrier", "external", "Carrier API (DHL)", "sys-fulfilment", "Shipping carrier API for labels and tracking.", { external: true, props: { managedBy: "DHL" }, tags: ["vendor"] });
n("svc-legacy-notify", "service", "Legacy Notifier", "sys-fulfilment", "Sends order emails through the old SMTP relay. Being replaced.", { owner: "team-fulfilment", lifecycle: "deprecated", props: { language: "PHP" }, tags: ["legacy"] });

/* ---------------- Data & Analytics ---------------- */
n("svc-etl", "service", "ETL Service", "sys-data", "Nightly and streaming extraction into the warehouse.", { owner: "team-data", props: { language: "Python" } });
n("db-warehouse", "database", "Analytics Warehouse", "sys-data", "Columnar warehouse for reporting.", { owner: "team-data", props: { engine: "ClickHouse" } });
n("tbl-fact-sales", "table", "fact_sales", "db-warehouse", "Grain: one row per order line.", { owner: "team-data", props: { rows: "420M" } });
n("dash-sales", "dashboard", "Sales Dashboard", "sys-data", "Executive revenue and conversion dashboard.", { owner: "team-data", tags: ["reporting"] });
n("proposed-recs", "service", "Recommendations Service", "sys-catalog", "Proposed personalised recommendations. Not yet built.", { owner: "team-catalog", lifecycle: "proposed", props: { language: "Python" }, tags: ["proposal"] });

/* ---------------- Delivery & Platform ---------------- */
n("env-prod", "environment", "Production", "sys-platform", "Customer-facing production environment.", { owner: "team-platform", props: { region: "eu-central-1" } });
n("env-staging", "environment", "Staging", "sys-platform", "Pre-production verification environment.", { owner: "team-platform", props: { region: "eu-central-1" } });
n("k8s-prod", "cluster", "k8s-prod", "sys-platform", "Production Kubernetes cluster.", { owner: "team-platform", props: { version: "1.33", nodes: 24 } });
n("k8s-stg", "cluster", "k8s-staging", "sys-platform", "Staging Kubernetes cluster.", { owner: "team-platform", props: { version: "1.33", nodes: 6 } });
n("srv-mongo-01", "server", "mongo-prod-01", "sys-platform", "Primary MongoDB host for the catalog database.", { owner: "team-platform", props: { os: "Ubuntu 24.04", cpu: 16, ramGb: 64 } });
n("obs-prom", "observability", "Prometheus", "sys-platform", "Metrics collection and alert evaluation.", { owner: "team-platform", props: { retention: "30d" } });
n("obs-grafana", "observability", "Grafana", "sys-platform", "Dashboards for metrics and logs.", { owner: "team-platform" });

export const NODES: GraphNode[] = out;
