# artifacts.py
import os, uuid
from pathlib import Path

_BASE = Path(__file__).resolve().parent / "artifacts"
_BASE.mkdir(parents=True, exist_ok=True)

def save_bytes(data: bytes, suffix: str = "") -> str:
    name = f"{uuid.uuid4().hex}{suffix}"
    (_BASE / name).write_bytes(data)
    return name

def open_path(artifact_id: str) -> Path:
    p = _BASE / artifact_id
    if not p.exists():
        raise FileNotFoundError(artifact_id)
    return p
