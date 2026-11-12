# Software Ecosystem Platform: Architecture Package

Status: **Draft v0.1** (2026-11-10)

This folder holds the design docs. They are written as plain Markdown with Mermaid diagrams so they live in the repo, are reviewed via PRs, and can later be ingested by the platform itself.

| # | Doc | Contents |
|---|-----|----------|
| 01 | [Architecture overview](01-architecture-overview.md) | Context, containers, modules, repo layout, request flow |
| 02 | [Tech stack and decisions (ADRs)](02-tech-stack-and-adrs.md) | Stack, rationale, trade-offs, risks |
| 03 | [Domain and data model](03-domain-model.md) | MongoDB collections, ER diagram, indexes, conventions |
| 04 | [Auth and authorization](04-auth-and-authorization.md) | Clerk now, LDAP later, RBAC with scopes |
| 05 | [Versioning and change model](05-versioning-and-change-model.md) | Immutable revisions, audit, future ChangeSets, state machine |
| 06 | [Roadmap and delivery slices](06-roadmap-and-slices.md) | Original slice plan (superseded in part by 07) |
| 07 | [Graph model and UI prototype](07-graph-model-and-ui-prototype.md) | **Current direction:** nodes, relations, relation-owned docs, search, canvas behaviour, revised roadmap |

Source product spec: `software-ecosystem-platform-design.md`.

> **Direction change (2026-11-11):** the product is graph-first. Doc 07 supersedes the document model in doc 03 and the slice order in doc 06.

## Decisions confirmed with the product owner

- Database: **MongoDB** (all domain data).
- Storage: **Supabase Storage only** (files and evidence blobs). No Supabase auth or Postgres.
- Auth: **Clerk first, LDAP/enterprise directory later**.
- Backend: **Next.js only** (route handlers and server actions), with a separate worker process added later for sync jobs.
- Docs live in `/docs` as Markdown.
- First build slice: **org, systems, projects, auth, and versioned docs**.

## Guiding principle for the build

Documentation system first, governance later, but **design the data model now so governance does not require a rewrite**. That means immutable revisions, an append-only audit log, scoped authorization, and a resource/relationship model from day one, even though Slice 1 only exposes part of it.
