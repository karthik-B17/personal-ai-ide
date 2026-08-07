from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import shutil
import asyncio
import subprocess
import json
import threading
import queue
import logging
from app.config import PROVIDER_CONFIGS
from app.database import get_api_key, set_api_key, delete_api_key, get_all_api_keys
from app.config import set_workspace_root
from app.workspace_state import save_workspace_root

from app.config import WORKSPACE_ROOT, ACTIVE_PROVIDERS
from app.models import (
    ChatRequest, ChatResponse, ApplyDiffRequest, DirectoryEntry,
    PathRequest, RenameRequest, RunRequest, SetWorkspaceRequest,
    SelectModelRequest, SaveFileRequest, ChatWithSessionRequest ,SetApiKeyRequest
)

from app.database import (
    create_session, get_sessions, delete_session, update_session_title,
    add_message, get_messages
)
from app.security import resolve_in_workspace, is_ignored
from app.agent import run_agent_turn, pending_diffs_payload
from app.provider_manager import manager
from app import diff_store

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Personal AI IDE Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "workspace_root": str(WORKSPACE_ROOT)}

@app.get("/models")
def list_models():
    return {"providers": ACTIVE_PROVIDERS}

@app.post("/models/select")
def select_model(req: SelectModelRequest):
    success = manager.set_active_provider(req.provider_name, req.model)
    if not success:
        raise HTTPException(status_code=404, detail="Provider/Model not found")
    return {"status": "ok", "active": manager.get_active_provider()}

# ----- Chat -----
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatWithSessionRequest):
    # Check if this is the first message in the session
    existing_messages = get_messages(req.session_id)
    if not existing_messages:
        # Generate title from user message
        title = req.message.strip()
        if len(title) > 40:
            title = title[:40] + "..."
        if not title:
            title = "New Chat"
        update_session_title(req.session_id, title)

    # Save user message
    add_message(req.session_id, "user", req.message)

    # Get full history (including the user message we just saved)
    db_history = get_messages(req.session_id)
    history = []
    for msg in db_history:
        entry = {"role": msg["role"], "content": msg["content"]}
        if "tool_calls" in msg:
            entry["tool_calls"] = msg["tool_calls"]
        history.append(entry)

    reply, new_history, tool_log = run_agent_turn(req.message, history)
    add_message(req.session_id, "assistant", reply)

    return ChatResponse(
        reply=reply,
        history=new_history,
        pending_diffs=pending_diffs_payload(),
        tool_calls=tool_log,
    )

# ----- Diffs -----
@app.get("/diffs")
def list_diffs():
    return pending_diffs_payload()

@app.post("/diffs/apply")
def apply_diff(req: ApplyDiffRequest):
    try:
        change = diff_store.apply(req.diff_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Diff not found")
    return {"applied": True, "path": change.path, "action": change.action}

@app.post("/diffs/reject")
def reject_diff(req: ApplyDiffRequest):
    diff_store.reject(req.diff_id)
    return {"rejected": True}

# ----- Workspace operations (no dynamic root) -----
@app.post("/workspace/mkdir")
def mkdir(req: PathRequest):
    abs_path = resolve_in_workspace(req.path)
    if abs_path.exists():
        raise HTTPException(status_code=400, detail="Path already exists")
    abs_path.mkdir(parents=True, exist_ok=True)
    return {"success": True, "path": str(abs_path)}

@app.post("/workspace/touch")
def touch(req: PathRequest):
    abs_path = resolve_in_workspace(req.path)
    if abs_path.exists():
        raise HTTPException(status_code=400, detail="File already exists")
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.touch()
    return {"success": True, "path": str(abs_path)}

@app.post("/workspace/set-root")
def set_workspace_root_endpoint(req: SetWorkspaceRequest):
    logging.info(f"Received set-root request with path: {req.path}")
    new_path = Path(req.path).resolve()
    if not new_path.exists():
        logging.error(f"Path does not exist: {new_path}")
        raise HTTPException(status_code=400, detail=f"Path does not exist: {new_path}")
    # Update the global root in config and persist
    set_workspace_root(new_path)
    logging.info(f"Workspace root updated to: {new_path}")
    return {"status": "ok", "workspace_root": str(new_path)}

@app.patch("/workspace/rename")
def rename(req: RenameRequest):
    old_abs = resolve_in_workspace(req.old_path)
    if not old_abs.exists():
        raise HTTPException(status_code=404, detail="Source does not exist")
    new_abs = resolve_in_workspace(req.new_path)
    if new_abs.exists():
        raise HTTPException(status_code=400, detail="Target already exists")
    old_abs.rename(new_abs)
    return {"success": True, "old": req.old_path, "new": req.new_path}

@app.delete("/workspace/delete")
def delete(req: PathRequest):
    abs_path = resolve_in_workspace(req.path)
    if not abs_path.exists():
        raise HTTPException(status_code=404, detail="Path does not exist")
    if abs_path.is_dir():
        shutil.rmtree(abs_path)
    else:
        abs_path.unlink()
    return {"success": True, "path": str(abs_path)}

@app.post("/workspace/run")
def run_file_endpoint(req: RunRequest):
    from app.run_file import run_file
    return run_file(req.path)

@app.post("/workspace/save")
def save_file(req: SaveFileRequest):
    abs_path = resolve_in_workspace(req.path)
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_text(req.content, encoding="utf-8")
    return {"success": True, "path": str(abs_path)}

# ----- Terminal with PTY -----
if os.name == "nt":
    from winpty import PtyProcess
else:
    from ptyprocess import PtyProcess

@app.websocket("/terminal/ws")
async def terminal_websocket(websocket: WebSocket):
    await websocket.accept()
    shell_cmd = "powershell.exe" if os.name == "nt" else "/bin/bash"

    try:
        if os.name == "nt":
            proc = PtyProcess.spawn(shell_cmd, cwd=str(WORKSPACE_ROOT))
        else:
            proc = PtyProcess.spawn([shell_cmd], cwd=str(WORKSPACE_ROOT))
    except Exception as e:
        await websocket.send_text(f"Error launching PTY: {e}")
        await websocket.close()
        return

    output_queue = queue.Queue()

    def reader():
        while True:
            try:
                data = proc.read(1024)
                if not data:
                    break
                output_queue.put(data)
            except Exception:
                break

    thread = threading.Thread(target=reader, daemon=True)
    thread.start()

    try:
        while True:
            while not output_queue.empty():
                data = output_queue.get_nowait()
                await websocket.send_bytes(data)
            data = await websocket.receive_text()
            proc.write(data)
    except WebSocketDisconnect:
        pass
    finally:
        proc.terminate()
        thread.join(timeout=1)

# ----- File tree -----
def _build_tree(path: Path, depth: int, max_depth: int = 4) -> DirectoryEntry:
    try:
        rel = str(path.relative_to(WORKSPACE_ROOT))
    except ValueError:
        rel = path.name

    entry = DirectoryEntry(
        name=path.name or str(WORKSPACE_ROOT),
        path=rel if rel != "." else "",
        is_dir=path.is_dir(),
        children=[]
    )

    if path.is_dir() and depth < max_depth:
        children = []
        try:
            for child in sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
                if is_ignored(child):
                    continue
                children.append(_build_tree(child, depth + 1, max_depth))
        except PermissionError:
            pass
        entry.children = children

    return entry

@app.get("/workspace/tree", response_model=DirectoryEntry)
def workspace_tree():
    root_path = Path(WORKSPACE_ROOT)
    if not root_path.exists():
        raise HTTPException(status_code=404, detail="Workspace root does not exist")
    return _build_tree(root_path, depth=0)

@app.get("/workspace/file")
def workspace_file(path: str):
    abs_path = resolve_in_workspace(path)
    if not abs_path.exists() or not abs_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return {"path": path, "content": abs_path.read_text(encoding="utf-8", errors="replace")}
# ----- API Key Management -----
@app.get("/api-keys")
def list_api_keys():
    # Return the list of providers that have keys (or we can return all known providers with a boolean)
    all_providers = list(PROVIDER_CONFIGS.keys())  # ['groq','gemini','huggingface']
    db_keys = get_all_api_keys()
    result = []
    for provider in all_providers:
        result.append({
            "provider": provider,
            "has_key": provider in db_keys
        })
    return result

@app.post("/api-keys")
def set_api_key_endpoint(req: SetApiKeyRequest):
    set_api_key(req.provider, req.api_key)
    manager.refresh_keys()
    return {"status": "ok", "provider": req.provider}

@app.delete("/api-keys/{provider}")
def delete_api_key_endpoint(provider: str):
    delete_api_key(provider)
    manager.refresh_keys()
    return {"status": "ok", "provider": provider}

@app.get("/sessions")
def list_sessions():
    return get_sessions()

@app.post("/sessions")
def new_session():
    sid = create_session()
    return {"id": sid, "title": "New Chat"}

@app.delete("/sessions/{session_id}")
def delete_session_route(session_id: str):
    delete_session(session_id)
    return {"status": "ok"}

@app.patch("/sessions/{session_id}")
def rename_session(session_id: str, title: str):
    update_session_title(session_id, title)
    return {"status": "ok"}

@app.get("/sessions/{session_id}/messages")
def session_messages(session_id: str):
    return get_messages(session_id)