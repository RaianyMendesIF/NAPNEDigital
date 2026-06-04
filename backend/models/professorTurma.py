import enum
from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from database.database import Base

class StatusProfessorTurma(str, enum.Enum):
    ATIVO = "Ativo"
    INATIVO = "Inativo"
    PENDENTE = "Pendente"

class ProfessorTurma(Base):
    __tablename__ = "professor_turmas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    materia = Column(String, nullable=False)
    status = Column(
        Enum(StatusProfessorTurma, native_enum=False),
        default=StatusProfessorTurma.ATIVO,
        nullable=False,
    )
    turma_id = Column(Integer, ForeignKey("turmas.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))