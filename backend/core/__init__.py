from .config import DATABASE_URL
from .auth import create_access_token, verify_token
from .security import hash_password, verify_password
from .dependencies import (
    get_current_user,
    require_admin,
    require_gestor,
    require_professor_in_turma,
    usuario_tem_acesso_turma,
)

__all__ = [
    "DATABASE_URL",
    "create_access_token",
    "verify_token",
    "hash_password",
    "verify_password",
    "get_current_user",
    "require_admin",
    "require_gestor",
    "require_professor_in_turma",
    "usuario_tem_acesso_turma",
]