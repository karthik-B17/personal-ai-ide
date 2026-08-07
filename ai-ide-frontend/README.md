# Personal AI IDE — Frontend (v0)

React + Monaco + Tailwind UI for the FastAPI/Groq backend from the
previous slice. Three panels:

- **Left** — workspace file tree (click a file to view it, read-only)
- **Center** — Monaco code viewer
- **Right** — chat with the agent (top) and pending diffs to review (bottom)

Nothing is written to disk from here — every edit the assistant proposes
shows up as a card in "Pending changes" with a real Monaco diff view.
Hit **Accept** to write it to disk, or **Reject** to discard it.

## Setup

Requires Node 18+.

```powershell
cd ai-ide-frontend
npm install
npm run dev
```

Then open the URL it prints — normally `http://localhost:5173`.

Make sure the backend is running first (`uvicorn app.main:app --reload
--port 8000` from `ai-ide-backend`) — the top bar shows "Backend
connected" / "Backend unreachable" so you'll know immediately if it's
not up.

### Pointing at a different backend URL

By default the frontend talks to `http://localhost:8000`. If your
backend runs somewhere else, copy `.env.example` to `.env` and set:

```
VITE_API_BASE_URL=http://localhost:8000
```

then restart `npm run dev` (Vite only reads `.env` at startup).

## Project layout

```
src/
  api.ts              fetch wrappers for every backend endpoint
  store.ts             Zustand store: workspace tree, chat, pending diffs
  types.ts              shared TS types matching the backend's Pydantic models
  lib/language.ts       file-extension -> Monaco language id
  components/
    TopBar.tsx           title + backend connectivity indicator
    FileTree.tsx          recursive workspace tree, amber dot = pending change
    CodeViewer.tsx         read-only Monaco viewer for the selected file
    ChatPanel.tsx           message list + input + tool-call log (collapsible)
    DiffPanel.tsx            pending diffs, each with a Monaco DiffEditor + Accept/Reject
```

## Design notes

Dark charcoal base (`#14151A`) rather than pure black, amber (`#D9A441`)
as the one accent color — used consistently for the "this is staged /
needs your attention" signal (the rail on diff cards, the pending-change
dot in the file tree, the send button). Diff add/delete colors are
intentionally muted rather than neon so they read calmly next to Monaco's
own syntax highlighting. Manrope for UI text, JetBrains Mono for
anything code-shaped.

## Known limitations of this slice

- No live terminal view — `run_terminal` output only shows up inside
  the chat's collapsible tool-call log, not as a persistent shell.
  Adding an xterm.js panel wired to a WebSocket is a natural next step.
- Chat history is kept in memory only (Zustand, no persistence) —
  refreshing the page clears the conversation. Pending diffs also live
  only in the backend's in-memory store, so a backend restart loses
  anything not yet applied.
- File tree doesn't auto-refresh on a timer; it refreshes after you
  apply a diff, or if you click the refresh icon in the sidebar header.
- No editing directly in the Monaco viewer (it's intentionally
  read-only) — all edits flow through the assistant and the diff-review
  step, per how this slice was scoped.
