"""
Coder subagent — handles code generation and implementation tasks.
Claude orchestrator delegates coding work here via tool_use.

Supports two backends (auto-selected from config):
  Local  — Ollama / LM Studio / llama.cpp  (set CODEX_BASE_URL in .env)
  Cloud  — OpenAI API                       (set OPENAI_API_KEY in .env)
"""
from openai import AsyncOpenAI
from app.config import settings


class OpenAIAgent:
    def __init__(self):
        if settings.use_local_codex:
            # Local server: Ollama, LM Studio, llama.cpp, vLLM, etc.
            self.client = AsyncOpenAI(
                base_url=settings.codex_base_url,
                api_key=settings.codex_api_key,   # required by SDK, ignored by local servers
            )
            self.model = settings.codex_model
        else:
            # OpenAI cloud
            self.client = AsyncOpenAI(api_key=settings.openai_api_key)
            self.model = settings.openai_model

    async def execute(self, task: str, context: str = "", language: str = "python") -> str:
        """Execute a coding task and return the result."""
        self._validate_credentials()
        system_prompt = (
            "You are an expert software engineer. "
            "Produce clean, well-structured code with brief explanations. "
            "Format code in markdown code blocks with the language tag."
        )

        user_prompt = task
        if context:
            user_prompt = f"Context:\n{context}\n\nTask:\n{task}"
        if language:
            user_prompt += f"\n\nPrimary language: {language}"

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=4096,
            temperature=0.2,
        )

        return response.choices[0].message.content or ""

    async def review_code(self, code: str, requirements: str = "") -> str:
        """Review code and suggest improvements."""
        self._validate_credentials()
        prompt = f"Review this code for bugs, security issues, and best practices:\n\n```\n{code}\n```"
        if requirements:
            prompt += f"\n\nOriginal requirements: {requirements}"

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a senior code reviewer. Be concise and actionable."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2048,
            temperature=0.1,
        )

        return response.choices[0].message.content or ""

    def _validate_credentials(self) -> None:
        if settings.use_local_codex:
            return
        if not settings.has_valid_openai_key:
            raise RuntimeError(
                "Invalid `OPENAI_API_KEY` in `backend/.env`. "
                "Replace the placeholder with a real OpenAI API key, or set `CODEX_BASE_URL` to use a local coder backend."
            )
