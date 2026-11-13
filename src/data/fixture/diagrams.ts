import type { Diagram } from "@/domain/types";
import { relId } from "./relations";

const node = (id: string) => ({ type: "node" as const, id });
const rel = (id: string) => ({ type: "relation" as const, id });

export const DIAGRAMS: Diagram[] = [
  {
    id: "dg-checkout-context",
    title: "Checkout system context",
    attachedTo: [node("sys-checkout")],
    mermaid: `flowchart LR
  BFF[Storefront BFF] --> CO[Checkout Service]
  CO --> CA[Cart Service]
  CA --> R[(Cart Redis)]
  CO --> PAY[Payments Service]
  PAY --> S((Stripe))
  CO --> K{{order-events}}
  K --> ORD[Order Service]`,
  },
  {
    id: "dg-payments-states",
    title: "Payment lifecycle",
    attachedTo: [node("svc-payments")],
    mermaid: `stateDiagram-v2
  [*] --> Created
  Created --> Authorised: authorise
  Created --> Declined: declined
  Authorised --> Captured: capture
  Authorised --> Voided: void
  Captured --> Refunded: refund
  Declined --> [*]
  Voided --> [*]
  Refunded --> [*]`,
  },
  {
    id: "dg-payment-auth-seq",
    title: "Authorisation call sequence",
    attachedTo: [rel(relId("svc-checkout", "calls", "api-payments"))],
    mermaid: `sequenceDiagram
  participant CO as Checkout
  participant PAY as Payments
  CO->>PAY: Authorise(idempotencyKey, amount)
  alt success
    PAY-->>CO: AUTHORISED
  else declined
    PAY-->>CO: DECLINED
  else timeout
    PAY--xCO: DEADLINE_EXCEEDED
    CO->>PAY: GetStatus(idempotencyKey)
  end`,
  },
  {
    id: "dg-stripe-webhooks",
    title: "Webhook handling",
    attachedTo: [rel(relId("svc-payments", "integrates_with", "ext-stripe"))],
    mermaid: `sequenceDiagram
  participant S as Stripe
  participant W as Webhook endpoint
  participant P as Payments Service
  S->>W: POST event (signed)
  W->>W: verify signature
  W->>P: enqueue event
  W-->>S: 200 OK
  P->>P: update payment state`,
  },
  {
    id: "dg-orders-er",
    title: "Orders data model",
    attachedTo: [node("db-orders")],
    mermaid: `erDiagram
  ORDERS ||--o{ ORDER_ITEMS : contains
  ORDERS {
    string id PK
    string customer_id
    string status
    timestamp placed_at
  }
  ORDER_ITEMS {
    string id PK
    string order_id FK
    string sku
    int quantity
  }`,
  },
  {
    id: "dg-delivery-chain",
    title: "From commit to running pod",
    attachedTo: [node("sys-platform"), node("pipe-checkout")],
    mermaid: `flowchart LR
  Repo[checkout-platform] --> CI[checkout-ci]
  CI --> Img[checkout:1.42.0]
  Img --> Stg[checkout @ staging]
  Img --> Prod[checkout @ production]
  Prod --> K[k8s-prod]
  Stg --> KS[k8s-staging]`,
  },
  {
    id: "dg-catalog-sync",
    title: "Catalog to search sync",
    attachedTo: [rel(relId("svc-catalog", "writes_to", "idx-search"))],
    mermaid: `flowchart LR
  M[(MongoDB)] -- change stream --> CS[Catalog Service]
  CS -- upsert --> I[(Search Index)]
  CS -. failure .-> D[Dead-letter list]
  N[Nightly job] -- compare and repair --> I`,
  },
  {
    id: "dg-enterprise",
    title: "Enterprise overview",
    attachedTo: [node("co-group")],
    mermaid: `flowchart LR
  G[Northwind Group] --- R[Northwind Retail]
  G --- L[Northwind Logistics]
  ERP[ERP & Finance] --> G
  POS[Point of Sale] --> R
  SF[Storefront] --> R
  WMS[Warehouse Management] --> L`,
  },
  {
    id: "dg-bare-metal",
    title: "Rack to workload placement",
    attachedTo: [node("rack-fra-a12")],
    mermaid: `flowchart TB
  CORE[CORE-01] --- TOR[TOR-A12]
  TOR --- H5[a12-05]
  TOR --- H7[a12-07]
  H5 --> K[k8s-prod worker]
  H7 --> M[mongo-prod-01]`,
  },
  {
    id: "dg-stock-flow",
    title: "Warehouse to store replenishment",
    attachedTo: [node("wh-rotterdam")],
    mermaid: `flowchart LR
  WH[Rotterdam] -->|replenish| B[Berlin]
  WH -->|replenish| M[Munich]
  H[Hamburg] -->|replenish| P[Paris]`,
  },
];
