from pydantic import BaseModel
from typing import Optional
from datetime import date, time

class ReuniaoCreate(BaseModel):
    tipo: str
    descricao: Optional[str] = None
    data: date
    horario_inicio: time
    horario_fim: time
    turma_id: Optional[int] = None
    usuario_id: Optional[int] = None

class ReuniaoUpdate(BaseModel):
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    data: Optional[date] = None
    horario_inicio: Optional[time] = None
    horario_fim: Optional[time] = None
    status: Optional[str] = None
    turma_id: Optional[int] = None
    usuario_id: Optional[int] = None

class ReuniaoResponse(BaseModel):
    id: int
    tipo: str
    descricao: Optional[str]
    data: date
    horario_inicio: time
    horario_fim: time
    status: str
    turma_id: Optional[int]
    usuario_id: Optional[int]

    class Config:
        from_attributes = True
