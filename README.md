# Ecosystem: software ecosystem explorer (UI prototype)

A graph-first explorer for documenting and (later) governing a software ecosystem.
Every part of the system is a node; relationships are first-class objects; documents,
diagrams and monitoring attach to nodes **and** relationships. All data is fake for now.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts: `npm run build`, `npm run lint`, `npm run check:fixture`.

## Try it

- Click a system on the **Landscape** to expand it. Click again on other nodes to keep exploring.
- Click a **relation label** on an edge: its own documents and diagrams open on the right. Those are not shown on the connected nodes.
- **Cmd/Ctrl+K** searches nodes, relations and documents (try `payments`, `idempotency`, `stripe webhook`, `ldap`). **Shift+Enter** opens a result in a new tab.
- Open **Shipping Service** (down) or **Payments Service** (degraded) and check the Monitoring tab.

## Layout

```
src/domain      node/relation/doc types and the kind/relation registries
src/data        DataSource interface, fixtures, fixture implementation (+ search)
src/state       zustand store (tabs, selection, expansion) and navigation
src/components  canvas, detail panel, search palette, shell
docs/           architecture package (see docs/README.md and docs/07)
```

The UI only talks to `DataSource`. A MongoDB implementation replaces `FixtureDataSource` in `src/data/index.ts`.
