from .auth_schemas import authRequest
from .user_schemas import UserCreate, UserUpdate, UserResponse
from .responsavel_schemas import (
    ResponsavelCreate,
    ResponsavelUpdate,
    ResponsavelResponse,
)
from .aluno_schemas import AlunoCreate, AlunoUpdate, AlunoResponse
from .turma_schemas import (
    TurmaCreate,
    ProfessorTurmaCreate,
    TurmaResponse,
    ProfessorTurmaResponse,
)
from .documentacao_schemas import DocumentacaoResponse
from .atendimento_schemas import (
    AtendimentoCreate,
    AtendimentoUpdate,
    AtendimentoResponse,
)
from .ocorrencia_schemas import (
    OcorrenciaCreate,
    OcorrenciaUpdate,
    OcorrenciaResponse,
)

__all__ = [
    "authRequest",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "ResponsavelCreate",
    "ResponsavelUpdate",
    "ResponsavelResponse",
    "AlunoCreate",
    "AlunoUpdate",
    "AlunoResponse",
    "TurmaCreate",
    "ProfessorTurmaCreate",
    "TurmaResponse",
    "ProfessorTurmaResponse",
    "DocumentacaoResponse",
    "AtendimentoCreate",
    "AtendimentoUpdate",
    "AtendimentoResponse",
    "OcorrenciaCreate",
    "OcorrenciaUpdate",
    "OcorrenciaResponse",
]
