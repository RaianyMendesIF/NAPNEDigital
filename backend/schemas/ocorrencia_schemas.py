from datetime import date

from pydantic import BaseModel, Field


class OcorrenciaCreate(BaseModel):
    turma_id: int
    titulo: str | None = Field(default=None, min_length=3)
    descricao: str = Field(min_length=3)


class OcorrenciaUpdate(BaseModel):
    descricao: str | None = Field(default=None, min_length=3)
    titulo: str | None = Field(default=None, min_length=3)


class OcorrenciaResponse(BaseModel):
    id: int
    turma_id: int
    aluno_id: int | None
    semestre: str
    ano_letivo: int
    usuario_id: int
    titulo: str
    descricao: str
    data_registro: date
