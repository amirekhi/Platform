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

/* ---------------- Organisation ---------------- */
n(
  "co-group",
  "company",
  "Northwind Group",
  null,
  "Holding company. Owns corporate IT, finance, HR and the primary data centre.",
  { tags: ["holding"], props: { employees: 5200, hq: "Frankfurt" } },
);
n(
  "co-retail",
  "company",
  "Northwind Retail",
  null,
  "Online and physical retail brand with stores in Germany and France.",
  { tags: ["retail"], props: { employees: 2900, brands: 2 } },
);
n(
  "co-logistics",
  "company",
  "Northwind Logistics",
  null,
  "Warehousing and last-mile delivery for the group.",
  { tags: ["logistics"], props: { employees: 1400, warehouses: 2 } },
);
n(
  "dept-it",
  "department",
  "IT & Operations",
  "co-group",
  "Platform, identity, data and corporate IT.",
  { tags: ["it"] },
);
n(
  "dept-finance",
  "department",
  "Finance",
  "co-group",
  "Accounting, treasury and reporting.",
  { tags: ["finance"] },
);
n(
  "dept-hr",
  "department",
  "People & HR",
  "co-group",
  "Recruiting, payroll and people operations.",
  { tags: ["hr"] },
);
n(
  "dept-ecom",
  "department",
  "E-commerce",
  "co-retail",
  "Online storefront, checkout and catalog.",
  { tags: ["ecommerce"] },
);

/* ---------------- Physical: buildings, stores, warehouses, stock ---------------- */
n(
  "bld-hq",
  "building",
  "Frankfurt HQ",
  "co-group",
  "Group headquarters, 14 floors, 1,900 desks.",
  { props: { city: "Frankfurt", floors: 14 }, tags: ["office"] },
);
n(
  "store-berlin",
  "store",
  "Berlin Alexanderplatz",
  "co-retail",
  "Flagship store, 3 floors, 22 tills.",
  { props: { city: "Berlin", tills: 22 }, tags: ["flagship"] },
);
n(
  "store-munich",
  "store",
  "Munich Marienplatz",
  "co-retail",
  "City-centre store, 12 tills.",
  { props: { city: "Munich", tills: 12 } },
);
n(
  "store-paris",
  "store",
  "Paris Rivoli",
  "co-retail",
  "French flagship, 16 tills.",
  { props: { city: "Paris", tills: 16 } },
);
n(
  "wh-rotterdam",
  "warehouse",
  "Rotterdam Fulfilment Centre",
  "co-logistics",
  "Main e-commerce warehouse, 38,000 m2.",
  { props: { city: "Rotterdam", areaM2: 38000 } },
);
n(
  "wh-hamburg",
  "warehouse",
  "Hamburg Warehouse",
  "co-logistics",
  "Regional warehouse for the north.",
  { props: { city: "Hamburg", areaM2: 14000 } },
);
n(
  "stock-electronics",
  "stock",
  "Electronics stock",
  "wh-rotterdam",
  "Inventory of consumer electronics. About 41,000 SKUs on hand.",
  { props: { skus: 41000, valueEur: "18.2M" }, tags: ["inventory"] },
);
n(
  "stock-apparel",
  "stock",
  "Apparel stock",
  "wh-rotterdam",
  "Inventory of clothing and shoes with seasonal turnover.",
  { props: { skus: 92000, valueEur: "9.6M" }, tags: ["inventory"] },
);
n(
  "stock-home",
  "stock",
  "Home & garden stock",
  "wh-hamburg",
  "Bulky household goods.",
  { props: { skus: 12000, valueEur: "4.1M" }, tags: ["inventory"] },
);

/* ---------------- Physical: data centre down to bare metal ---------------- */
n(
  "dc-fra1",
  "datacenter",
  "Frankfurt DC FRA1",
  "co-group",
  "Primary data centre: 2 halls, N+1 power, 14 racks.",
  {
    owner: "team-platform",
    props: { tier: "III", powerKw: 480, location: "Frankfurt" },
  },
);
n(
  "rack-fra-a12",
  "rack",
  "Rack FRA1-A12",
  "dc-fra1",
  "Compute rack, 42U. Hosts production database and Kubernetes workers.",
  { owner: "team-platform", props: { units: 42, usedU: 31 } },
);
n(
  "rack-fra-a13",
  "rack",
  "Rack FRA1-A13",
  "dc-fra1",
  "Compute rack, 42U. Kubernetes workers and staging.",
  { owner: "team-platform", props: { units: 42, usedU: 24 } },
);
n(
  "hw-fra-a12-05",
  "hardware",
  "dell-r760-a12-05",
  "rack-fra-a12",
  "Dell PowerEdge R760. Kubernetes worker.",
  {
    owner: "team-platform",
    props: { cpu: "2x Xeon 6430", ramGb: 512, serial: "7XK2M93" },
  },
);
n(
  "hw-fra-a12-07",
  "hardware",
  "dell-r760-a12-07",
  "rack-fra-a12",
  "Dell PowerEdge R760. Hosts the primary MongoDB server (mongo-prod-01).",
  {
    owner: "team-platform",
    props: {
      cpu: "2x Xeon 6430",
      ramGb: 512,
      nvme: "8x 3.84TB",
      serial: "7XK2P10",
    },
  },
);
n(
  "hw-fra-a13-02",
  "hardware",
  "dell-r760-a13-02",
  "rack-fra-a13",
  "Dell PowerEdge R760. Kubernetes worker for production and staging.",
  {
    owner: "team-platform",
    props: { cpu: "2x Xeon 6430", ramGb: 256, serial: "7XK2Q55" },
  },
);
n(
  "net-tor-a12",
  "network",
  "Switch TOR-A12",
  "rack-fra-a12",
  "Top-of-rack switch, 48x25G + 6x100G.",
  { owner: "team-platform", props: { model: "Arista 7050X3", ports: 54 } },
);
n(
  "net-tor-a13",
  "network",
  "Switch TOR-A13",
  "rack-fra-a13",
  "Top-of-rack switch, 48x25G + 6x100G.",
  { owner: "team-platform", props: { model: "Arista 7050X3", ports: 54 } },
);
n(
  "net-core-01",
  "network",
  "Core router CORE-01",
  "dc-fra1",
  "Core router with uplinks to the internet and the offices.",
  {
    owner: "team-platform",
    props: { model: "Juniper MX304", uplinks: "2x100G" },
  },
);

/* ---------------- Teams ---------------- */
n(
  "team-checkout",
  "team",
  "Checkout Team",
  "dept-ecom",
  "Owns the purchase flow: cart, checkout and payments.",
  { tags: ["payments", "squad"] },
);
n(
  "team-catalog",
  "team",
  "Catalog Team",
  "dept-ecom",
  "Owns product data, search and merchandising feeds.",
  { tags: ["catalog", "squad"] },
);
n(
  "team-platform",
  "team",
  "Platform Team",
  "dept-it",
  "Owns CI/CD, Kubernetes, observability and shared infrastructure.",
  { tags: ["platform", "sre"] },
);
n(
  "team-growth",
  "team",
  "Growth Team",
  "dept-ecom",
  "Owns the storefront experience and conversion.",
  { tags: ["frontend", "squad"] },
);
n(
  "team-identity",
  "team",
  "Identity Team",
  "dept-it",
  "Owns authentication, authorisation and directory integration.",
  { tags: ["security"] },
);
n(
  "team-fulfilment",
  "team",
  "Fulfilment Team",
  "co-logistics",
  "Owns orders, inventory and shipping.",
  { tags: ["logistics", "squad"] },
);
n(
  "team-data",
  "team",
  "Data Team",
  "dept-it",
  "Owns the warehouse, ETL and reporting.",
  { tags: ["analytics"] },
);

n(
  "team-corp",
  "team",
  "Corporate Systems Team",
  "dept-it",
  "Owns ERP, HR and other corporate applications.",
  { tags: ["corporate"] },
);
n(
  "team-retailops",
  "team",
  "Retail Operations Tech",
  "dept-ecom",
  "Owns the in-store point-of-sale estate.",
  { tags: ["stores"] },
);

/* ---------------- Systems ---------------- */
n(
  "sys-storefront",
  "system",
  "Storefront",
  null,
  "Customer-facing web and mobile shopping experience.",
  { owner: "team-growth", tags: ["customer-facing", "tier-1"] },
);
n(
  "sys-checkout",
  "system",
  "Checkout & Payments",
  null,
  "Cart, checkout orchestration and payment processing.",
  { owner: "team-checkout", tags: ["revenue-critical", "pci", "tier-1"] },
);
n(
  "sys-catalog",
  "system",
  "Product Catalog",
  null,
  "Product data, categories, pricing and search.",
  { owner: "team-catalog", tags: ["tier-1"] },
);
n(
  "sys-identity",
  "system",
  "Identity & Access",
  null,
  "Customer and staff authentication and authorisation.",
  { owner: "team-identity", tags: ["security", "tier-1"] },
);
n(
  "sys-fulfilment",
  "system",
  "Order Fulfilment",
  null,
  "Order lifecycle, stock reservation and shipping.",
  { owner: "team-fulfilment", tags: ["tier-2"] },
);
n(
  "sys-data",
  "system",
  "Data & Analytics",
  null,
  "Warehouse, ETL and business reporting.",
  { owner: "team-data", tags: ["tier-3", "reporting"] },
);
n(
  "sys-platform",
  "system",
  "Delivery & Platform",
  null,
  "Environments, clusters, servers and observability tooling shared by all systems.",
  { owner: "team-platform", tags: ["shared", "tier-1"] },
);

/* ---------------- Storefront ---------------- */
n(
  "app-web",
  "ui-app",
  "Web Storefront",
  "sys-storefront",
  "Next.js storefront served to customers on the web.",
  {
    owner: "team-growth",
    props: { framework: "Next.js 16", rendering: "SSR + ISR" },
    tags: ["frontend"],
  },
);
n(
  "app-mobile",
  "ui-app",
  "Mobile App",
  "sys-storefront",
  "React Native shopping app for iOS and Android.",
  {
    owner: "team-growth",
    props: { framework: "React Native", platforms: "iOS, Android" },
    tags: ["frontend", "mobile"],
  },
);
n(
  "svc-bff",
  "service",
  "Storefront BFF",
  "sys-storefront",
  "Backend-for-frontend that aggregates catalog, cart and auth for the clients.",
  {
    owner: "team-growth",
    props: { language: "TypeScript", runtime: "Node 22" },
    tags: ["bff"],
  },
);
n(
  "api-bff",
  "api",
  "BFF GraphQL API",
  "svc-bff",
  "Single GraphQL endpoint consumed by web and mobile.",
  { owner: "team-growth", props: { protocol: "GraphQL", version: "v3" } },
);
n(
  "repo-web",
  "repository",
  "storefront-web",
  "sys-storefront",
  "Monorepo containing the web app, BFF and shared UI.",
  { owner: "team-growth", props: { host: "GitHub", defaultBranch: "main" } },
);
n(
  "lib-design",
  "library",
  "Design System",
  "sys-storefront",
  "Shared React component library and design tokens.",
  {
    owner: "team-growth",
    props: { package: "@northwind/ui" },
    tags: ["frontend"],
  },
);

/* ---------------- Checkout & Payments ---------------- */
n(
  "svc-cart",
  "service",
  "Cart Service",
  "sys-checkout",
  "Maintains customer carts and applies promotions.",
  { owner: "team-checkout", props: { language: "Go", runtime: "Go 1.24" } },
);
n(
  "svc-checkout",
  "service",
  "Checkout Service",
  "sys-checkout",
  "Orchestrates cart validation, payment and order creation.",
  {
    owner: "team-checkout",
    props: { language: "Go", runtime: "Go 1.24", slo: "99.95%" },
    tags: ["revenue-critical"],
  },
);
n(
  "svc-payments",
  "service",
  "Payments Service",
  "sys-checkout",
  "Authorises, captures and refunds payments through the payment provider.",
  {
    owner: "team-checkout",
    props: { language: "Go", pci: true },
    tags: ["pci", "revenue-critical"],
  },
);
n(
  "api-checkout",
  "api",
  "Checkout REST API",
  "svc-checkout",
  "Public REST API used to start and complete a checkout.",
  { owner: "team-checkout", props: { protocol: "REST/JSON", version: "v2" } },
);
n(
  "api-payments",
  "api",
  "Payments Internal API",
  "svc-payments",
  "Internal gRPC API used by the checkout service.",
  { owner: "team-checkout", props: { protocol: "gRPC", version: "v1" } },
);
n(
  "cache-cart",
  "cache",
  "Cart Redis",
  "sys-checkout",
  "Redis cluster holding active carts with a 7 day TTL.",
  { owner: "team-checkout", props: { engine: "Redis 7", persistence: "AOF" } },
);
n(
  "repo-checkout",
  "repository",
  "checkout-platform",
  "sys-checkout",
  "Go monorepo for cart, checkout and payments services.",
  { owner: "team-checkout", props: { host: "GitHub", defaultBranch: "main" } },
);
n(
  "pipe-checkout",
  "pipeline",
  "checkout-ci",
  "sys-checkout",
  "Builds, tests, scans and publishes checkout images.",
  { owner: "team-checkout", props: { provider: "GitHub Actions" } },
);
n(
  "img-checkout",
  "image",
  "checkout:1.42.0",
  "sys-checkout",
  "Container image for the checkout service.",
  {
    owner: "team-checkout",
    props: { registry: "ghcr.io/northwind", digest: "sha256:9f2c…e41a" },
  },
);
n(
  "dep-checkout-prod",
  "deployment",
  "checkout @ production",
  "sys-checkout",
  "Production deployment of the checkout service (6 replicas).",
  { owner: "team-checkout", props: { replicas: 6, strategy: "RollingUpdate" } },
);
n(
  "dep-checkout-stg",
  "deployment",
  "checkout @ staging",
  "sys-checkout",
  "Staging deployment of the checkout service (2 replicas).",
  { owner: "team-checkout", props: { replicas: 2 } },
);
n(
  "ext-stripe",
  "external",
  "Stripe",
  "sys-checkout",
  "Third-party payment processor. Managed by Stripe, owned commercially by Finance.",
  {
    external: true,
    props: { contact: "Finance", contract: "Enterprise" },
    tags: ["vendor", "pci"],
  },
);

/* ---------------- Product Catalog ---------------- */
n(
  "svc-catalog",
  "service",
  "Catalog Service",
  "sys-catalog",
  "Source of product, category and price data.",
  {
    owner: "team-catalog",
    props: { language: "TypeScript", runtime: "Node 22" },
  },
);
n(
  "svc-search",
  "service",
  "Search Service",
  "sys-catalog",
  "Full-text and faceted product search.",
  { owner: "team-catalog", props: { language: "Java", runtime: "JVM 21" } },
);
n(
  "api-catalog",
  "api",
  "Catalog GraphQL API",
  "svc-catalog",
  "Read API for products, categories and prices.",
  { owner: "team-catalog", props: { protocol: "GraphQL", version: "v2" } },
);
n(
  "db-catalog",
  "database",
  "Catalog MongoDB",
  "sys-catalog",
  "Primary datastore for catalog data.",
  {
    owner: "team-catalog",
    props: { engine: "MongoDB 8", topology: "3-node replica set" },
  },
);
n(
  "tbl-products",
  "table",
  "products",
  "db-catalog",
  "Product documents including variants and pricing.",
  { owner: "team-catalog", props: { documents: "1.2M" } },
);
n(
  "tbl-categories",
  "table",
  "categories",
  "db-catalog",
  "Category tree used for navigation and facets.",
  { owner: "team-catalog", props: { documents: "4.1k" } },
);
n(
  "idx-search",
  "database",
  "Search Index",
  "sys-catalog",
  "OpenSearch index serving product search.",
  { owner: "team-catalog", props: { engine: "OpenSearch 3", shards: 6 } },
);
n(
  "repo-catalog",
  "repository",
  "catalog-platform",
  "sys-catalog",
  "Repository for catalog and search services.",
  { owner: "team-catalog", props: { host: "GitHub", defaultBranch: "main" } },
);
n(
  "pipe-catalog",
  "pipeline",
  "catalog-ci",
  "sys-catalog",
  "Builds and publishes catalog and search images.",
  { owner: "team-catalog", props: { provider: "GitHub Actions" } },
);
n(
  "img-catalog",
  "image",
  "catalog:3.8.1",
  "sys-catalog",
  "Container image for the catalog service.",
  { owner: "team-catalog", props: { registry: "ghcr.io/northwind" } },
);
n(
  "dep-catalog-prod",
  "deployment",
  "catalog @ production",
  "sys-catalog",
  "Production deployment of the catalog service (4 replicas).",
  { owner: "team-catalog", props: { replicas: 4 } },
);

/* ---------------- Identity & Access ---------------- */
n(
  "svc-auth",
  "service",
  "Auth Service",
  "sys-identity",
  "OIDC provider issuing tokens for customers and staff.",
  {
    owner: "team-identity",
    props: { language: "Kotlin", runtime: "JVM 21" },
    tags: ["security"],
  },
);
n(
  "api-auth",
  "api",
  "Auth OIDC API",
  "svc-auth",
  "OIDC and token introspection endpoints.",
  { owner: "team-identity", props: { protocol: "OIDC / OAuth 2.1" } },
);
n(
  "db-identity",
  "database",
  "Identity DB",
  "sys-identity",
  "Stores accounts, credentials hashes and consents.",
  { owner: "team-identity", props: { engine: "PostgreSQL 17" }, tags: ["pii"] },
);
n(
  "tbl-users",
  "table",
  "users",
  "db-identity",
  "Customer and staff accounts.",
  { owner: "team-identity", tags: ["pii"], props: { rows: "3.4M" } },
);
n(
  "tbl-roles",
  "table",
  "roles",
  "db-identity",
  "Role definitions and permission sets.",
  { owner: "team-identity", props: { rows: 42 } },
);
n(
  "ext-directory",
  "external",
  "Corporate LDAP",
  "sys-identity",
  "Enterprise directory for staff identities, managed by IT.",
  {
    external: true,
    props: { managedBy: "IT Operations" },
    tags: ["directory"],
  },
);

/* ---------------- Order Fulfilment ---------------- */
n(
  "svc-orders",
  "service",
  "Order Service",
  "sys-fulfilment",
  "Owns the order lifecycle from creation to delivery.",
  { owner: "team-fulfilment", props: { language: "Java", runtime: "JVM 21" } },
);
n(
  "svc-inventory",
  "service",
  "Inventory Service",
  "sys-fulfilment",
  "Tracks stock levels and reservations.",
  { owner: "team-fulfilment", props: { language: "Java", runtime: "JVM 21" } },
);
n(
  "svc-shipping",
  "service",
  "Shipping Service",
  "sys-fulfilment",
  "Creates shipments and tracks carrier events.",
  { owner: "team-fulfilment", props: { language: "TypeScript" } },
);
n(
  "api-orders",
  "api",
  "Orders REST API",
  "svc-orders",
  "Read and update orders.",
  { owner: "team-fulfilment", props: { protocol: "REST/JSON", version: "v1" } },
);
n(
  "db-orders",
  "database",
  "Orders DB",
  "sys-fulfilment",
  "Relational store for orders and order items.",
  { owner: "team-fulfilment", props: { engine: "PostgreSQL 17" } },
);
n("tbl-orders", "table", "orders", "db-orders", "One row per customer order.", {
  owner: "team-fulfilment",
  props: { rows: "18M" },
});
n(
  "tbl-order-items",
  "table",
  "order_items",
  "db-orders",
  "Line items belonging to an order.",
  { owner: "team-fulfilment", props: { rows: "61M" } },
);
n(
  "q-order-events",
  "queue",
  "order-events",
  "sys-fulfilment",
  "Kafka topic carrying order lifecycle events.",
  {
    owner: "team-fulfilment",
    props: { engine: "Kafka", partitions: 12, retention: "7d" },
  },
);
n(
  "ext-carrier",
  "external",
  "Carrier API (DHL)",
  "sys-fulfilment",
  "Shipping carrier API for labels and tracking.",
  { external: true, props: { managedBy: "DHL" }, tags: ["vendor"] },
);
n(
  "svc-legacy-notify",
  "service",
  "Legacy Notifier",
  "sys-fulfilment",
  "Sends order emails through the old SMTP relay. Being replaced.",
  {
    owner: "team-fulfilment",
    lifecycle: "deprecated",
    props: { language: "PHP" },
    tags: ["legacy"],
  },
);

/* ---------------- Data & Analytics ---------------- */
n(
  "svc-etl",
  "service",
  "ETL Service",
  "sys-data",
  "Nightly and streaming extraction into the warehouse.",
  { owner: "team-data", props: { language: "Python" } },
);
n(
  "db-warehouse",
  "database",
  "Analytics Warehouse",
  "sys-data",
  "Columnar warehouse for reporting.",
  { owner: "team-data", props: { engine: "ClickHouse" } },
);
n(
  "tbl-fact-sales",
  "table",
  "fact_sales",
  "db-warehouse",
  "Grain: one row per order line.",
  { owner: "team-data", props: { rows: "420M" } },
);
n(
  "dash-sales",
  "dashboard",
  "Sales Dashboard",
  "sys-data",
  "Executive revenue and conversion dashboard.",
  { owner: "team-data", tags: ["reporting"] },
);
n(
  "proposed-recs",
  "service",
  "Recommendations Service",
  "sys-catalog",
  "Proposed personalised recommendations. Not yet built.",
  {
    owner: "team-catalog",
    lifecycle: "proposed",
    props: { language: "Python" },
    tags: ["proposal"],
  },
);

/* ---------------- Delivery & Platform ---------------- */
n(
  "env-prod",
  "environment",
  "Production",
  "sys-platform",
  "Customer-facing production environment.",
  { owner: "team-platform", props: { region: "eu-central-1" } },
);
n(
  "env-staging",
  "environment",
  "Staging",
  "sys-platform",
  "Pre-production verification environment.",
  { owner: "team-platform", props: { region: "eu-central-1" } },
);
n(
  "k8s-prod",
  "cluster",
  "k8s-prod",
  "sys-platform",
  "Production Kubernetes cluster.",
  { owner: "team-platform", props: { version: "1.33", nodes: 24 } },
);
n(
  "k8s-stg",
  "cluster",
  "k8s-staging",
  "sys-platform",
  "Staging Kubernetes cluster.",
  { owner: "team-platform", props: { version: "1.33", nodes: 6 } },
);
n(
  "srv-mongo-01",
  "server",
  "mongo-prod-01",
  "sys-platform",
  "Primary MongoDB host for the catalog database.",
  { owner: "team-platform", props: { os: "Ubuntu 24.04", cpu: 16, ramGb: 64 } },
);
n(
  "obs-prom",
  "observability",
  "Prometheus",
  "sys-platform",
  "Metrics collection and alert evaluation.",
  { owner: "team-platform", props: { retention: "30d" } },
);
n(
  "obs-grafana",
  "observability",
  "Grafana",
  "sys-platform",
  "Dashboards for metrics and logs.",
  { owner: "team-platform" },
);

/* ---------------- Point of Sale ---------------- */
n(
  "sys-pos",
  "system",
  "Point of Sale",
  null,
  "Tills, store back-office and payment terminals.",
  { owner: "team-retailops", tags: ["stores", "tier-1"] },
);
n(
  "app-till",
  "ui-app",
  "Till Application",
  "sys-pos",
  "Touchscreen till software used by store staff.",
  { owner: "team-retailops", props: { framework: "Electron" } },
);
n(
  "svc-pos",
  "service",
  "POS Service",
  "sys-pos",
  "Prices baskets, applies promotions and records sales.",
  { owner: "team-retailops", props: { language: "Go" } },
);
n(
  "db-pos",
  "database",
  "POS Database",
  "sys-pos",
  "Stores sales and till sessions.",
  { owner: "team-retailops", props: { engine: "PostgreSQL 17" } },
);

/* ---------------- Warehouse Management ---------------- */
n(
  "sys-wms",
  "system",
  "Warehouse Management",
  null,
  "Picking, packing, putaway and stock counting in the warehouses.",
  { owner: "team-fulfilment", tags: ["tier-2"] },
);
n(
  "app-scanner",
  "ui-app",
  "Handheld Scanner App",
  "sys-wms",
  "Android app used by pickers and packers.",
  { owner: "team-fulfilment", props: { platform: "Android" } },
);
n(
  "svc-wms",
  "service",
  "WMS Service",
  "sys-wms",
  "Directs picking waves and updates stock positions.",
  { owner: "team-fulfilment", props: { language: "Java" } },
);
n(
  "db-wms",
  "database",
  "WMS Database",
  "sys-wms",
  "Locations, stock positions and tasks.",
  { owner: "team-fulfilment", props: { engine: "PostgreSQL 17" } },
);
n(
  "cache-wms",
  "cache",
  "WMS Redis",
  "sys-wms",
  "Redis holding live pick-wave state.",
  { owner: "team-fulfilment", props: { engine: "Redis 7" } },
);

/* ---------------- ERP ---------------- */
n(
  "sys-erp",
  "system",
  "ERP & Finance",
  null,
  "General ledger, procurement and group reporting.",
  { owner: "team-corp", tags: ["finance", "tier-2"] },
);
n(
  "svc-erp",
  "service",
  "ERP Application",
  "sys-erp",
  "Packaged ERP with custom extensions.",
  { owner: "team-corp", props: { vendor: "SAP", language: "ABAP" } },
);
n("db-erp", "database", "ERP Database", "sys-erp", "ERP datastore.", {
  owner: "team-corp",
  props: { engine: "SAP HANA" },
});

/* ---------------- HR ---------------- */
n(
  "sys-hr",
  "system",
  "People Platform",
  null,
  "Employee records, payroll and recruiting.",
  { owner: "team-corp", tags: ["hr", "pii"] },
);
n(
  "app-hr",
  "ui-app",
  "HR Portal",
  "sys-hr",
  "Self-service portal for employees and managers.",
  { owner: "team-corp", props: { framework: "React" } },
);
n(
  "svc-hr",
  "service",
  "HR Service",
  "sys-hr",
  "Employee, payroll and leave logic.",
  { owner: "team-corp", props: { language: "Kotlin" } },
);
n("db-hr", "database", "HR Database", "sys-hr", "Employee records.", {
  owner: "team-corp",
  tags: ["pii"],
  props: { engine: "PostgreSQL 17" },
});

/* ---------------- Clients, roles and business processes ---------------- */
n(
  "cl-online",
  "client",
  "Online shoppers",
  null,
  "Consumers who buy through the web shop and the mobile app.",
  {
    props: { segment: "Consumer", volume: "About 40,000 orders a week" },
  },
);
n(
  "cl-instore",
  "client",
  "In-store shoppers",
  null,
  "Customers who buy in a Northwind store.",
  {
    props: { segment: "Consumer" },
  },
);
n(
  "cl-wholesale",
  "client",
  "Wholesale buyers",
  null,
  "Business customers who order in bulk on account.",
  {
    props: { segment: "Business" },
  },
);
n(
  "cl-auditors",
  "client",
  "Regulators and auditors",
  null,
  "External bodies who inspect our controls and records.",
  {
    props: { segment: "Regulator" },
  },
);

n(
  "role-store-mgr",
  "role",
  "Store manager",
  "co-retail",
  "Runs a store: opens and closes the till, handles stock and staff.",
  {
    props: { kind: "Internal" },
  },
);
n(
  "role-support",
  "role",
  "Customer support agent",
  "dept-ecom",
  "Answers customers about orders, payments and returns.",
  {
    props: { kind: "Internal" },
  },
);
n(
  "role-picker",
  "role",
  "Warehouse picker",
  "co-logistics",
  "Picks and packs orders on the warehouse floor.",
  {
    props: { kind: "Internal" },
  },
);
n(
  "role-finance-ctrl",
  "role",
  "Finance controller",
  "dept-finance",
  "Owns the ledger, approves postings and signs off the close.",
  {
    props: { kind: "Internal" },
  },
);
n(
  "role-release-mgr",
  "role",
  "Release manager",
  "dept-it",
  "Approves production changes and records the evidence.",
  {
    props: { kind: "Internal" },
  },
);
n(
  "role-qa",
  "role",
  "Quality approver",
  "co-group",
  "Reviews and signs validation documents.",
  {
    props: { kind: "Internal" },
  },
);

const P = (
  id: string,
  name: string,
  parent: string | null,
  summary: string,
  props: Record<string, PropValue> = {},
  owner?: string,
) => n(id, "process", name, parent, summary, { props, owner });

P(
  "proc-o2c",
  "Order to cash",
  null,
  "From a customer placing an order to the money being collected.",
  { regulated: "PCI DSS; SOX ITGC", criticality: "high" },
  "team-checkout",
);
P(
  "proc-take-order",
  "Take order",
  "proc-o2c",
  "Build a basket, confirm prices and place the order.",
  { criticality: "high" },
);
P(
  "proc-take-payment",
  "Take payment",
  "proc-o2c",
  "Authorise and capture the customer's payment.",
  { regulated: "PCI DSS", criticality: "high" },
);
P(
  "proc-ship",
  "Ship order",
  "proc-o2c",
  "Pick, pack and hand the order to the carrier.",
  { criticality: "medium" },
);
P(
  "proc-invoice",
  "Invoice and collect",
  "proc-o2c",
  "Issue the invoice and reconcile the payment to the ledger.",
  { regulated: "SOX ITGC", criticality: "high" },
);
P(
  "proc-returns",
  "Handle returns",
  "proc-o2c",
  "Accept a return and refund or replace.",
  { criticality: "low" },
);

P(
  "proc-fulfil",
  "Warehouse fulfilment",
  null,
  "Receiving, storing and dispatching goods.",
  { regulated: "EU Annex 11", criticality: "high" },
  "team-fulfilment",
);
P(
  "proc-pick",
  "Pick and pack",
  "proc-fulfil",
  "Pick items against an order and pack them.",
  { criticality: "medium" },
);
P(
  "proc-dispatch",
  "Dispatch and track",
  "proc-fulfil",
  "Hand over to the carrier and track the parcel.",
  { criticality: "medium" },
);

P(
  "proc-p2p",
  "Procure to pay",
  null,
  "Buying goods and services and paying suppliers.",
  { regulated: "SOX ITGC", criticality: "high" },
  "team-corp",
);
P(
  "proc-approve-po",
  "Approve purchase",
  "proc-p2p",
  "Raise and approve a purchase order.",
  { criticality: "medium" },
);
P(
  "proc-receive",
  "Receive goods",
  "proc-p2p",
  "Confirm delivery against the order.",
  { criticality: "medium" },
);
P(
  "proc-pay-supplier",
  "Pay supplier",
  "proc-p2p",
  "Match the invoice and release payment.",
  { regulated: "SOX ITGC", criticality: "high" },
);

P(
  "proc-close",
  "Financial close",
  null,
  "Month-end and year-end closing of the books.",
  { regulated: "SOX ITGC", criticality: "high" },
  "team-corp",
);

P(
  "proc-access",
  "Joiner, mover, leaver",
  null,
  "Giving, changing and removing people's access.",
  { regulated: "SOX ITGC; NW-POL-001", criticality: "high" },
  "team-identity",
);
P(
  "proc-grant",
  "Grant access",
  "proc-access",
  "Approve and provision a new account.",
  { criticality: "medium" },
);
P(
  "proc-review-access",
  "Review access",
  "proc-access",
  "Quarterly review of who can do what.",
  { criticality: "high" },
);
P(
  "proc-remove",
  "Remove access",
  "proc-access",
  "Disable accounts when people leave.",
  { criticality: "high" },
);

P(
  "proc-release",
  "Software release and change",
  null,
  "Getting a change from a commit into production with approval and evidence.",
  { regulated: "NW-POL-001; PCI DSS", criticality: "high" },
  "team-platform",
);
P(
  "proc-build-test",
  "Build and test",
  "proc-release",
  "Build the change and run the automated tests.",
  { criticality: "high" },
);
P(
  "proc-approve-change",
  "Approve change",
  "proc-release",
  "Assess impact and approve the change.",
  { criticality: "high" },
);
P(
  "proc-deploy",
  "Deploy to production",
  "proc-release",
  "Release the approved build to production.",
  { criticality: "high" },
);

P(
  "proc-catalog",
  "Product catalog management",
  null,
  "Keeping product data, prices and search accurate.",
  { criticality: "medium" },
  "team-catalog",
);
P(
  "proc-store-ops",
  "Run a store",
  null,
  "Selling in store: till, stock and daily close.",
  { regulated: "PCI DSS", criticality: "high" },
  "team-retailops",
);

export const NODES: GraphNode[] = out;
