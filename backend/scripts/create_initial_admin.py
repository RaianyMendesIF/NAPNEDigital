from backend.core import hash_password
from models import Usuario
from sqlalchemy.orm import Session
from database import engine

def create_initial_admin():
    db = Session(bind=engine)

    admin_exists = db.query(Usuario).filter(Usuario.cargo == "Coordenador").first()
    if admin_exists:
        return

    password = "mudar123"
    hash_pass = hash_password(password)
    
    coordenador = User(
        siape="1234567890",
        nome="Coordenador SINAPNE",
        email="coordenador@example.com",
        senha=hash_pass,
        cargo="Coordenador",
        status="Ativo"
    )

    db.add(coordenador)
    db.commit()
    db.close()
    
    return coordenador