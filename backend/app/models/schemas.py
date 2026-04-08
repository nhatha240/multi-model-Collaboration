from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# --- Project ---
class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    local_path: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    local_path: str | None = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    local_path: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectFileEntry(BaseModel):
    name: str
    path: str
    type: str


class ProjectFileContent(BaseModel):
    path: str
    content: str


# --- Task ---
class TaskCreate(BaseModel):
    title: str
    description: str = ""
    assigned_to: str = "claude"


class TaskOut(BaseModel):
    id: int
    project_id: int
    title: str
    description: str
    status: str
    assigned_to: str
    result: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Message ---
class MessageOut(BaseModel):
    id: int
    project_id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Chat ---
class ChatRequest(BaseModel):
    message: str
    project_id: int


# --- WebSocket events ---
class WSEvent(BaseModel):
    type: str  # "thinking" | "message" | "task_update" | "delegation" | "done"
    agent: str  # "claude" | "openai" | "system"
    content: str
    meta: Optional[dict] = None
