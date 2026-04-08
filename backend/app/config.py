from typing import Literal
from pydantic import model_validator
from pydantic_settings import BaseSettings

Plan = Literal["free", "pro", "enterprise"]

# Model caps per plan tier
PLAN_MODELS: dict[Plan, dict[str, str]] = {
    "free": {
        "claude": "claude-haiku-4-5-20251001",
        "openai": "gpt-4o-mini",
    },
    "pro": {
        "claude": "claude-sonnet-4-6",
        "openai": "gpt-4o",
    },
    "enterprise": {
        "claude": "claude-opus-4-6",
        "openai": "gpt-4o",
    },
}

# Max tokens per plan
PLAN_MAX_TOKENS: dict[Plan, int] = {
    "free": 2048,
    "pro": 4096,
    "enterprise": 8096,
}

# Max tasks stored per project per plan
PLAN_MAX_TASKS: dict[Plan, int] = {
    "free": 20,
    "pro": 200,
    "enterprise": 10_000,
}


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # Subscription plan — controls model selection and limits
    plan: Plan = "pro"

    # If set explicitly these override the plan defaults
    claude_model: str = ""
    openai_model: str = ""

    # --- Local codex (Ollama / LM Studio / llama.cpp) ---
    # Set CODEX_BASE_URL to enable local mode; OPENAI_API_KEY becomes optional.
    #
    # Ollama default:    http://localhost:11434/v1
    # LM Studio default: http://localhost:1234/v1
    # llama.cpp default: http://localhost:8080/v1
    codex_base_url: str = ""          # empty = use OpenAI cloud
    codex_model: str = "codellama"    # model name as known by the local server
    codex_api_key: str = "local"      # local servers need a non-empty key; value ignored

    database_url: str = "sqlite+aiosqlite:///./collab.db"

    @property
    def use_local_codex(self) -> bool:
        return bool(self.codex_base_url)

    @property
    def has_valid_anthropic_key(self) -> bool:
        return _looks_like_real_secret(self.anthropic_api_key, "sk-ant-your-key-here")

    @property
    def has_valid_openai_key(self) -> bool:
        return _looks_like_real_secret(self.openai_api_key, "sk-your-key-here")

    @model_validator(mode="after")
    def apply_plan_defaults(self) -> "Settings":
        """Fill model fields from plan when not explicitly configured."""
        plan_defaults = PLAN_MODELS[self.plan]
        if not self.claude_model:
            self.claude_model = plan_defaults["claude"]
        if not self.openai_model:
            self.openai_model = plan_defaults["openai"]
        return self

    @property
    def max_tokens(self) -> int:
        return PLAN_MAX_TOKENS[self.plan]

    @property
    def max_tasks(self) -> int:
        return PLAN_MAX_TASKS[self.plan]

    class Config:
        env_file = ".env"


settings = Settings()


def _looks_like_real_secret(value: str, placeholder: str) -> bool:
    normalized = value.strip()
    if not normalized:
        return False
    if normalized == placeholder:
        return False
    if normalized.endswith("-your-key-here"):
        return False
    return True
