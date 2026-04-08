from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import projects, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Multi-Model Collaboration API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(chat.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/config")
async def get_config():
    """Expose active plan and model config to the frontend."""
    from app.config import settings, PLAN_MODELS, PLAN_MAX_TOKENS, PLAN_MAX_TASKS
    coder_model = settings.codex_model if settings.use_local_codex else settings.openai_model
    return {
        "plan": settings.plan,
        "claude_model": settings.claude_model,
        "openai_model": coder_model,
        "coder_backend": "local" if settings.use_local_codex else "openai",
        "codex_base_url": settings.codex_base_url or None,
        "max_tokens": settings.max_tokens,
        "max_tasks": settings.max_tasks,
        "available_plans": {
            plan: {**models, "max_tokens": PLAN_MAX_TOKENS[plan], "max_tasks": PLAN_MAX_TASKS[plan]}
            for plan, models in PLAN_MODELS.items()
        },
    }
