from typing import Literal, Optional
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []

class PendingDiff(BaseModel):
    id: str
    path: str
    action: Literal["create", "modify", "delete"]
    diff_text: str
    new_content: Optional[str] = None

class ToolCallLog(BaseModel):
    name: str
    arguments: dict
    result_summary: str

class ChatResponse(BaseModel):
    reply: str
    history: list[dict]
    pending_diffs: list[PendingDiff]
    tool_calls: list[ToolCallLog]

class ApplyDiffRequest(BaseModel):
    diff_id: str

class DirectoryEntry(BaseModel):
    name: str
    path: str
    is_dir: bool
    children: Optional[list["DirectoryEntry"]] = None

# ----- NEW: Request models for workspace operations -----
class PathRequest(BaseModel):
    path: str

class RenameRequest(BaseModel):
    old_path: str
    new_path: str

class RunRequest(BaseModel):
    path: str

class SetWorkspaceRequest(BaseModel):
    path: str

class SaveFileRequest(BaseModel):
    path: str
    content: str

class SelectModelRequest(BaseModel):
    provider_name: str
    model: str   # rename from model_name

class ChatWithSessionRequest(BaseModel):
    message: str
    session_id: str
    history: list[dict] = []  # kept for compatibility, but we ignore it in the 
class SetApiKeyRequest(BaseModel):
    provider: str
    api_key: str

DirectoryEntry.model_rebuild()