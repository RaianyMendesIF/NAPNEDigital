from pathlib import Path

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
DOCUMENTOS_DIR = UPLOAD_ROOT / "documentos"


def ensure_upload_dirs() -> None:
    DOCUMENTOS_DIR.mkdir(parents=True, exist_ok=True)
