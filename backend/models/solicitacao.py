import enum

from sqlalchemy import Column, Integer, String, ForeignKey, Date, Enum
from datetime import datetime
from database.database import Base

class StatusSolicitacao(str, enum.Enum):
    CONCLUIDO = "Concluido"
    PENDENTE = "Pendente"

class Solicitacao(Base):
    __tablename__ = "solicitacoes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    descricao = Column(String, nullable=False)
    data_solicitacao = Column(Date, default=datetime.now)
    status = Column(
        Enum(StatusSolicitacao, native_enum=False),
        default=StatusSolicitacao.PENDENTE,
        nullable=False,
    )
    turma_id = Column(Integer, ForeignKey("turmas.id"))