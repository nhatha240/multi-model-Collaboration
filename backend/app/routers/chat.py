"""
WebSocket endpoint for real-time multi-model chat.

Flow:
  1. Client connects to /ws/{project_id}
  2. Client sends JSON: {"message": "..."}
  3. Server processes with ClaudeOrchestrator
  4. Events stream back: {type, agent, content, meta}
  5. Final response is saved to DB
"""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.db_models import Project, Message, Task, TaskStatus
from app.agents.orchestrator import ClaudeOrchestrator
from app.agents.workspace_cli import WorkspaceCLIPipeline

router = APIRouter(tags=["chat"])

# One orchestrator instance reused across requests (stateless)
orchestrator = ClaudeOrchestrator()
workspace_cli = WorkspaceCLIPipeline()


@router.websocket("/ws/{project_id}")
async def websocket_chat(websocket: WebSocket, project_id: int):
    await websocket.accept()
    active_task: asyncio.Task | None = None
    active_task_id: int | None = None
    project: Project | None = None

    async def mark_task_failed(task_id: int | None, result: str):
        if not task_id:
            return
        async with AsyncSessionLocal() as db:
            task_db = await db.get(Task, task_id)
            if task_db and task_db.status == TaskStatus.running:
                task_db.status = TaskStatus.failed
                task_db.result = result[:2000]
                await db.commit()

    async def cancel_active_task(reason: str):
        nonlocal active_task, active_task_id
        if not active_task or active_task.done():
            active_task = None
            active_task_id = None
            return

        task_id = active_task_id
        active_task.cancel()
        try:
            await active_task
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

        await mark_task_failed(task_id, reason)

        try:
            await websocket.send_json({
                "type": "task_update",
                "agent": "system",
                "content": "Task cancelled",
                "meta": {"task_id": task_id, "status": "failed"},
            })
        except Exception:
            pass

        active_task = None
        active_task_id = None

    async def process_message(user_message: str):
        nonlocal active_task_id, project
        assert project is not None

        # --- Save user message ---
        async with AsyncSessionLocal() as db:
            msg = Message(
                project_id=project_id,
                role="user",
                content=user_message,
            )
            db.add(msg)
            await db.commit()

            result = await db.execute(
                select(Message)
                .where(Message.project_id == project_id)
                .order_by(Message.created_at.asc())
            )
            all_messages = result.scalars().all()

        history = []
        for m in all_messages[:-1]:
            if m.role in ("user", "claude", "codex"):
                history.append({
                    "role": "user" if m.role == "user" else "assistant",
                    "content": m.content,
                })

        async with AsyncSessionLocal() as db:
            task = Task(
                project_id=project_id,
                title=user_message[:200],
                description=user_message,
                status=TaskStatus.running,
                assigned_to="codex" if getattr(project, "local_path", "") else "claude",
            )
            db.add(task)
            await db.commit()
            await db.refresh(task)
            task_id = task.id

        active_task_id = task_id

        await websocket.send_json({
            "type": "task_update",
            "agent": "system",
            "content": "Task started",
            "meta": {"task_id": task_id, "status": "running"},
        })

        async def on_event(agent: str, content: str, event_type: str):
            await websocket.send_json({
                "type": event_type,
                "agent": agent,
                "content": content,
            })

        try:
            if getattr(project, "local_path", ""):
                claude_output, codex_output = await workspace_cli.run(
                    workspace_path=project.local_path,
                    user_message=user_message,
                    history=history,
                    on_event=on_event,
                )
                final_response = codex_output or claude_output

                async with AsyncSessionLocal() as db:
                    if claude_output:
                        db.add(Message(project_id=project_id, role="claude", content=claude_output))
                    if codex_output:
                        db.add(Message(project_id=project_id, role="codex", content=codex_output))
                    task_db = await db.get(Task, task_id)
                    if task_db:
                        task_db.status = TaskStatus.completed
                        task_db.result = final_response[:2000]
                    await db.commit()
            else:
                project_context_parts = [f"Project: {project.name}"]
                if project.description:
                    project_context_parts.append(project.description)
                if getattr(project, "local_path", ""):
                    project_context_parts.append(f"Local workspace: {project.local_path}")
                project_context = "\n".join(project_context_parts)

                final_response = await orchestrator.process(
                    user_message=user_message,
                    project_context=project_context,
                    history=history,
                    on_event=on_event,
                )

                async with AsyncSessionLocal() as db:
                    db.add(Message(project_id=project_id, role="claude", content=final_response))
                    task_db = await db.get(Task, task_id)
                    if task_db:
                        task_db.status = TaskStatus.completed
                        task_db.result = final_response[:2000]
                    await db.commit()

            await websocket.send_json({
                "type": "task_update",
                "agent": "system",
                "content": "Task completed",
                "meta": {"task_id": task_id, "status": "completed"},
            })
        except asyncio.CancelledError:
            raise
        except Exception as e:
            await mark_task_failed(task_id, str(e))
            await websocket.send_json({
                "type": "error",
                "agent": "system",
                "content": f"Error: {str(e)}",
            })
        finally:
            active_task_id = None

    try:
        async with AsyncSessionLocal() as db:
            project = await db.get(Project, project_id)
            if not project:
                await websocket.send_json({"type": "error", "content": "Project not found"})
                await websocket.close()
                return

        while True:
            if active_task and active_task.done():
                try:
                    await active_task
                except asyncio.CancelledError:
                    pass
                except Exception:
                    pass
                active_task = None

            raw = await websocket.receive_text()
            data = json.loads(raw)

            if data.get("type") == "cancel":
                await cancel_active_task("Task cancelled because the client switched projects or disconnected.")
                continue

            user_message = data.get("message", "").strip()
            if not user_message:
                continue

            if active_task and not active_task.done():
                await websocket.send_json({
                    "type": "error",
                    "agent": "system",
                    "content": "A task is already running for this project.",
                })
                continue

            active_task = asyncio.create_task(process_message(user_message))

    except WebSocketDisconnect:
        await cancel_active_task("Task cancelled because the client switched projects or disconnected.")
