from typing import Literal

from pydantic import BaseModel, Field, EmailStr

class UserCreate(BaseModel):
    siape: str = Field(min_length=7, max_length=7)
    nome: str = Field(min_length=3)
    cargo: Literal["Coordenador", "Acompanhante", "Agente"]
    email: EmailStr
    senha: str = Field(min_length=8)

class UserUpdate(BaseModel):
    nome: str = Field(min_length=3)
    cargo: str
    email: EmailStr
    senha: str = Field(min_length=8)


class UserMeUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=3)
    email: EmailStr | None = None
    senha_atual: str | None = None
    nova_senha: str | None = Field(default=None, min_length=8)

class UserResponse(BaseModel):
    id: int
    siape: str
    nome: str
    cargo: str
    email: EmailStr
    status: str