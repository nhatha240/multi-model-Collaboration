from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.db_models import Project, Task, Message
from app.models.schemas import (
    MessageOut,
    ProjectCreate,
    ProjectFileContent,
    ProjectFileEntry,
    ProjectOut,
    ProjectUpdate,
    TaskOut,
)
from app.project_files import get_project_root, list_directory, read_text_file, write_text_file

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=ProjectOut)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    normalized_local_path = data.local_path.strip()
    if normalized_local_path:
        get_project_root(normalized_local_path)

    project = Project(
        name=data.name,
        description=data.description,
        local_path=normalized_local_path,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: int, data: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.local_path is not None:
        normalized_local_path = data.local_path.strip()
        if normalized_local_path:
            get_project_root(normalized_local_path)
        project.local_path = normalized_local_path

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
    return {"ok": True}


@router.get("/{project_id}/tasks", response_model=list[TaskOut])
async def get_tasks(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Task).where(Task.project_id == project_id).order_by(Task.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{project_id}/messages", response_model=list[MessageOut])
async def get_messages(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message)
        .where(Message.project_id == project_id)
        .order_by(Message.created_at.asc())
    )
    return result.scalars().all()


@router.get("/{project_id}/files", response_model=list[ProjectFileEntry])
async def get_project_files(
    project_id: int,
    path: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    root = get_project_root(project.local_path)
    return list_directory(root, path)


@router.get("/{project_id}/files/content", response_model=ProjectFileContent)
async def get_project_file_content(
    project_id: int,
    path: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    root = get_project_root(project.local_path)
    return ProjectFileContent(path=path, content=read_text_file(root, path))


@router.put("/{project_id}/files/content", response_model=ProjectFileContent)
async def save_project_file_content(
    project_id: int,
    data: ProjectFileContent,
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    root = get_project_root(project.local_path)
    write_text_file(root, data.path, data.content)
    return data
