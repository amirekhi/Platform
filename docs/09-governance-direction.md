# 09. Governance direction

Status: **Direction, not a spec** (2026-11-15). Meant to be iterated. It records what the product is heading towards so that today's choices do not block it. Builds on 04 (auth), 05 (versioning and ChangeSets) and 08 (analysis seam).

## 1. What the platform is for

One place where everything about the enterprise's software meets: its design and documentation, its live data, and the policies and standards it must obey. Because they meet here, it can answer the question nothing else can: **is each system behaving the way the requirements and policies say, from design through to operation?**

Understanding came first. Operation and governance are next.

## 2. Principles

1. **Compliance is first-class.** Frameworks, requirements, policies and controls are modelled, versioned and documented like everything else. A control says **where it is enforced** (a relation to a component, such as a pipeline stage).
2. **Everything is documentable**, on any node or relation, by topic, with versions. Pipelines included.
3. **The model changes only through a process.** A change is a proposal (a ChangeSet). It is reconciled by machine, approved by people, evidenced, and only then committed (see 5).
4. **Declared versus observed.** Live data lets us check that what the model says is what is true. Drift is a finding.
5. **Evidence is graded, not assumed.** Observed, tool-attested, person-attested, uploaded (strongest to weakest). Each control states the minimum it accepts.
6. **Every result is reproducible.** Analysis runs on a pinned snapshot version, so the same question on the same version gives the same answer, and a stale result is detectable.
7. **Atomic.** A proposal is evaluated against one version and applied as one transaction.

## 3. Policies and conflicts

- Policies are versioned. Precedence: regulation, then corporate policy, then team standard.
- A conflict is a finding with three kinds of resolution: change the proposal, request an exception (approved, time-limited, owned), or propose a change to the policy (which is itself a proposal).
- Compliance stances ("this system follows CSV/CSA against these requirements at these levels") are data, with their tests, documents, versions and signatures behind them.

## 4. The platform may itself be regulated

Treat it as likely that this application, if it holds records of record, must itself meet the standards it enforces (validation, audit trail, electronic signatures, access control, backup, change control). To keep that open:

- **Audit trail from the start.** Every write is an append-only event with who, what, when, why, and the before and after. No hard deletes of records.
- **Immutable versions** for anything that can be approved or signed. Edits create a new version.
- **Signature design.** A signature records signer, meaning, time and the exact version hash. Signing requires re-authentication; a login session alone is not enough.
- **Own documentation.** The platform's own requirements, design and test evidence should be modelled in the platform itself, so the first validated system is this one.
- **Deployment as evidence.** Releases of the platform should be traceable to approved changes.
- **Open decision:** whether it is the system of record or an index over an existing QMS. The data model assumes system of record, so either works.

## 5. The change lifecycle

Draft, Reconciling (machine checks with guided resolution), In review (role-based human approvals), Approved (not yet real), Awaiting evidence, Verified, Committed. Ends: withdrawn, rejected, expired, rolled back. The model changes only at Committed. If the base model moved, the proposal is reconciled again.

Reconciliation layers: structural logic, policy, resource and flow (including blast radius), ownership.

## 6. Users, roles and permissions are a prerequisite

Everything above needs to know who is acting and what they may do: who may propose, who approves for which scope, who may sign, who may waive a policy, and that an author cannot approve their own work (segregation of duties). Doc 04 defines the model (user, team, role, permission, scope with inheritance, deny rules, default deny). Needed additions for governance:

- Permissions for propose, reconcile, approve, sign, waive, attach-evidence, and administer-policy.
- **Segregation of duties rules** as data, evaluated by the same engine ("approver is not the proposer").
- Role assignments with expiry and an audit trail of who granted them.
- Approval routing derived from ownership (`ownerId`) and scope.

## 7. Stages

A. Documents (versioned, topic-based, notes, on anything).
B. Compliance model (frameworks, requirements, policies, controls, enforced-at, assurance state).
C. Users, roles and permissions (can run alongside A and B).
D. Proposals (object, preview, diff).
E. Reconciliation (the four layers, guided resolution).
F. Review and approvals.
G. Evidence and commit.
H. Observed-versus-declared checks.

Stages are built UI-first on fixture data, as before, with each stage useful alone.

## 8. Every change is made in the UI, as a proposal

The explorer is also the editor. Adding a node (drag and drop), drawing a relation, retiring something, editing a document: each is made on the canvas or in a document, but it never changes the model directly. It becomes a proposal (a ChangeSet, see 5) that goes through reconciliation, review and evidence. The proposal is itself documented: what was asked, which findings were raised and how each was resolved, who approved, and what evidence closed it. This needs the database and storage first.

## 9. Documents about documents

Three distinct relationships, all first-class:

- **Same topic (nesting).** A document can sit under another: test cases under a protocol, an addendum under an architecture overview. Child documents have their own identity, versions and signatures.
- **Deviation.** A deviation report is a document raised against a specific version, and optionally a section, of another. It has a severity and its own status (open, investigating, corrective action, closed). An open deviation is shown on the document it was found against.
- **A note that needs documenting.** A comment can be flagged as needing a document. It stays open work until a document covers it, and then it points at that document.

Links between documents (references, satisfies, evidences, supersedes, reviews) are separate from these and describe how documents relate, not where they sit.

## 10. The compliance model (built, read-only)

Documents are never gathered "in general". Each one is gathered for a requirement, in a system's programme.

- **Framework**: a regulation, standard or corporate policy, with a version and a precedence. A policy can be built on regulations (`derivedFrom`).
- **Requirement**: one clause of a framework. The same for every system.
- **Control**: how we meet requirements, and the components that enforce it (`enforcedAt`, which are graph nodes such as a pipeline or a service). A control with no components is a visible gap.
- **Programme**: one system's stance (CSV or CSA, risk level, which frameworks). A system can have several; a system with none is shown as "no programme".
- **DocSupport**: a document that defines or evidences a requirement for a programme.
- **Solidity** per requirement: None, Claimed, In review, Approved. It is the weakest of what the requirement needs (for example both a protocol and an executed report), lowered by drafts, signatures that no longer match the text, missing signers, and open deviations. Every step down is given as a reason.

Seen in: the Compliance view (programmes and frameworks), a system's Compliance section, and "Gathered for" on each document.

## 11. The business layer: where scope starts

CSV and CSA apply to enterprise systems because they run regulated business processes, so the model starts there.

- New node kinds: `process` (nestable, may carry `regulated`), `role`, `client`. New layers "Clients & roles" and "Business processes".
- New relations: `supported_by` (process to the system that runs it), `performed_by` (process to role), `involves` (process to client).
- Scope is derived, not entered: a process is regulated through its own `regulated` property or an ancestor's. Whatever a regulated process is `supported_by` (and that target's descendants and ancestors) is in scope. A programme belongs to the nearest ancestor-or-self that has one.
- Lenses: Business map, Regulated scope, Assurance (per programme: gaps / claimed / in review / approved; processes take the worst of what runs them).
- Compliance view splits "In scope, no programme" (the gap list) from "Not in scope" (to be recorded as a decision).
- Fixture data is illustrative only.
