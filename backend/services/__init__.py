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
from .turma_service import (
    create_turma_service,
    list_turmas_service,
    get_turma_service,
    vincular_professor_service,
    list_professores_turma_service,
)
from .documentacao_service import upload_documento
from .atendimento_service import (
    create_atendimento_service,
    list_atendimentos_service,
    get_atendimento_service,
    update_atendimento_service,
)
from .ocorrencia_service import (
    create_ocorrencia_service,
    list_ocorrencias_service,
    get_ocorrencia_service,
    update_ocorrencia_service,
)
from .solicitacao_service import (
    create_solicitacao_service,
    update_status_service,
    list_solicitacoes_service,
    get_solicitacao_service,
)
from .reuniao_service import (
    create_reuniao_service,
    update_reuniao_service,
    list_reunioes_service,
    get_reuniao_service,
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
    "create_turma_service",
    "list_turmas_service",
    "get_turma_service",
    "vincular_professor_service",
    "list_professores_turma_service",
    "upload_documento",
    "create_atendimento_service",
    "list_atendimentos_service",
    "get_atendimento_service",
    "update_atendimento_service",
    "create_ocorrencia_service",
    "list_ocorrencias_service",
    "get_ocorrencia_service",
    "update_ocorrencia_service",
    "create_solicitacao_service",
    "update_status_service",
    "list_solicitacoes_service",
    "get_solicitacao_service",
    "create_reuniao_service",
    "update_reuniao_service",
    "list_reunioes_service",
    "get_reuniao_service",
]
