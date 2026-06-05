from .auth import router as auth_router
from .user_routes import router as user_routes
from .responsavel_routes import router as responsavel_routes
from .aluno_routes import router as aluno_routes

__all__ = ["auth_router", "user_routes", "responsavel_routes", "aluno_routes"]