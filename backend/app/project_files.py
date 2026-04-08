from pathlib import Path

from fastapi import HTTPException

MAX_FILE_SIZE = 1_000_000
IGNORED_DIRECTORIES = {
    ".git",
    ".idea",
    ".next",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
    "venv",
}
IGNORED_FILES = {".DS_Store"}


def get_project_root(local_path: str) -> Path:
    if not local_path.strip():
        raise HTTPException(status_code=400, detail="Project is not linked to a local folder")

    root = Path(local_path).expanduser()
    if not root.is_absolute():
        root = (Path.cwd() / root).resolve()
    else:
        root = root.resolve()

    if not root.exists():
        raise HTTPException(status_code=400, detail=f"Local folder does not exist: {root}")
    if not root.is_dir():
        raise HTTPException(status_code=400, detail=f"Local path is not a folder: {root}")

    return root


def resolve_relative_path(root: Path, relative_path: str) -> Path:
    clean_relative_path = relative_path.strip().lstrip("/")
    target = (root / clean_relative_path).resolve()

    try:
        target.relative_to(root)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Path escapes the project root") from exc

    return target


def list_directory(root: Path, relative_path: str = "") -> list[dict[str, str]]:
    target = resolve_relative_path(root, relative_path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Folder not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Requested path is not a folder")

    entries: list[dict[str, str]] = []
    for child in sorted(target.iterdir(), key=lambda item: (item.is_file(), item.name.lower())):
        if child.name in IGNORED_FILES:
            continue
        if child.is_dir() and child.name in IGNORED_DIRECTORIES:
            continue

        entries.append(
            {
                "name": child.name,
                "path": child.relative_to(root).as_posix(),
                "type": "directory" if child.is_dir() else "file",
            }
        )

    return entries


def read_text_file(root: Path, relative_path: str) -> str:
    target = resolve_relative_path(root, relative_path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if not target.is_file():
        raise HTTPException(status_code=400, detail="Requested path is not a file")
    if target.stat().st_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File is too large to edit in the browser")

    raw = target.read_bytes()
    if b"\x00" in raw:
        raise HTTPException(status_code=400, detail="Binary files are not supported")

    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="Only UTF-8 text files are supported") from exc


def write_text_file(root: Path, relative_path: str, content: str) -> None:
    target = resolve_relative_path(root, relative_path)
    encoded = content.encode("utf-8")
    if len(encoded) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File is too large to save in the browser")
    if target.exists() and not target.is_file():
        raise HTTPException(status_code=400, detail="Requested path is not a file")

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(encoded)
