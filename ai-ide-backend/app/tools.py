import subprocess
from app.config import MAX_FILE_READ_BYTES, ALLOW_TERMINAL, WORKSPACE_ROOT
from app.security import resolve_in_workspace, is_ignored, check_command_allowed, UnsafeCommandError
from app import diff_store

TOOL_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the full contents of a file in the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path relative to the workspace root, e.g. backend/auth.py"},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "List files and subdirectories at a given path in the workspace (non-recursive).",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path relative to workspace root. Use '.' for the root."},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_code",
            "description": "Search the workspace for a text/regex pattern across files. Returns matching file:line results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Text or regex pattern to search for."},
                    "path": {"type": "string", "description": "Optional subdirectory to restrict the search to."},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": (
                "Propose creating or overwriting a file with new full content. "
                "This does NOT write to disk -- it stages a diff for human review. "
                "Always provide the COMPLETE new file content, not a partial patch."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path relative to workspace root."},
                    "content": {"type": "string", "description": "The complete new content of the file."},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_file",
            "description": "Propose deleting a file. Stages the deletion for human review; does not delete immediately.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path relative to workspace root."},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_terminal",
            "description": (
                "Run a shell command inside the workspace root (e.g. to run tests or a linter). "
                "Use sparingly -- prefer read_file/search_code for inspection."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "The shell command to execute."},
                },
                "required": ["command"],
            },
        },
    },
]

def read_file(path: str) -> str:
    abs_path = resolve_in_workspace(path)
    if not abs_path.exists() or not abs_path.is_file():
        return f"ERROR: file not found: {path}"
    data = abs_path.read_bytes()
    if len(data) > MAX_FILE_READ_BYTES:
        return f"ERROR: file too large ({len(data)} bytes) ... use search_code."
    return data.decode("utf-8", errors="replace")

def list_directory(path: str) -> str:
    abs_path = resolve_in_workspace(path)
    if not abs_path.exists() or not abs_path.is_dir():
        return f"ERROR: directory not found: {path}"
    entries = []
    for child in sorted(abs_path.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
        if is_ignored(child):
            continue
        entries.append(f"{'📁' if child.is_dir() else '📄'} {child.name}")
    return "\n".join(entries) if entries else "(empty directory)"

def search_code(query: str, path: str = ".") -> str:
    abs_path = resolve_in_workspace(path)
    if not abs_path.exists():
        return f"ERROR: path not found: {path}"
    try:
        result = subprocess.run(
            ["grep", "-r", "-n", "-I", "--exclude-dir=.git", "--exclude-dir=node_modules",
             "--exclude-dir=.venv", "--exclude-dir=__pycache__", query, str(abs_path)],
            capture_output=True, text=True, timeout=15,
        )
    except Exception as e:
        return f"ERROR running search: {e}"
    if result.returncode not in (0, 1):
        return f"ERROR: {result.stderr[:500]}"
    lines = result.stdout.splitlines()[:100]
    relative_lines = [line.replace(str(WORKSPACE_ROOT) + "/", "") for line in lines]
    return "\n".join(relative_lines) if relative_lines else "No matches found."

def write_file(path: str, content: str) -> str:
    change = diff_store.stage_write(path, content)
    return f"Staged {change.action} for '{path}' (diff id: {change.id}). Not written to disk yet -- pending human review."

def delete_file(path: str) -> str:
    change = diff_store.stage_delete(path)
    return f"Staged delete for '{path}' (diff id: {change.id}). Not deleted yet -- pending human review."

def run_terminal(command: str) -> str:
    if not ALLOW_TERMINAL:
        return "ERROR: terminal execution is disabled (ALLOW_TERMINAL=false)."
    try:
        check_command_allowed(command)
    except UnsafeCommandError as e:
        return f"ERROR: {e}"
    try:
        result = subprocess.run(
            command, shell=True, cwd=str(WORKSPACE_ROOT),
            capture_output=True, text=True, timeout=60,
        )
    except subprocess.TimeoutExpired:
        return "ERROR: command timed out after 60s."
    except Exception as e:
        return f"ERROR: {e}"
    output = f"exit_code={result.returncode}\n--- stdout ---\n{result.stdout[-4000:]}\n--- stderr ---\n{result.stderr[-2000:]}"
    return output

DISPATCH = {
    "read_file": read_file,
    "list_directory": list_directory,
    "search_code": search_code,
    "write_file": write_file,
    "delete_file": delete_file,
    "run_terminal": run_terminal,
}