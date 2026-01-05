# Spaghetti Factory Floor Planner (MVP)

A Vite + React + TypeScript web app for planning production floor layouts, flow paths, and basic routing validation.

## Development

```bash
npm install
npm run dev
```

Vite will print the local dev URL (typically `http://localhost:5173`).

## Using the app

- **Left palette**: add workstations, people, shelves, docks, lanes, and doors.
- **Center canvas**: drag nodes, resize from corner handles, rotate using the top handle, and pan/zoom.
- **Right panel**: edit properties for the selected node or flow. When nothing is selected, adjust floor size, grid, and sync endpoint.
- **Top bar**: select tools, add flows, toggle animation, sync, import/export, and reset/load sample data.

### Keyboard + mouse shortcuts

- **Delete/Backspace**: delete selected node/flow
- **Ctrl/Cmd + drag**: duplicate selected node
- **Space (hold) + drag**: temporary pan
- **Mouse wheel**: zoom around cursor
- **Shift while creating flows**: add waypoints by clicking empty stage
- **Double-click empty stage**: add a workstation

### Data persistence

State is persisted to `localStorage` under `spaghetti-factory-store`. Use **Export** to download JSON, **Import** to load JSON, or **Load sample** to insert example data.

## Sync contract

The sync adapter uses a configurable endpoint URL and expects:

- `GET {endpoint}?action=load` → returns the full JSON state.
- `POST {endpoint}?action=save` → receives the JSON state and responds with `{ "ok": true }`.

The app performs simple conflict handling using the `lastModified` timestamp. The newest state wins and the UI displays a warning when remote data overwrites newer local data (or when local data is newer than remote).

## Project structure

- `src/models` — domain types and schema
- `src/render` — canvas rendering + hit testing
- `src/state` — Zustand store + persistence
- `src/sync` — sync adapters
- `src/components` — UI panels
- `src/sampleState.ts` — sample data for quick start
