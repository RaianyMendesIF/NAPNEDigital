import enum

from sqlalchemy import Column, Integer, String, Enum
from database.database import Base

class Cargo(str, enum.Enum):
    ACOMPANHANTE = "Acompanhante"
    COORDENADOR = "Coordenador"

class StatusUsuario(str, enum.Enum):
    ATIVO = "Ativo"
    INATIVO = "Inativo"

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    siape = Column(String, unique=True, nullable=False)
    nome = Column(String, nullable=False)
    cargo = Column(Enum(Cargo, native_enum=False), nullable=False)
    email = Column(String, unique=True, nullable=False)
    senha = Column(String, nullable=False)
    status = Column(
        Enum(StatusUsuario, native_enum=False),
        default=StatusUsuario.ATIVO,
        nullable=False,
    )
