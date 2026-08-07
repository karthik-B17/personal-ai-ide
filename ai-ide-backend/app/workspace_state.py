import json
from pathlib import Path

STATE_FILE = Path(__file__).parent.parent / "workspace.json"

def load_workspace_root(default: str) -> str:
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r") as f:
                data = json.load(f)
                return data.get("workspace_root", default)
        except Exception:
            pass
    return default

def save_workspace_root(root: str):
    with open(STATE_FILE, "w") as f:
        json.dump({"workspace_root": root}, f)