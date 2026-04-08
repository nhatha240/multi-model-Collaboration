"""
Claude Orchestrator — Main brain of the multimodel collaboration system.

Claude receives tasks, decides how to handle them:
  - Plans/analysis/architecture → Claude handles directly
  - Code generation/implementation → delegates to OpenAI via tool_use
  - Complex tasks → breaks down into subtasks, delegates each

Uses Anthropic's native tool_use (NOT LangChain) for reliable orchestration.
Streams events back to the caller via async callback.
"""
import json
from typing import Callable, Awaitable
import anthropic
from app.config import settings
from app.agents.openai_agent import OpenAIAgent

# Type for the stream callback: (agent, content, event_type) -> None
StreamCallback = Callable[[str, str, str], Awaitable[None]]

SYSTEM_PROMPT = """You are Claude, the main orchestrator in a multi-model AI collaboration system.

Your role:
- Analyze tasks and decide the best strategy
- Handle planning, architecture, analysis, and review tasks directly
- Delegate code generation and implementation to OpenAI GPT-4 via the delegate_to_openai tool
- For complex tasks, break them into subtasks and coordinate

Available subagents:
- OpenAI GPT-4 (delegate_to_openai): Best for code generation, boilerplate, implementations

When you delegate, briefly explain WHY you're delegating and what you expect back.
After delegation, review the result and add your insights.

Always think step by step and be explicit about your orchestration decisions."""

# Tools Claude can call
CLAUDE_TOOLS = [
    {
        "name": "delegate_to_openai",
        "description": (
            "Delegate a task to OpenAI GPT-5.4. Use this for: code generation, "
            "implementing functions, writing boilerplate, creating tests, "
            "or any implementation-heavy task."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": "Clear, specific task description for OpenAI to execute",
                },
                "context": {
                    "type": "string",
                    "description": "Relevant background context, existing code, or constraints",
                },
                "language": {
                    "type": "string",
                    "description": "Primary programming language (e.g. python, typescript, go)",
                    "default": "python",
                },
            },
            "required": ["task"],
        },
    },
    {
        "name": "plan_subtasks",
        "description": "Break a complex task into an ordered list of subtasks with agent assignments.",
        "input_schema": {
            "type": "object",
            "properties": {
                "subtasks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "assigned_to": {
                                "type": "string",
                                "enum": ["claude", "openai"],
                            },
                        },
                        "required": ["title", "description", "assigned_to"],
                    },
                }
            },
            "required": ["subtasks"],
        },
    },
]


class ClaudeOrchestrator:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.openai_agent = OpenAIAgent()
        self.model = settings.claude_model

    async def process(
        self,
        user_message: str,
        project_context: str = "",
        history: list[dict] | None = None,
        on_event: StreamCallback | None = None,
    ) -> str:
        """
        Main entry point. Processes a user message with full orchestration.
        Calls on_event(agent, content, type) for real-time streaming.
        Returns the final response text.
        """
        self._validate_credentials()
        messages = self._build_messages(user_message, project_context, history or [])
        final_text = ""

        # Agentic loop — runs until Claude gives a non-tool response
        while True:
            if on_event:
                await on_event("claude", "Thinking...", "thinking")

            response = await self.client.messages.create(
                model=self.model,
                max_tokens=settings.max_tokens,
                system=SYSTEM_PROMPT,
                tools=CLAUDE_TOOLS,
                messages=messages,
            )

            # Collect text blocks from this turn
            turn_text = ""
            for block in response.content:
                if hasattr(block, "text") and block.text:
                    turn_text += block.text

            if turn_text and on_event:
                await on_event("claude", turn_text, "message")

            # If Claude wants to use tools, execute them
            if response.stop_reason == "tool_use":
                tool_results = []

                for block in response.content:
                    if block.type != "tool_use":
                        continue

                    result = await self._execute_tool(block.name, block.input, on_event)

                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        }
                    )

                # Append assistant turn + tool results, continue loop
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})

            else:
                # Claude finished — collect final text
                final_text = turn_text
                if on_event:
                    await on_event("claude", "", "done")
                break

        return final_text

    def _validate_credentials(self) -> None:
        if not settings.has_valid_anthropic_key:
            raise RuntimeError(
                "Invalid `ANTHROPIC_API_KEY` in `backend/.env`. "
                "Replace the placeholder with a real Anthropic API key, then restart the backend."
            )

    async def _execute_tool(
        self,
        tool_name: str,
        tool_input: dict,
        on_event: StreamCallback | None,
    ) -> str:
        if tool_name == "delegate_to_openai":
            task = tool_input.get("task", "")
            context = tool_input.get("context", "")
            language = tool_input.get("language", "python")

            if on_event:
                await on_event(
                    "system",
                    f"Claude → delegating to OpenAI GPT-4: *{task[:120]}{'...' if len(task) > 120 else ''}*",
                    "delegation",
                )
                await on_event("openai", "Processing task...", "thinking")

            result = await self.openai_agent.execute(task, context, language)

            if on_event:
                await on_event("openai", result, "message")

            return result

        elif tool_name == "plan_subtasks":
            subtasks = tool_input.get("subtasks", [])
            if on_event:
                lines = "\n".join(
                    f"- [{s['assigned_to'].upper()}] {s['title']}" for s in subtasks
                )
                await on_event("claude", f"**Task breakdown:**\n{lines}", "message")

            return json.dumps({"status": "planned", "subtasks": subtasks})

        return f"Unknown tool: {tool_name}"

    def _build_messages(
        self,
        user_message: str,
        project_context: str,
        history: list[dict],
    ) -> list[dict]:
        messages = list(history)  # copy

        content = user_message
        if project_context:
            content = f"**Project context:**\n{project_context}\n\n---\n\n{user_message}"

        messages.append({"role": "user", "content": content})
        return messages
