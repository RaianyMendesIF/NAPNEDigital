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
]
