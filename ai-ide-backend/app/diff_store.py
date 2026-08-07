# app/diff_store.py
import difflib
import uuid
from dataclasses import dataclass
from typing import Literal, Optional
from app.security import resolve_in_workspace

@dataclass
class PendingChange:
    id: str
    path: str
    action: Literal["create", "modify", "delete"]
    old_content: Optional[str]
    new_content: Optional[str]
    diff_text: str

_store: dict[str, PendingChange] = {}

def _make_diff(path: str, old: str, new: str) -> str:
    old_lines = old.splitlines(keepends=True)
    new_lines = new.splitlines(keepends=True)
    diff = difflib.unified_diff(old_lines, new_lines, fromfile=f"a/{path}", tofile=f"b/{path}")
    return "".join(diff)

def stage_write(path: str, new_content: str) -> PendingChange:
    abs_path = resolve_in_workspace(path)
    if abs_path.exists():
        old_content = abs_path.read_text(encoding="utf-8", errors="replace")
        action = "modify"
    else:
        old_content = ""
        action = "create"
    change = PendingChange(
        id=str(uuid.uuid4()),
        path=path,
        action=action,
        old_content=old_content,
        new_content=new_content,
        diff_text=_make_diff(path, old_content, new_content),
    )
    _store[change.id] = change
    return change

def stage_delete(path: str) -> PendingChange:
    abs_path = resolve_in_workspace(path)
    old_content = abs_path.read_text(encoding="utf-8", errors="replace") if abs_path.exists() else ""
    change = PendingChange(
        id=str(uuid.uuid4()),
        path=path,
        action="delete",
        old_content=old_content,
        new_content=None,
        diff_text=_make_diff(path, old_content, ""),
    )
    _store[change.id] = change
    return change

def get(diff_id: str) -> Optional[PendingChange]:
    return _store.get(diff_id)

def list_pending() -> list[PendingChange]:
    return list(_store.values())

def apply(diff_id: str) -> PendingChange:
    change = _store.get(diff_id)
    if change is None:
        raise KeyError(f"No pending diff with id {diff_id}")
    abs_path = resolve_in_workspace(change.path)
    if change.action == "delete":
        if abs_path.exists():
            abs_path.unlink()
    else:
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_text(change.new_content or "", encoding="utf-8")
    del _store[diff_id]
    return change

def reject(diff_id: str) -> None:
    _store.pop(diff_id, None)