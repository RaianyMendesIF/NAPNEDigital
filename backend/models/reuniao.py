import enum

from sqlalchemy import Column, Integer, String, ForeignKey, Date, Time, Enum
from database.database import Base

class StatusReuniao(str, enum.Enum):
    AGENDADA = "Agendada"
    REALIZADA = "Realizada"
    PENDENTE = "Pendente"
    CANCELADA = "Cancelada"

class Reuniao(Base):
    __tablename__ = "reunioes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tipo = Column(String, nullable=False)
    descricao = Column(String)
    data = Column(Date, nullable=False)
    horario_inicio = Column(Time, nullable=False)
    horario_fim = Column(Time, nullable=False)
    status = Column(
        Enum(StatusReuniao, native_enum=False),
        default=StatusReuniao.AGENDADA,
        nullable=False,
    )
    turma_id = Column(Integer, ForeignKey("turmas.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
