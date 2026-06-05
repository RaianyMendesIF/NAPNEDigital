from datetime import date

from pydantic import BaseModel, Field, field_validator

from utils.validators import is_valid_cpf, normalize_digits


class AlunoCreate(BaseModel):
    matricula: str = Field(min_length=1)
    nome: str = Field(min_length=3)
    data_nascimento: date
    cpf: str = Field(min_length=11, max_length=14)
    telefone: str | None = None
    curso: str = Field(min_length=2)
    ano: str = Field(min_length=1)
    necessidade_especial: str = Field(min_length=2)
    cid: str = Field(min_length=2)
    observacao: str | None = None
    responsavel_id: int | None = None

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, value: str) -> str:
        if not is_valid_cpf(value):
            raise ValueError("CPF inválido")
        return normalize_digits(value)


class AlunoUpdate(BaseModel):
    matricula: str | None = Field(default=None, min_length=1)
    nome: str | None = Field(default=None, min_length=3)
    data_nascimento: date | None = None
    cpf: str | None = Field(default=None, min_length=11, max_length=14)
    telefone: str | None = None
    curso: str | None = Field(default=None, min_length=2)
    ano: str | None = Field(default=None, min_length=1)
    necessidade_especial: str | None = Field(default=None, min_length=2)
    cid: str | None = Field(default=None, min_length=2)
    observacao: str | None = None
    responsavel_id: int | None = None
    status: str | None = None

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not is_valid_cpf(value):
            raise ValueError("CPF inválido")
        return normalize_digits(value)


class AlunoResponse(BaseModel):
    id: int
    matricula: str
    nome: str
    data_nascimento: date
    cpf: str
    telefone: str | None
    curso: str
    ano: str
    necessidade_especial: str
    cid: str
    observacao: str | None
    responsavel_id: int | None
    status: str
    ativo: bool
