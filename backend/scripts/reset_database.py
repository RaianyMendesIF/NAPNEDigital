"""Remove todos os dados de teste e mantém apenas a coordenadora Eva."""
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import text
from sqlalchemy.orm import Session

from core import hash_password
from database import engine
from models import Usuario


def reset_database() -> None:
    with engine.begin() as conn:
        tables = [
            "solicitacoes",
            "reunioes",
            "ocorrencias",
            "atendimentos",
            "documentacoes",
            "professor_turmas",
            "turmas",
            "alunos",
            "responsaveis",
            "usuarios",
        ]
        conn.execute(text("PRAGMA foreign_keys = OFF"))
        for table in tables:
            conn.execute(text(f"DELETE FROM {table}"))
        conn.execute(text("PRAGMA foreign_keys = ON"))

    db = Session(bind=engine)
    try:
        coordenador = Usuario(
            siape="1234567",
            nome="Eva Maria Testa Teles",
            email="eva.teles@ifms.edu.br",
            senha=hash_password("mudar123"),
            cargo="Coordenador",
            status="Ativo",
        )
        db.add(coordenador)
        db.commit()
        print("Banco resetado. Apenas Eva Maria Testa Teles (Coordenador) foi mantida.")
        print("Login: SIAPE 1234567 | Senha mudar123")
    finally:
        db.close()


if __name__ == "__main__":
    reset_database()
