from pathlib import Path
from app.config import WORKSPACE_ROOT, IGNORED_DIR_NAMES

class UnsafePathError(Exception):
    pass

def resolve_in_workspace(relative_path: str) -> Path:
    if relative_path is None or relative_path.strip() == "":
        raise UnsafePathError("Empty path.")
    candidate = Path(relative_path)
    if candidate.is_absolute():
        raise UnsafePathError(f"Path must be relative to the workspace, got absolute path: {relative_path}")
    resolved = (WORKSPACE_ROOT / candidate).resolve()
    try:
        resolved.relative_to(WORKSPACE_ROOT)
    except ValueError:
        raise UnsafePathError(f"Path '{relative_path}' resolves outside the workspace root.")
    for part in resolved.relative_to(WORKSPACE_ROOT).parts:
        if part in IGNORED_DIR_NAMES:
            raise UnsafePathError(f"Path touches a protected directory: {part}")
    return resolved

def is_ignored(path: Path) -> bool:
    return any(part in IGNORED_DIR_NAMES for part in path.parts)

# Terminal command denylist (unchanged)
_DENYLISTED_PREFIXES = (
    "rm -rf /", "rm -rf /*", ":(){:|:&};:", "mkfs", "dd if=", "shutdown",
    "reboot", "> /dev/sda", "chmod -R 777 /", "sudo rm",
)

class UnsafeCommandError(Exception):
    pass

def check_command_allowed(command: str) -> None:
    normalized = " ".join(command.strip().split())
    for bad in _DENYLISTED_PREFIXES:
        if normalized.startswith(bad):
            raise UnsafeCommandError(f"Blocked potentially destructive command: {command}")