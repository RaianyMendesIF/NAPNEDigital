from pydantic import BaseModel, Field
from typing import Optional


class UsuarioCreate(BaseModel):
    siape: str
    nome: str
    email: str
    cargo: str
    senha: str = Field(default="mudar123", min_length=8)
    status: str = "Ativo"


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    cargo: Optional[str] = None
    senha: Optional[str] = Field(default=None, min_length=8)
    status: Optional[str] = None


class UsuarioResponse(BaseModel):
    id: int
    siape: str
    nome: str
    email: str
    cargo: str
    status: str

    class Config:
        from_attributes = True
