from .auth_service import login_service
from .user_service import create_user_service, deactivate_user_service
from .responsavel_service import (
    create_responsavel_service,
    list_responsaveis_service,
    get_responsavel_service,
    update_responsavel_service,
    delete_responsavel_service,
)
from .aluno_service import (
    create_aluno_service,
    list_alunos_service,
    get_aluno_service,
    update_aluno_service,
    deactivate_aluno_service,
)

__all__ = [
    "login_service",
    "create_user_service",
    "deactivate_user_service",
    "create_responsavel_service",
    "list_responsaveis_service",
    "get_responsavel_service",
    "update_responsavel_service",
    "delete_responsavel_service",
    "create_aluno_service",
    "list_alunos_service",
    "get_aluno_service",
    "update_aluno_service",
    "deactivate_aluno_service",
]
