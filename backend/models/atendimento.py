from sqlalchemy import Column, Integer, String, ForeignKey, Date
from database.database import Base
from datetime import datetime

class Atendimento(Base):
    __tablename__ = "atendimentos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tipo = Column(String, nullable=False)
    descricao = Column(String)
    data_solicitacao = Column(Date, default=datetime.now)
    aluno_id = Column(Integer, ForeignKey("alunos.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))