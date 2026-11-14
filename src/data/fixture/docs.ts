import type { Doc } from "@/domain/types";
import { relId } from "./relations";

const node = (id: string) => ({ type: "node" as const, id });
const rel = (id: string) => ({ type: "relation" as const, id });

export const DOCS: Doc[] = [
  /* ---------------- Checkout & Payments ---------------- */
  {
    id: "doc-checkout-arch",
    title: "Checkout architecture overview",
    docType: "architecture",
    audience: ["developer", "devops"],
    attachedTo: [node("sys-checkout")],
    author: "Mara Lindqvist",
    revision: 7,
    updatedAt: "2026-10-28T09:14:00Z",
    content: `# Checkout architecture overview

The checkout system turns a customer's cart into a paid order. It is the most
revenue-critical path in the platform, so it is deliberately small and strict.

## Components

- **Cart Service** keeps carts in Redis and applies promotions.
- **Checkout Service** orchestrates validation, payment and order creation.
- **Payments Service** is the only component allowed to talk to the payment provider (PCI scope).

## Flow

\`\`\`mermaid
sequenceDiagram
  participant BFF as Storefront BFF
  participant CO as Checkout Service
  participant CA as Cart Service
  participant CT as Catalog API
  participant PAY as Payments Service
  participant K as order-events topic
  BFF->>CO: POST /checkout
  CO->>CA: load and lock cart
  CO->>CT: validate prices
  CO->>PAY: authorise
  PAY-->>CO: authorised
  CO->>PAY: capture
  CO->>K: OrderPlaced
  CO-->>BFF: 201 order accepted
\`\`\`

## Rules

1. A cart is locked for the duration of a checkout attempt.
2. Prices are **always** re-validated against the catalog before payment.
3. \`OrderPlaced\` is only published after payment capture succeeds.
4. Everything touching card data stays inside the Payments Service.
`,
  },
  {
    id: "doc-adr-idempotent-payments",
    title: "ADR-014: Idempotency keys for payment calls",
    docType: "adr",
    audience: ["developer"],
    attachedTo: [node("svc-payments"), node("svc-checkout")],
    author: "Tomas Berg",
    revision: 2,
    updatedAt: "2026-08-03T13:02:00Z",
    content: `# ADR-014: Idempotency keys for payment calls

**Status:** Accepted  **Date:** 2026-08-03

## Context

Network timeouts between checkout and payments produced duplicate authorisations
for a small number of customers during the July incident.

## Decision

Every authorisation and capture request carries an idempotency key derived from
\`cartId + attemptNumber\`. The Payments Service stores the key and the outcome
for 24 hours and returns the stored outcome on repeats.

## Consequences

- Clients **may** retry safely on timeout, but checkout currently does not retry (see the relation documentation).
- Keys must be generated deterministically; random keys defeat the purpose.
- Adds a small write per payment call.
`,
  },
  {
    id: "doc-payments-runbook",
    title: "Runbook: payment authorisation failures spiking",
    docType: "runbook",
    audience: ["devops", "developer"],
    attachedTo: [node("svc-payments")],
    author: "Platform on-call",
    revision: 5,
    updatedAt: "2026-10-02T18:40:00Z",
    content: `# Runbook: payment authorisation failures spiking

**Alert:** \`payments_authorisation_error_rate > 2%\` for 5 minutes.

## 1. Triage

1. Open the **Payments Service** monitoring tab and check error rate and p95 latency.
2. Check the provider status page. If Stripe is degraded, go to *Provider outage*.
3. Check recent deployments of the checkout and payments services.

## 2. Provider outage

- Do **not** restart the Payments Service; it does not help and drops in-flight captures.
- Enable the "payments degraded" banner in the storefront feature flags.
- Notify #payments-oncall and the Checkout team lead.

## 3. Bad deployment

- Roll back with \`kubectl rollout undo deployment/payments -n checkout\`.
- Confirm error rate recovers within 5 minutes.

## 4. After the incident

Record the timeline and file a post-incident review within 3 working days.
`,
  },
  {
    id: "doc-contract-payment-auth",
    title: "Contract: payment authorisation call",
    docType: "contract",
    audience: ["developer"],
    attachedTo: [rel(relId("svc-checkout", "calls", "api-payments"))],
    author: "Tomas Berg",
    revision: 4,
    updatedAt: "2026-09-12T10:00:00Z",
    content: `# Contract: payment authorisation call

This document is **owned by the relationship** between the Checkout Service and
the Payments Internal API. It describes what each side promises the other.

## Request

\`\`\`json
{
  "idempotencyKey": "cart_8f31-1",
  "amount": { "currency": "EUR", "minor": 12990 },
  "paymentMethodId": "pm_123",
  "captureMode": "manual"
}
\`\`\`

## Guarantees from Payments

- Responds within **5 s** or returns \`DEADLINE_EXCEEDED\`.
- Safe to repeat with the same idempotency key for 24 hours.
- Never partially authorises; the result is \`AUTHORISED\` or \`DECLINED\`.

## Guarantees from Checkout

- Sends a unique idempotency key per attempt.
- Does **not** automatically retry on timeout (open question, see ADR-014).
- Treats \`DEADLINE_EXCEEDED\` as *unknown* outcome and reconciles before charging again.

## Known issues

- Amount is passed in minor units; zero-decimal currencies need special handling.
`,
  },
  {
    id: "doc-contract-order-placed",
    title: "Contract: OrderPlaced event v3",
    docType: "contract",
    audience: ["developer"],
    attachedTo: [rel(relId("svc-checkout", "publishes_to", "q-order-events"))],
    author: "Ines Duarte",
    revision: 3,
    updatedAt: "2026-07-21T08:20:00Z",
    content: `# Contract: OrderPlaced event v3

Published by the Checkout Service to the \`order-events\` topic.

| Field | Type | Notes |
| --- | --- | --- |
| \`orderId\` | string | ULID, also the partition key |
| \`customerId\` | string | |
| \`lines[]\` | array | \`sku\`, \`quantity\`, \`unitPrice\` |
| \`total\` | money | Captured amount |
| \`placedAt\` | timestamp | UTC |

## Delivery semantics

At-least-once. Consumers must be idempotent on \`orderId\`.

## Compatibility

Additive changes only within v3. Removing or renaming a field requires a new
schema version and a coordinated migration across all consumers.
`,
  },
  {
    id: "doc-stripe-integration",
    title: "Stripe integration guide",
    docType: "reference",
    audience: ["developer", "devops"],
    attachedTo: [rel(relId("svc-payments", "integrates_with", "ext-stripe"))],
    author: "Mara Lindqvist",
    revision: 6,
    updatedAt: "2026-10-11T12:30:00Z",
    content: `# Stripe integration guide

Owned by the **Payments Service ↔ Stripe** relationship.

## Authentication

- Server-to-Stripe calls use a restricted API key from the secrets manager.
- Incoming webhooks are verified using the signing secret; unsigned requests are rejected.

## Webhooks we handle

- \`payment_intent.succeeded\`
- \`payment_intent.payment_failed\`
- \`charge.refunded\`
- \`charge.dispute.created\`

## Operational notes

- Stripe is an **external** system. We do not provision or operate it.
- Rotate API keys every 90 days; the rotation procedure is in the platform runbook.
- Stripe status: https://status.stripe.com
`,
  },
  {
    id: "doc-pci-scope",
    title: "PCI scope and boundaries",
    docType: "architecture",
    audience: ["developer", "devops", "security"],
    attachedTo: [node("svc-payments"), node("sys-checkout")],
    author: "Security Office",
    revision: 3,
    updatedAt: "2026-06-30T07:45:00Z",
    content: `# PCI scope and boundaries

Only the **Payments Service** and its dedicated namespace are in PCI scope.

- Card data never reaches the Checkout Service, BFF or storefront; the browser sends it directly to the provider.
- Logs and traces must never contain card numbers or provider tokens.
- Changes to anything in scope require security review before implementation.
`,
  },
  {
    id: "doc-cart-redis",
    title: "Cart storage design",
    docType: "architecture",
    audience: ["developer"],
    attachedTo: [node("cache-cart"), node("svc-cart")],
    author: "Ines Duarte",
    revision: 2,
    updatedAt: "2026-05-14T11:11:00Z",
    content: `# Cart storage design

Carts are stored as Redis hashes keyed by \`cart:{customerId}\` with a 7 day TTL.

- Writes use optimistic transactions (\`WATCH\`/\`MULTI\`).
- Persistence is AOF with \`everysec\`; losing up to a second of cart changes is acceptable.
- A lock key \`cart-lock:{id}\` is taken by checkout and expires after 60 seconds.
`,
  },

  /* ---------------- Catalog ---------------- */
  {
    id: "doc-catalog-arch",
    title: "Catalog architecture",
    docType: "architecture",
    audience: ["developer", "devops"],
    attachedTo: [node("sys-catalog")],
    author: "Priya Raman",
    revision: 9,
    updatedAt: "2026-10-19T15:05:00Z",
    content: `# Catalog architecture

The catalog is the source of truth for product data. It exposes a read API and
keeps a **separate search index** for fast, faceted queries.

\`\`\`mermaid
flowchart LR
  Admin[Merchandising tools] --> CS[Catalog Service]
  CS --> DB[(Catalog MongoDB)]
  DB -- change stream --> CS
  CS --> IDX[(Search Index)]
  SS[Search Service] --> IDX
  BFF[Storefront BFF] --> CS
  BFF --> SS
\`\`\`

## Principles

- MongoDB is authoritative; the index is always rebuildable.
- Reads never go through the admin path.
- Product identifiers are immutable.
`,
  },
  {
    id: "doc-products-schema",
    title: "products collection schema",
    docType: "reference",
    audience: ["developer"],
    attachedTo: [node("tbl-products")],
    author: "Priya Raman",
    revision: 4,
    updatedAt: "2026-09-02T09:30:00Z",
    content: `# products collection schema

\`\`\`json
{
  "_id": "sku_100245",
  "name": "Trail runner 2",
  "categoryId": "cat_shoes_running",
  "variants": [{ "sku": "100245-42", "size": 42, "stock": null }],
  "price": { "currency": "EUR", "minor": 12990 },
  "status": "published"
}
\`\`\`

## Indexes

- \`{ categoryId: 1, status: 1 }\`
- \`{ "variants.sku": 1 }\` unique

## Notes

Stock is **not** stored here; the Inventory Service owns it.
`,
  },
  {
    id: "doc-search-sync",
    title: "Search index synchronisation",
    docType: "contract",
    audience: ["developer", "devops"],
    attachedTo: [rel(relId("svc-catalog", "writes_to", "idx-search"))],
    author: "Priya Raman",
    revision: 3,
    updatedAt: "2026-08-17T14:00:00Z",
    content: `# Search index synchronisation

Owned by the **Catalog Service → Search Index** relationship.

## Mechanism

The catalog service tails the MongoDB change stream and upserts documents into
the index. Target lag is **under 5 seconds**.

## Failure handling

- On error the event is retried with backoff and then parked on a dead-letter list.
- A nightly job compares counts and repairs drift.
- The index can be rebuilt from MongoDB in about 40 minutes.
`,
  },
  {
    id: "doc-search-runbook",
    title: "Runbook: rebuild the search index",
    docType: "runbook",
    audience: ["devops"],
    attachedTo: [node("idx-search"), node("svc-search")],
    author: "Platform on-call",
    revision: 2,
    updatedAt: "2026-04-22T16:20:00Z",
    content: `# Runbook: rebuild the search index

1. Announce the rebuild in #catalog-ops.
2. Create a new index version \`products_v{N+1}\`.
3. Run the \`reindex\` job; monitor progress in Grafana.
4. Switch the alias \`products\` to the new version.
5. Keep the previous index for 24 hours, then delete it.

Search stays available throughout because the alias is switched atomically.
`,
  },

  /* ---------------- Identity ---------------- */
  {
    id: "doc-auth-overview",
    title: "Authentication overview",
    docType: "architecture",
    audience: ["developer", "security"],
    attachedTo: [node("sys-identity"), node("svc-auth")],
    author: "Jonas Kvist",
    revision: 5,
    updatedAt: "2026-09-29T10:10:00Z",
    content: `# Authentication overview

The Auth Service is an OIDC provider. Customers sign in with email and password
or social login. Staff sign in through the corporate directory.

## Tokens

- Access tokens are short-lived (10 minutes) JWTs.
- Refresh tokens rotate on every use.
- Services validate tokens through introspection, never by sharing signing keys.

## Staff identities

Staff authenticate against LDAP and are mapped to roles through group membership.
`,
  },
  {
    id: "doc-ldap-sync",
    title: "LDAP directory sync",
    docType: "reference",
    audience: ["developer", "devops"],
    attachedTo: [rel(relId("svc-auth", "integrates_with", "ext-directory"))],
    author: "Jonas Kvist",
    revision: 2,
    updatedAt: "2026-07-05T09:00:00Z",
    content: `# LDAP directory sync

Owned by the **Auth Service ↔ Corporate LDAP** relationship.

- Connection: LDAPS to the directory, read-only service account.
- Group mapping: \`cn=platform-admins\` → \`admin\` role, \`cn=support\` → \`support\` role.
- Sync interval: 15 minutes. Disabled accounts are removed on the next cycle.
- The directory is managed by IT; changes to groups go through their service desk.
`,
  },
  {
    id: "doc-users-pii",
    title: "users table: PII handling",
    docType: "reference",
    audience: ["developer", "security"],
    attachedTo: [node("tbl-users")],
    author: "Security Office",
    revision: 1,
    updatedAt: "2026-03-10T09:00:00Z",
    content: `# users table: PII handling

Contains personal data (email, name, phone). Access requires an explicit grant.

- Passwords are stored as Argon2id hashes.
- Deletion requests are processed by anonymising rather than deleting rows.
- Never copy this table into the warehouse; use pseudonymous customer ids.
`,
  },

  /* ---------------- Fulfilment ---------------- */
  {
    id: "doc-fulfilment-arch",
    title: "Order fulfilment architecture",
    docType: "architecture",
    audience: ["developer", "devops", "business"],
    attachedTo: [node("sys-fulfilment")],
    author: "Ines Duarte",
    revision: 6,
    updatedAt: "2026-10-05T12:00:00Z",
    content: `# Order fulfilment architecture

An order moves through reserved → picked → shipped → delivered.

\`\`\`mermaid
stateDiagram-v2
  [*] --> Placed
  Placed --> Reserved: stock reserved
  Reserved --> Shipped: carrier label created
  Shipped --> Delivered: carrier confirms
  Placed --> Cancelled
  Reserved --> Cancelled
\`\`\`

## Business view

Customers see these states in their order history. Support can cancel an order
until it is shipped.
`,
  },
  {
    id: "doc-orders-consumer",
    title: "OrderPlaced consumer behaviour",
    docType: "contract",
    audience: ["developer"],
    attachedTo: [rel(relId("svc-orders", "consumes_from", "q-order-events"))],
    author: "Ines Duarte",
    revision: 2,
    updatedAt: "2026-07-22T09:45:00Z",
    content: `# OrderPlaced consumer behaviour

- Consumer group: \`orders-v3\`. Ordering is guaranteed per \`orderId\`.
- Processing is idempotent on \`orderId\`; duplicates are ignored.
- Poison messages go to \`order-events.dlq\` after 5 attempts.
- If lag exceeds 10 000 messages for 10 minutes the on-call is paged.
`,
  },
  {
    id: "doc-inventory-coupling",
    title: "Known issue: Inventory reads catalog DB directly",
    docType: "adr",
    audience: ["developer"],
    attachedTo: [rel(relId("svc-inventory", "reads_from", "tbl-products"))],
    author: "Ines Duarte",
    revision: 1,
    updatedAt: "2026-10-30T08:00:00Z",
    content: `# Known issue: Inventory reads catalog DB directly

**Status:** Proposed fix

The Inventory Service reads product identifiers straight from the catalog
database. This couples two systems through a data store and bypasses the
catalog's API, and it is invisible to the catalog team's change process.

## Proposal

Replace it with calls to the Catalog GraphQL API, with local caching of product ids.
Track under the dependency clean-up change set.
`,
  },
  {
    id: "doc-shipping-runbook",
    title: "Runbook: shipments stuck in Reserved",
    docType: "runbook",
    audience: ["devops", "business"],
    attachedTo: [node("svc-shipping")],
    author: "Fulfilment on-call",
    revision: 3,
    updatedAt: "2026-09-08T07:30:00Z",
    content: `# Runbook: shipments stuck in Reserved

1. Check the carrier status in the carrier portal.
2. If the carrier API is failing, the Shipping Service retries for 6 hours.
3. After 6 hours, shipments are flagged for manual handling in the support console.
4. Customer support may contact the customer using the "delayed shipment" template.
`,
  },
  {
    id: "doc-legacy-notify",
    title: "Legacy Notifier deprecation plan",
    docType: "adr",
    audience: ["developer", "business"],
    attachedTo: [node("svc-legacy-notify")],
    author: "Ines Duarte",
    revision: 2,
    updatedAt: "2026-10-14T10:00:00Z",
    content: `# Legacy Notifier deprecation plan

The PHP notifier sends order emails through an SMTP relay that is scheduled for
shutdown. A replacement notification service is planned.

- **Freeze:** no new features.
- **Target retirement:** end of Q1 2027.
- **Risk:** the notifier consumes \`order-events\` with its own consumer group; removing it silently would stop customer emails.
`,
  },

  /* ---------------- Delivery & Platform ---------------- */
  {
    id: "doc-ci-checkout",
    title: "checkout-ci pipeline stages",
    docType: "reference",
    audience: ["developer", "devops"],
    attachedTo: [node("pipe-checkout")],
    author: "Platform Team",
    revision: 4,
    updatedAt: "2026-09-18T13:00:00Z",
    content: `# checkout-ci pipeline stages

\`\`\`mermaid
flowchart LR
  A[Push to main] --> B[Unit tests]
  B --> C[Static analysis]
  C --> D[Build image]
  D --> E[Vulnerability scan]
  E --> F[Publish to registry]
  F --> G[Deploy to staging]
\`\`\`

- Production deployment requires a manual approval from the Checkout team.
- A critical vulnerability finding fails the pipeline.
`,
  },
  {
    id: "doc-deploy-checkout",
    title: "Deploying and rolling back checkout",
    docType: "runbook",
    audience: ["devops", "developer"],
    attachedTo: [node("dep-checkout-prod"), node("dep-checkout-stg")],
    author: "Platform Team",
    revision: 3,
    updatedAt: "2026-10-21T08:30:00Z",
    content: `# Deploying and rolling back checkout

## Deploy

1. Promote the image tag from staging to production using the release job.
2. A rolling update replaces 25% of pods at a time.
3. Watch error rate and p95 latency for 15 minutes.

## Roll back

\`\`\`bash
kubectl rollout undo deployment/checkout -n checkout
\`\`\`

Rollbacks are safe because database migrations are backwards compatible for one release.
`,
  },
  {
    id: "doc-k8s-prod",
    title: "Production cluster operations",
    docType: "runbook",
    audience: ["devops"],
    attachedTo: [node("k8s-prod")],
    author: "Platform Team",
    revision: 8,
    updatedAt: "2026-11-02T09:00:00Z",
    content: `# Production cluster operations

- Cluster upgrades happen quarterly in a maintenance window, one node pool at a time.
- Autoscaling is enabled between 18 and 36 nodes.
- Access is through SSO; direct node access is break-glass only and audited.
`,
  },
  {
    id: "doc-mongo-prod",
    title: "mongo-prod-01 host notes",
    docType: "reference",
    audience: ["devops"],
    attachedTo: [node("srv-mongo-01"), node("db-catalog")],
    author: "Platform Team",
    revision: 2,
    updatedAt: "2026-08-25T09:00:00Z",
    content: `# mongo-prod-01 host notes

- Primary of the catalog replica set; two secondaries run in other availability zones.
- Backups: nightly snapshot plus continuous oplog archiving; restore tested monthly.
- Disk alerts fire at 75% and 85% usage.
`,
  },
  {
    id: "doc-onboarding-backend",
    title: "Onboarding: backend developer",
    docType: "onboarding",
    audience: ["developer"],
    attachedTo: [
      node("team-checkout"),
      node("team-catalog"),
      node("team-fulfilment"),
    ],
    author: "Engineering Enablement",
    revision: 5,
    updatedAt: "2026-10-01T09:00:00Z",
    content: `# Onboarding: backend developer

Welcome. In your first week:

1. Read the architecture overview of the system your team owns.
2. Run the services locally using the monorepo's \`make dev\` target.
3. Open the dependency graph for your services and explore what they call and what calls them.
4. Shadow an on-call shift and read the runbooks.

Ask your team lead for access to the secrets manager and staging cluster.
`,
  },
  {
    id: "doc-shopping-guide",
    title: "How customers shop (user guide)",
    docType: "user-guide",
    audience: ["business"],
    attachedTo: [node("sys-storefront")],
    author: "Growth Team",
    revision: 3,
    updatedAt: "2026-09-04T09:00:00Z",
    content: `# How customers shop

1. Customers browse or search the catalog on the web or in the app.
2. They add items to a cart. Carts are kept for seven days.
3. At checkout they confirm their address and pay by card.
4. They receive an order confirmation email and can track delivery in their account.

If a customer reports a problem paying, direct them to support and note the time of the attempt.
`,
  },
  {
    id: "doc-group-overview",
    title: "Northwind Group: companies and how software supports them",
    docType: "architecture",
    audience: ["management", "developer"],
    attachedTo: [node("co-group"), node("co-retail"), node("co-logistics")],
    author: "Ines Vogel",
    revision: 3,
    updatedAt: "2026-11-04T10:00:00Z",
    content: `# Northwind Group overview

Three companies share one software estate.

| Company | Main software | Physical estate |
|---|---|---|
| Northwind Retail | Storefront, Point of Sale, Catalog, Checkout | 3 stores |
| Northwind Logistics | Warehouse Management, Order Fulfilment | 2 warehouses |
| Northwind Group | ERP, People Platform, Platform | HQ, Frankfurt data centre |

Open a software system to see which companies, stores and warehouses it serves, and drill down to the hardware it runs on.`,
  },
  {
    id: "doc-pos-rollout",
    title: "Point of Sale rollout runbook",
    docType: "runbook",
    audience: ["devops", "store-ops"],
    attachedTo: [node("sys-pos"), node("store-berlin")],
    author: "Jonas Reiter",
    revision: 2,
    updatedAt: "2026-11-03T10:00:00Z",
    content: `# Point of Sale rollout runbook

1. Schedule the store outside trading hours.
2. Deploy the till application to one till and run a test basket.
3. Roll out to the remaining tills and confirm each reports to the POS Service.
4. Keep the previous version installed for 48 hours for rollback.`,
  },
  {
    id: "doc-wms-stock",
    title: "How stock positions are tracked",
    docType: "architecture",
    audience: ["developer", "warehouse-ops"],
    attachedTo: [node("svc-wms"), node("stock-electronics")],
    author: "Femke de Vries",
    revision: 4,
    updatedAt: "2026-11-05T10:00:00Z",
    content: `# How stock positions are tracked

The WMS records every putaway, pick and count. The Inventory Service reads a summarised view and exposes sellable availability to checkout.

\`\`\`mermaid
flowchart LR
  S[Scanner] --> W[WMS Service]
  W --> D[(WMS DB)]
  W --> I[Inventory Service]
\`\`\``,
  },
  {
    id: "doc-rel-wms-inv",
    title: "Stock availability contract (relation)",
    docType: "contract",
    audience: ["developer"],
    attachedTo: [rel(relId("svc-inventory", "tracks", "stock-electronics"))],
    author: "Femke de Vries",
    revision: 1,
    updatedAt: "2026-11-02T10:00:00Z",
    content: `# Stock availability contract

Sellable availability = on-hand minus reserved minus safety stock. Refreshed at most 30 seconds behind the WMS. This document belongs to this relation only.`,
  },
  {
    id: "doc-dc-fra1",
    title: "Frankfurt DC FRA1 site guide",
    docType: "runbook",
    audience: ["devops", "facilities"],
    attachedTo: [node("dc-fra1")],
    author: "Marta Sommer",
    revision: 5,
    updatedAt: "2026-11-06T10:00:00Z",
    content: `# Frankfurt DC FRA1 site guide

- Two halls, N+1 power and cooling.
- Access requires a badge and a booked ticket.
- Emergency contact: facilities desk, 24/7.
- Racks are numbered by hall and row (A12 means row A, rack 12).`,
  },
  {
    id: "doc-mongo-hw",
    title: "Replacing a failed fan in dell-r760-a12-07",
    docType: "runbook",
    audience: ["devops"],
    attachedTo: [node("hw-fra-a12-07"), node("srv-mongo-01")],
    author: "Marta Sommer",
    revision: 2,
    updatedAt: "2026-11-03T10:00:00Z",
    content: `# Replacing a failed fan

1. Confirm the alert in the hardware exporter and the iDRAC event log.
2. Fail the MongoDB primary over to a secondary before touching the host.
3. Replace the fan module (hot-swap) and verify the temperature trend.
4. Fail back and close the alert.`,
  },
  {
    id: "doc-rel-mongo-place",
    title: "mongo-prod-01 bare-metal placement (relation)",
    docType: "architecture",
    audience: ["devops"],
    attachedTo: [rel(relId("srv-mongo-01", "hosted_on", "hw-fra-a12-07"))],
    author: "Marta Sommer",
    revision: 1,
    updatedAt: "2026-11-02T10:00:00Z",
    content: `# Why bare metal

The catalog database needs predictable NVMe latency. It runs directly on the host with no hypervisor. Moving it needs a planned maintenance window.`,
  },
  {
    id: "doc-erp-close",
    title: "Month-end close process",
    docType: "runbook",
    audience: ["finance"],
    attachedTo: [node("sys-erp"), node("dept-finance")],
    author: "Katrin Bauer",
    revision: 3,
    updatedAt: "2026-11-04T10:00:00Z",
    content: `# Month-end close

The ERP locks the period on working day 3. Data & Analytics reads the closed ledger for group reporting.`,
  },
];
