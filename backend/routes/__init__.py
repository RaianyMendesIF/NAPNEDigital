from .auth import router as auth_router
from .user_routes import router as user_routes
from .responsavel_routes import router as responsavel_routes
from .aluno_routes import router as aluno_routes
from .turma_routes import router as turma_routes
from .documentacao_routes import router as documentacao_routes
from .atendimento_routes import router as atendimento_routes
from .ocorrencia_routes import router as ocorrencia_routes

__all__ = [
    "auth_router",
    "user_routes",
    "responsavel_routes",
    "aluno_routes",
    "turma_routes",
    "documentacao_routes",
    "atendimento_routes",
    "ocorrencia_routes",
]