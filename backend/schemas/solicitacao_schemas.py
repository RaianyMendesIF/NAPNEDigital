from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class SolicitacaoCreate(BaseModel):
    turma_id: int
    descricao: str = Field(min_length=3)


class SolicitacaoUpdate(BaseModel):
    descricao: str | None = Field(default=None, min_length=3)


class SolicitacaoStatusUpdate(BaseModel):
    status: Literal["DEFERIDO", "INDEFERIDO"]


class SolicitacaoResponse(BaseModel):
    id: int
    turma_id: int
    aluno_id: int | None
    descricao: str
    status: str
    data_solicitacao: date
    usuario_solicitante_id: int
