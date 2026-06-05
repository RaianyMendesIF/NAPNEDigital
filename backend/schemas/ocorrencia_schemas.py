from pydantic import BaseModel
from typing import Optional
from datetime import date

class OcorrenciaCreate(BaseModel):
    titulo: str
    descricao: str
    turma_id: Optional[int] = None
    usuario_id: Optional[int] = None

class OcorrenciaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    turma_id: Optional[int] = None
    usuario_id: Optional[int] = None

class OcorrenciaResponse(BaseModel):
    id: int
    titulo: str
    descricao: str
    data_registro: date
    turma_id: Optional[int]
    usuario_id: Optional[int]

    class Config:
        from_attributes = True
