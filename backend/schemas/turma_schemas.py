from typing import Literal

from pydantic import BaseModel, Field


class TurmaCreate(BaseModel):
    aluno_id: int
    ano_letivo: int = Field(ge=2000, le=2100)
    semestre: Literal["1", "2"]


class ProfessorTurmaCreate(BaseModel):
    usuario_id: int
    materia: str = Field(min_length=2)
    status: Literal["Ativo", "Inativo", "Pendente"] = "Ativo"


class TurmaResponse(BaseModel):
    id: int
    aluno_id: int
    ano_letivo: int
    semestre: str


class ProfessorTurmaResponse(BaseModel):
    id: int
    turma_id: int
    usuario_id: int
    materia: str
    status: str
