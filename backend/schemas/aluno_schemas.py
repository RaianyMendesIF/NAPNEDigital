from pydantic import BaseModel
from typing import Optional
from datetime import date

class AlunoCreate(BaseModel):
    matricula: str
    nome: str
    data_nascimento: date
    cpf: str
    telefone: Optional[str] = None
    curso: str
    ano: str
    necessidade_especial: str
    cid: str
    observacao: Optional[str] = None
    responsavel_id: Optional[int] = None
    acompanhante_id: Optional[int] = None

class AlunoUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    curso: Optional[str] = None
    ano: Optional[str] = None
    necessidade_especial: Optional[str] = None
    cid: Optional[str] = None
    observacao: Optional[str] = None
    status: Optional[str] = None
    responsavel_id: Optional[int] = None
    acompanhante_id: Optional[int] = None

class AlunoResponse(BaseModel):
    id: int
    matricula: str
    nome: str
    data_nascimento: date
    cpf: str
    telefone: Optional[str]
    curso: str
    ano: str
    necessidade_especial: str
    cid: str
    observacao: Optional[str]
    status: str
    responsavel_id: Optional[int]
    acompanhante_id: Optional[int] = None
    acompanhante_nome: Optional[str] = None

    class Config:
        from_attributes = True
