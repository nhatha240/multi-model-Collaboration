from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def init_db():
    async with engine.begin() as conn:
        from app.models.db_models import Project, Task, Message  # noqa
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_apply_migrations)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


def _apply_migrations(conn):
    inspector = inspect(conn)

    if "projects" not in inspector.get_table_names():
        return

    project_columns = {column["name"] for column in inspector.get_columns("projects")}
    if "local_path" not in project_columns:
        conn.execute(text("ALTER TABLE projects ADD COLUMN local_path TEXT DEFAULT ''"))
