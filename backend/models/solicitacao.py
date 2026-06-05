import enum

from sqlalchemy import Column, Integer, String, ForeignKey, Date, Enum
from datetime import datetime
from database.database import Base

class StatusSolicitacao(str, enum.Enum):
    EM_ANALISE = "EM_ANALISE"
    DEFERIDO = "DEFERIDO"
    INDEFERIDO = "INDEFERIDO"


class Solicitacao(Base):
    __tablename__ = "solicitacoes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    descricao = Column(String, nullable=False)
    data_solicitacao = Column(Date, default=datetime.now)
    status = Column(
        Enum(StatusSolicitacao, native_enum=False),
        default=StatusSolicitacao.EM_ANALISE,
        nullable=False,
    )
    turma_id = Column(Integer, ForeignKey("turmas.id"))
    usuario_solicitante_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)