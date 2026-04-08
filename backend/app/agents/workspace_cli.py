import asyncio
import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Awaitable, Callable

from fastapi import HTTPException

from app.project_files import get_project_root

StreamCallback = Callable[[str, str, str], Awaitable[None]]


class WorkspaceCLIPipeline:
    async def run(
        self,
        workspace_path: str,
        user_message: str,
        history: list[dict] | None = None,
        on_event: StreamCallback | None = None,
    ) -> tuple[str, str]:
        root = get_project_root(workspace_path)
        self._ensure_command("claude")
        self._ensure_command("codex")

        claude_prompt = self._build_claude_prompt(user_message, history or [])
        if on_event:
            await on_event("claude", f"Running Claude in `{root}`", "thinking")

        claude_output = await self._run_claude(root, claude_prompt, on_event)
        if on_event and not claude_output:
            await on_event("claude", "Claude completed without returning any visible text.", "message")

        codex_prompt = self._build_codex_prompt(user_message, claude_output)
        if on_event:
            await on_event("system", "Passing Claude output to Codex for execution in the workspace", "delegation")
            await on_event("codex", f"Running Codex in `{root}`", "thinking")

        codex_output = await self._run_codex(root, codex_prompt)
        if on_event and codex_output:
            await on_event("codex", codex_output, "message")
        if on_event:
            await on_event("codex", "", "done")

        return claude_output, codex_output

    async def _run_claude(
        self,
        root: Path,
        prompt: str,
        on_event: StreamCallback | None,
    ) -> str:
        command = [
            "claude",
            "-p",
            "--bare",
            "--verbose",
            "--permission-mode",
            "plan",
            "--output-format",
            "stream-json",
            "--include-partial-messages",
            "--add-dir",
            str(root),
            prompt,
        ]
        return await self._run_claude_stream(command, root, on_event)

    async def _run_codex(self, root: Path, prompt: str) -> str:
        with tempfile.NamedTemporaryFile(prefix="codex-last-", suffix=".txt", delete=False) as handle:
            output_path = Path(handle.name)

        try:
            command = [
                "codex",
                "exec",
                "--cd",
                str(root),
                "--skip-git-repo-check",
                "--full-auto",
                "--output-last-message",
                str(output_path),
                prompt,
            ]
            stdout = await self._run_command(command, root)

            if output_path.exists():
                content = output_path.read_text(encoding="utf-8").strip()
                if content:
                    return content

            return stdout
        finally:
            output_path.unlink(missing_ok=True)

    async def _run_command(self, command: list[str], cwd: Path) -> str:
        process = await asyncio.create_subprocess_exec(
            *command,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=os.environ.copy(),
        )

        try:
            stdout_bytes, stderr_bytes = await process.communicate()
        except asyncio.CancelledError:
            await self._terminate_process(process)
            raise

        stdout = stdout_bytes.decode("utf-8", errors="replace").strip()
        stderr = stderr_bytes.decode("utf-8", errors="replace").strip()

        if process.returncode != 0:
            error_detail = stderr or stdout or f"Command exited with status {process.returncode}"
            raise RuntimeError(error_detail)

        return stdout

    async def _run_claude_stream(
        self,
        command: list[str],
        cwd: Path,
        on_event: StreamCallback | None,
    ) -> str:
        process = await asyncio.create_subprocess_exec(
            *command,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=os.environ.copy(),
        )

        assistant_text = ""
        last_emitted = ""
        stdout_lines: list[str] = []

        try:
            assert process.stdout is not None
            while True:
                line = await process.stdout.readline()
                if not line:
                    break

                decoded = line.decode("utf-8", errors="replace").strip()
                if not decoded:
                    continue
                stdout_lines.append(decoded)

                parsed = self._parse_claude_stream_line(decoded)
                if not parsed:
                    continue

                assistant_text = parsed
                if on_event and assistant_text != last_emitted:
                    if last_emitted and assistant_text.startswith(last_emitted):
                        delta = assistant_text[len(last_emitted):]
                    else:
                        delta = assistant_text

                    if delta.strip():
                        await on_event("claude", delta, "stream")
                    last_emitted = assistant_text

            stderr_bytes = await process.stderr.read() if process.stderr else b""
            await process.wait()
        except asyncio.CancelledError:
            await self._terminate_process(process)
            raise

        stderr = stderr_bytes.decode("utf-8", errors="replace").strip()
        stdout_fallback = "\n".join(stdout_lines).strip()
        if process.returncode != 0:
            error_detail = assistant_text or stderr or stdout_fallback or f"Command exited with status {process.returncode}"
            raise RuntimeError(error_detail)

        return assistant_text or self._extract_text_fallback(stdout_lines)

    def _parse_claude_stream_line(self, line: str) -> str:
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            return ""

        if payload.get("type") == "assistant":
            return self._extract_text_from_assistant(payload)

        if payload.get("type") == "result":
            result = payload.get("result")
            return result.strip() if isinstance(result, str) else ""

        return ""

    def _extract_text_from_assistant(self, payload: dict) -> str:
        message = payload.get("message")
        if not isinstance(message, dict):
            return ""

        content = message.get("content")
        if not isinstance(content, list):
            return ""

        parts: list[str] = []
        for item in content:
            if not isinstance(item, dict):
                continue
            if item.get("type") == "text" and isinstance(item.get("text"), str):
                parts.append(item["text"])

        return "".join(parts).strip()

    def _extract_text_fallback(self, lines: list[str]) -> str:
        last_text = ""
        for line in lines:
            text = self._parse_claude_stream_line(line)
            if text:
                last_text = text
        return last_text

    async def _terminate_process(self, process: asyncio.subprocess.Process) -> None:
        if process.returncode is not None:
            return

        process.terminate()
        try:
            await asyncio.wait_for(process.wait(), timeout=2)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()

    def _build_claude_prompt(self, user_message: str, history: list[dict]) -> str:
        transcript = self._render_history(history)
        sections = [
            "You are Claude running inside a local project workspace.",
            "Analyze the user's request against the current codebase and produce a concise implementation plan for Codex.",
            "Focus on actionable steps, files to inspect or edit, constraints, and verification notes.",
        ]
        if transcript:
            sections.append(f"Conversation history:\n{transcript}")
        sections.append(f"Current user request:\n{user_message}")
        return "\n\n".join(sections)

    def _build_codex_prompt(self, user_message: str, claude_output: str) -> str:
        return "\n\n".join(
            [
                "You are Codex running inside the user's workspace.",
                "Execute the requested work directly in this workspace. Read, edit, and run what is needed.",
                "When finished, return a concise summary of changes, commands executed, and any remaining risks.",
                f"Original user request:\n{user_message}",
                f"Claude guidance:\n{claude_output or 'No Claude guidance was produced.'}",
            ]
        )

    def _render_history(self, history: list[dict]) -> str:
        lines: list[str] = []
        for item in history[-12:]:
            role = item.get("role", "user")
            content = str(item.get("content", "")).strip()
            if not content:
                continue
            speaker = "Assistant" if role == "assistant" else "User"
            lines.append(f"{speaker}: {content}")
        return "\n".join(lines)

    def _ensure_command(self, name: str) -> None:
        if shutil.which(name):
            return
        raise HTTPException(status_code=400, detail=f"`{name}` CLI is not installed or not available on PATH")
