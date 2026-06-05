import enum

from sqlalchemy import Column, Integer, String, ForeignKey, Date, Enum
from datetime import datetime
from database.database import Base

class StatusDocumentacao(str, enum.Enum):
    ATIVO = "Ativo"
    INATIVO = "Inativo"
class Documentacao(Base):
    __tablename__ = "documentacoes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String)
    tipo_documento = Column(String, nullable=False)
    caminho_arquivo = Column(String, nullable=False)
    ano_letivo = Column(Integer, nullable=False)
    semestre = Column(Integer, nullable=False)
    data_criacao = Column(Date, default=datetime.now)
    status = Column(
        Enum(StatusDocumentacao, native_enum=False),
        default=StatusDocumentacao.ATIVO,
        nullable=False,
    )
    aluno_id = Column(Integer, ForeignKey("alunos.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))