from sqlalchemy import Column, Integer, String
from database.database import Base

class Responsavel(Base):
    __tablename__ = "responsaveis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String, nullable=False)
    telefone = Column(String, nullable=False)
    email = Column(String)