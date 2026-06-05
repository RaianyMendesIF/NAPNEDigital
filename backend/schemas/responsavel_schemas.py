from pydantic import BaseModel, Field, EmailStr


class ResponsavelCreate(BaseModel):
    nome: str = Field(min_length=3)
    telefone: str = Field(min_length=8)
    email: EmailStr | None = None


class ResponsavelUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=3)
    telefone: str | None = Field(default=None, min_length=8)
    email: EmailStr | None = None


class ResponsavelResponse(BaseModel):
    id: int
    nome: str
    telefone: str
    email: str | None
