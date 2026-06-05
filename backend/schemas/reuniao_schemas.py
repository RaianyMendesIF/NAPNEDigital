from datetime import date

from pydantic import BaseModel, Field


class ReuniaoCreate(BaseModel):
    turma_id: int
    titulo: str = Field(min_length=3)
    descricao: str | None = None
    data_reuniao: date


class ReuniaoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=3)
    descricao: str | None = None
    data_reuniao: date | None = None
    status: str | None = None


class ReuniaoResponse(BaseModel):
    id: int
    turma_id: int
    aluno_id: int | None
    titulo: str
    descricao: str | None
    data_reuniao: date
    horario_inicio: str
    horario_fim: str
    status: str
    usuario_id: int
