from sqlalchemy import Column, Integer, String, ForeignKey, Date
from datetime import datetime
from database.database import Base

class Ocorrencia(Base):
    __tablename__ = "ocorrencias"

    id = Column(Integer, primary_key=True, autoincrement=True)
    titulo = Column(String, nullable=False)
    descricao = Column(String, nullable=False)
    data_registro = Column(Date, default=datetime.now)
    turma_id = Column(Integer, ForeignKey("turmas.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))