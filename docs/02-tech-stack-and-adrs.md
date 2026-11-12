# 02. Tech Stack and Architecture Decisions

## 1. Stack summary

| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) | End to end |
| Framework | Next.js (App Router) | UI plus thin API layer |
| Database | MongoDB (replica set) | Official Node driver plus Zod schemas |
| File storage | Supabase Storage | Private buckets, server-issued signed URLs only |
| Authentication | Clerk, behind an `IdentityProvider` port | LDAP/enterprise directory later |
| Authorization | In-app RBAC with scopes | Our own DB, not Clerk roles |
| Validation | Zod | Request DTOs and document schemas |
| Editor | Markdown stored as source, rich editor on top (Tiptap or similar) | See ADR-007 |
| Diagrams in docs | Mermaid | Rendered in the UI |
| Policy engine | OPA (later) | Sidecar, evaluated from the validation module |
| Async jobs | Separate worker process (later) | See ADR-004 |
| Testing | Vitest (unit), Playwright (e2e), Testcontainers/Mongo memory replset (integration) | |

## 2. Decision records

### ADR-001: MongoDB as the single system of record
**Status:** Accepted (product owner decision).

The original spec leaned relational (SQL Server). MongoDB fits well for documents, type-specific resource details, and flexible schemas. The costs we accept and mitigate:

- **Relationships and graph traversal.** Use a first-class `resource_relationships` collection (edge list) and `$graphLookup` for recursive impact analysis. Fine for the expected scale (thousands to low hundreds of thousands of resources). Revisit a graph store only if traversal becomes a bottleneck.
- **Integrity.** No foreign keys, so integrity is enforced in application services plus Zod schemas, plus unique/partial indexes, plus a periodic integrity check job.
- **Transactions.** Require a replica set. Used for revision writes, approvals, and anything touching more than one collection.
- **Schema drift.** Every document carries `schemaVersion`. Migrations are explicit scripts.

### ADR-002: Supabase for Storage only
**Status:** Accepted.

- Used for attachments, diagrams exports, and later evidence files (scan reports, test results).
- Buckets are **private**. The browser never receives a permanent URL.
- Flow: client asks our API, we check authorization, we issue a short-lived signed URL (upload or download).
- Mongo holds file metadata (`attachments`: bucket, path, size, sha256, content type, uploader). The sha256 supports integrity checks and evidence use later.
- Wrap in a `StorageAdapter` interface so S3 or Azure Blob can replace it if an enterprise requires it.

### ADR-003: Clerk now, enterprise directory later, behind a port
**Status:** Accepted, with a known risk.

- Clerk handles sign-in and sessions today.
- The app has its **own `users` collection**. Clerk's user ID is stored as an *external identity* on the user, not used as the primary key.
- Roles and permissions are **never stored in Clerk**. They live in our DB, so changing identity providers does not change authorization.
- `IdentityProvider` port: `getSessionUser()`, `resolveExternalIdentity()`, `syncDirectory()` (later).
- **Risk:** Clerk does not offer native LDAP. Enterprise options when the time comes: SAML/OIDC SSO via Clerk Enterprise connections against an IdP that fronts LDAP (Entra ID, Keycloak, Okta), or swapping Clerk for a self-hosted option (Keycloak, Auth.js with an LDAP provider). The port plus internal user IDs make this a contained change. Verify current Clerk enterprise capabilities before committing to a path.

### ADR-004: Next.js only now, worker process later
**Status:** Accepted.

- Slice 1 needs no background work, so Next.js route handlers and server actions are enough.
- Webhook receipt and polling reconciliation (Slice 6+) need retries, idempotency, and long-running jobs. Those do not belong in serverless-style request handlers.
- Plan: a `src/worker` entrypoint in the same repo, run as its own process, sharing the module code. The initial queue can be a MongoDB `jobs` collection (atomic `findOneAndUpdate` claim, lease timeout). Move to BullMQ/Redis or a managed queue only if volume demands.
- Webhook route handlers stay thin: verify signature, store raw event idempotently, enqueue, return 200.

### ADR-005: Modular monolith
**Status:** Accepted. See overview. Chosen over microservices because the team is small, the domain boundaries are still moving, and the spec explicitly says modules need not be separate deployables.

### ADR-006: Authorization is application-owned RBAC with scopes
**Status:** Accepted. Details in doc 04. OPA is reserved for *policy/governance* decisions (e.g. "production deployments need two approvers"), not for basic "can this user read this doc" checks, which stay in-process for latency and simplicity.

### ADR-007: Document format and versioning
**Status:** Proposed (needs confirmation).

- Store document content as **Markdown source** in an immutable revision record. This keeps diffs readable, supports Mermaid, and allows later export or Git sync.
- Use a rich-text/Markdown editor in the UI that round-trips Markdown.
- Revisions are immutable rows in `document_revisions`; the `documents` record holds a `headRevision` pointer.
- Git-backed storage is **deferred**. The spec lists "which documents live in Git" as an open decision. A revision-based model in Mongo can later be mirrored to or imported from Git without redesign.
- Alternative considered: block JSON (Tiptap native). Better editing fidelity, worse diffs and portability. Rejected for now.

### ADR-008: Every domain write produces an audit event
**Status:** Accepted. Append-only `audit_events`; no update or delete code path exists for it. This is a Slice 1 requirement, not a later add-on, because governance depends on it.

### ADR-009: Multi-tenancy by `organizationId`
**Status:** Accepted. Single database, `organizationId` on every document, first field of every compound index, injected by the repository base layer. Enterprise customers wanting isolation can get a database-per-tenant later because access is centralized in the repository layer.

## 3. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Clerk lacks LDAP | Enterprise rollout blocked | Identity port, internal user IDs, authorization in our DB, early spike on SSO route |
| MongoDB lacks referential integrity | Dangling references, incoherent graph | Service-level checks, integrity job, soft-delete via status |
| Graph queries get slow | Slow impact analysis | Index edges both directions, depth limits, cache computed impact, revisit store later |
| Authorization leaks via direct queries | Data exposure | Repositories only accessible through services; list endpoints filter by accessible scopes |
| Over-building governance early | Slow first delivery | Slice plan builds only what Slice 1 needs but keeps the model compatible |
| Supabase becomes an extra dependency just for storage | Operational overhead | StorageAdapter keeps it replaceable |
