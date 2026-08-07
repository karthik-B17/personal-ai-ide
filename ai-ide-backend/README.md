# Personal AI IDE — Backend (v0)

A FastAPI backend that runs a Groq-powered tool-calling agent loop over
a local codebase. This is the first vertical slice: it proves the core
loop end-to-end (read files → Groq plans → tool calls → staged diffs →
human approves → write to disk) before adding a frontend, indexing, or
multi-agent workflows on top.

## How it works

```
POST /chat  { "message": "add input validation to login()" }
        │
        ▼
groq_agent.run_agent_turn()
        │
        ├─ sends system prompt + history + tool schema to Groq
        ├─ Groq responds with tool_calls (read_file, search_code, ...)
        ├─ backend executes each tool via tools.py (path-jailed to WORKSPACE_ROOT)
        ├─ results fed back to Groq, loop continues (max 8 rounds)
        └─ Groq's write_file / delete_file calls STAGE a diff, not a disk write
        │
        ▼
response: { reply, pending_diffs: [...], tool_calls: [...] }
```

Nothing is written to disk until you call:

```
POST /diffs/apply { "diff_id": "..." }
```

or discarded with:

```
POST /diffs/reject { "diff_id": "..." }
```

This is the "diff preview + accept" workflow — safer than auto-apply,
at the cost of an extra click per change. Once you trust it for
low-risk file types, it's a small change to add an "auto-apply" flag
per request.

## Setup

```bash
cd ai-ide-backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

cp .env.example .env
# edit .env:
#   GROQ_API_KEY=your real key
#   GROQ_MODEL=the model you picked (e.g. llama-3.3-70b-versatile,
#               llama-3.1-8b-instant, qwen2.5-coder-32b, etc. — check
#               console.groq.com/docs/models for current tool-calling
#               support, since availability changes)
#   WORKSPACE_ROOT=/absolute/path/to/the/project/you/want/to/edit

./.venv/bin/uvicorn app.main:app --reload --port 8000
```

Then hit it directly to sanity-check before wiring up a frontend:

```bash
curl -s http://localhost:8000/health

curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "list the files in the project root", "history": []}' | python3 -m json.tool
```

## Endpoints

| Method | Path              | Purpose                                      |
|--------|-------------------|-----------------------------------------------|
| GET    | `/health`         | Liveness + confirms which workspace is mounted |
| POST   | `/chat`           | Run one agent turn (may involve many tool calls internally) |
| GET    | `/diffs`          | List all currently pending (unapplied) diffs |
| POST   | `/diffs/apply`    | Write a staged diff to disk                  |
| POST   | `/diffs/reject`   | Discard a staged diff                        |
| GET    | `/workspace/tree` | Recursive file tree (for a sidebar)          |
| GET    | `/workspace/file` | Read a single file's raw content (for Monaco)|

## Safety model — what's actually enforced right now

- **Path jailing** (`app/security.py`): every tool that touches a path
  resolves it against `WORKSPACE_ROOT` and rejects anything that
  escapes it (`../..`, absolute paths, symlink traversal). Verified
  with a smoke test during development.
- **No direct writes**: `write_file`/`delete_file` only ever create a
  `PendingChange` in `diff_store.py`. The filesystem is untouched
  until `/diffs/apply` is called.
- **Terminal denylist**: `run_terminal` blocks an initial list of
  obviously destructive command prefixes (`rm -rf /`, fork bombs,
  `mkfs`, etc.) and can be disabled entirely with `ALLOW_TERMINAL=false`.
  This is a shallow guard, not a sandbox — only approve commands you'd
  approve in a PR.
- **Iteration cap**: `MAX_AGENT_ITERATIONS` stops runaway tool-call
  loops (default 8 round-trips per user turn).
- **Size cap**: `MAX_FILE_READ_BYTES` stops the agent from dumping a
  huge file into context and blowing your token budget.

What's *not* handled yet (fine for personal single-user use, revisit
before sharing this with anyone else): no auth on the API, no rate
limiting, in-memory diff store (lost on restart — apply or reject
before you kill the process), CORS is wide open to localhost dev ports.

## Next slice

With this working, the natural next steps from your original plan are:

1. **Frontend**: React + Monaco + a diff view (Monaco has a built-in
   `DiffEditor`) + xterm.js, calling these exact endpoints.
2. **Workspace index**: cache file/class/function names on startup
   (via `ast` for Python, a JS/TS parser for the rest) so `/chat` can
   pass Groq a short relevant-files list instead of relying on it to
   `list_directory`/`search_code` its way there every time.
3. **edit_file(path, diff)** as a second write tool for small
   surgical changes, so the model isn't forced to resend whole files
   for one-line fixes.
