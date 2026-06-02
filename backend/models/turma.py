import enum

from sqlalchemy import Column, Integer, ForeignKey, Enum
from database.database import Base

class Semestre(str, enum.Enum):
    PRIMEIRO = "1"
    SEGUNDO = "2"

class Turma(Base):
    __tablename__ = "turmas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ano_letivo = Column(Integer, nullable=False)
    semestre = Column(
        Enum(Semestre, native_enum=False),
        nullable=False,
    )
    aluno_id = Column(Integer, ForeignKey("alunos.id"))