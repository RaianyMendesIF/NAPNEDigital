from datetime import date

from pydantic import BaseModel, Field


class AtendimentoCreate(BaseModel):
    aluno_id: int
    tipo: str = Field(default="Atendimento", min_length=2)
    descricao: str = Field(min_length=3)
    data_atendimento: date | None = None
    responsavel_id: int | None = None


class AtendimentoUpdate(BaseModel):
    descricao: str | None = Field(default=None, min_length=3)
    data_atendimento: date | None = None
    tipo: str | None = Field(default=None, min_length=2)


class AtendimentoResponse(BaseModel):
    id: int
    aluno_id: int
    usuario_id: int
    tipo: str
    descricao: str | None
    data_atendimento: date
