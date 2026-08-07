# Backend App Directory (`/app`)

This directory contains the core backend logic for the AI IDE. Each module has a specific responsibility.

## 📂 File Structure & Purpose

| File | Purpose |
|------|---------|
| **`agent.py`** | The main agent loop. Handles the tool‑calling conversation with the AI model – it sends messages, receives tool calls, executes them, and repeats until the model gives a final reply. |
| **`config.py`** | Central configuration. Loads environment variables, defines which providers (Groq, Gemini, Hugging Face) and models are available, and sets the workspace root. |
| **`database.py`** | SQLite database interactions. Manages chat sessions, messages, and user‑provided API keys. All persistent storage lives here. |
| **`diff_store.py`** | In‑memory staging area for file changes. The agent uses `write_file` and `delete_file` to stage diffs here; they are not written to disk until the user accepts them. |
| **`main.py`** | FastAPI application entry point. Defines all REST endpoints (health, chat, diffs, sessions, workspace tree, file operations, API key management) and the WebSocket for the terminal. |
| **`models.py`** | Pydantic models (request/response schemas). Used by FastAPI for validation and serialisation. |
| **`provider_manager.py`** | Multi‑provider client manager. Handles instantiation of Groq, Gemini, and Hugging Face clients. Overrides API keys with user‑provided keys from the database. |
| **`run_file.py`** | Executes files (Python, JavaScript, HTML, etc.) when the user clicks the "Run" button in the code editor. Returns stdout/stderr and exit code. |
| **`security.py`** | Path safety and command denylist. Ensures all file paths are inside the workspace root and blocks dangerous terminal commands (`rm -rf /`, `sudo rm`, etc.). |
| **`tools.py`** | Defines the tool schemas and their implementations. Tools are: `read_file`, `list_directory`, `search_code`, `write_file`, `delete_file`, and `run_terminal`. |
| **`workspace_state.py`** | Persists the workspace root path to a JSON file (`workspace.json`). Used to remember the workspace across server restarts. |

## 🔧 How to Modify

- **Add a new tool** → edit `tools.py` (add function → add to `TOOL_SCHEMA` → add to `DISPATCH`).
- **Add a new provider** → edit `config.py` (add to `PROVIDER_CONFIGS`) and `provider_manager.py` if needed.
- **Add a new endpoint** → edit `main.py`.
- **Change agent behaviour** → edit `agent.py` (system prompt, loop logic, error handling).
- **Change database schema** → edit `database.py` (tables and CRUD functions).

## 📌 Dependencies

All Python dependencies are listed in `../requirements.txt`.
