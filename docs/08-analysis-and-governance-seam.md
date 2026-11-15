# 08. Analysis and the governance seam

Status: **Draft v0.1**. Covers blast radius and path trace, and how they prepare for the proposal and reconciliation system.

## 1. Principle: analysis is pure, over a snapshot

All analysis lives in `src/domain/analysis/` and is written as pure functions over a `GraphSnapshot`: an immutable, indexed copy of nodes and relations with a `version` label. Nothing in it reads the UI, the store or the live data source. The UI asks `DataSource.getSnapshot()` and runs the functions.

This is the seam for governance. A proposal is a `ChangeSet` (add or remove nodes and relations). `applyChanges(snapshot, changeSet, "proposal:<id>")` returns a second snapshot. Any check can then run on both and compare: what newly breaks, which owners are affected, which routes disappear. No check needs to know whether it is looking at reality or at a proposal.

## 2. What exists now

| Function | Question |
|---|---|
| `blastRadius(snap, id, {maxDepth, includeSoft})` | What breaks if this goes down, how far, how badly (hard or soft), and which owning teams to tell. |
| `tracePaths(snap, a, b, max)` | The shortest routes from A to B, following arrows when possible, otherwise ignoring direction (flagged). |
| `IMPACT_RULES` (rules.ts) | A data table saying how a failure travels along each relation type. |

Containers stand for what they contain: the origin of a blast is the node plus everything inside it, and a route between two systems may start and end deep inside them.

Results are plain serialisable data (`kind`, `snapshotVersion`, items), so they can be stored on a proposal, sent to an owner for review, or attached to an audit trail.

## 3. Direction for the reconciliation system (not built yet)

- **Layered validation.** Each layer is another pure function `(before, after, changeSet) -> findings`: logic (model rules), possibility (resource and capacity checks), flow (blast radius and path loss between before and after), ownership (who must approve, from `Result.owners`).
- **Atomic.** A proposal is evaluated as one unit against one pinned snapshot version, and applied as one transaction. The `version` on every snapshot and result is there so a stale evaluation can be detected and rejected.
- **Rules as data.** `IMPACT_RULES` should become per-organisation configuration (criticality weights, overrides) rather than code.
- **Not yet decided.** Where ChangeSets are stored, how approvals are routed, and the exact finding format.

## 4. UI

Blast radius (B) and path trace (T) are available from a selected node (toolbar, details panel, touch row, keyboard). The analysis is held on the tab (`Tab.analysis`) and drawn through `AnalysisContext`: rings and hop numbers on nodes, glowing lines, everything else dimmed. Esc closes it.
