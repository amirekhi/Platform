# 06. Roadmap and Delivery Slices

Each slice is independently deliverable and leaves the app usable. The order follows spec section 14, adapted to the confirmed stack.

## Slice 0: Foundations (before features)
- Repo scaffold: Next.js + TypeScript strict, lint, format, Vitest, Playwright, CI.
- Docker-compose with MongoDB **replica set**; env/config handling.
- Platform layer skeletons: db client, repository base (org scoping), event bus, audit writer, IdentityProvider port, StorageAdapter port.
- Clerk wired in; sign-in works; internal user linking.
- **Done when:** a signed-in user hits an authenticated page, an audit event is written, CI is green.

## Slice 1: Organization, inventory, access, versioned docs
- Organization, users (invite and link), teams and memberships.
- Roles, role assignments with scope inheritance, `authz.can`, system roles.
- Systems and projects CRUD with ownership and lifecycle status.
- Documents scoped to org/system/project; immutable revisions; conflict detection; history and diff; draft vs published.
- Markdown editor with Mermaid rendering; attachments via Supabase signed URLs.
- Browse by system → project → docs; basic search by title; audit log viewer.
- **Done when:** a team can document a system, edit with history, and access is restricted by role and scope.

## Slice 2: Typed resources and relationships
- `resource_types`, `resources`, `resource_relationships`; lifecycle states; external resources.
- Graph view and impact query (`$graphLookup`).
- Link docs to resources.

## Slice 3: Validation
- Constraint definitions (hard, soft, advisory, conditional); validation runs; exceptions.
- Integrity checks and orphan detection.

## Slice 4: Relevance and onboarding
- Role/team-based landing views, onboarding paths, audience filtering.

## Slice 5: Change governance
- ChangeSets, review and approval, state machine, baseline/approved/current views, reapproval on baseline drift.

## Slice 6: Worker and integration framework
- Worker process, jobs collection, idempotent webhook intake, retry, polling scheduler, field-level authority tracking.

## Slice 7: First integration (GitHub or GitLab)
- Repos, PRs, releases as observations; staleness tracking.

## Slice 8+: CI/CD, registry, infrastructure integrations; reconciliation and drift; evidence; OPA-backed policy; emergency workflow; dashboards.

## Slice 1 detailed backlog (proposed order)

1. Data layer: collections, indexes, Zod schemas, repository base, migrations runner.
2. Identity: Clerk middleware, user linking, invite flow.
3. Authz: permission catalog, roles, assignments, `can`, `accessibleScopes`, tests (including inheritance and deny).
4. Audit: writer plus viewer.
5. Inventory: organizations, systems, projects.
6. Documentation: documents, revisions, conflict handling, history/diff.
7. Editor UI plus Mermaid.
8. Attachments with Supabase.
9. Navigation, search, polish, e2e tests.

## Definition of done (every slice)
- Authorization checks and audit events on all writes.
- Unit tests for domain rules; integration tests against a real Mongo replica set.
- Docs in `/docs` updated; ADR added for any new decision.
- No direct DB access outside repositories.

## Open questions to settle before or during Slice 1

1. **Editor choice**: Tiptap-with-Markdown versus a Markdown-native editor. Affects diff quality and portability (ADR-007).
2. **Tenancy**: single organization per deployment, or true multi-tenant SaaS? The model supports both; it changes onboarding and Clerk organization usage.
3. **Clerk organizations**: use Clerk's organization feature, or keep organizations purely in our DB (recommended, for LDAP portability)?
4. **Search**: Mongo text index is enough initially. Atlas Search or an external index if full-content search matters early.
5. **Hosting target** for Next.js and Mongo (Vercel+Atlas, or self-hosted). Affects the worker plan.
6. **Classification levels**: confirm the four-level scheme (public/internal/confidential/restricted).
7. **Enterprise LDAP timeline**: when it becomes a requirement, so the SSO spike lands early enough.
8. **Spec open decisions** (baseline vs current view precedence, state machine, emergency roles, concurrent ChangeSets): deferred to Slice 5, but we should not contradict them in the meantime.
