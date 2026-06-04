import enum

from sqlalchemy import Column, Integer, String, ForeignKey, Date, Enum
from database.database import Base

class StatusAluno(str, enum.Enum):
    ATIVO = "Ativo"
    INATIVO = "Inativo"

class Aluno(Base):
    __tablename__ = "alunos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    matricula = Column(String, unique=True, nullable=False)
    nome = Column(String, nullable=False)
    data_nascimento = Column(Date, nullable=False)
    cpf = Column(String, unique=True, nullable=False)
    telefone = Column(String)
    curso = Column(String, nullable=False)
    ano = Column(String, nullable=False)
    necessidade_especial = Column(String, nullable=False)
    cid = Column(String, nullable=False)
    observacao = Column(String)
    status = Column(
        Enum(StatusAluno, native_enum=False),
        default=StatusAluno.ATIVO,
        nullable=False,
    )
    responsavel_id = Column(Integer, ForeignKey("responsaveis.id"))