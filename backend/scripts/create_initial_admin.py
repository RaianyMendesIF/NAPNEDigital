from core import hash_password
from models import Usuario
from sqlalchemy.orm import Session
from database import engine

def create_initial_admin_script():
    db = Session(bind=engine)

    admin_exists = db.query(Usuario).filter(Usuario.cargo == "Coordenador").first()
    if admin_exists:
        return

    password = "mudar123"
    hash_pass = hash_password(password)
    
    coordenador = Usuario(
        siape="1234567",
        nome="Eva Maria Testa Teles",
        email="eva.teles@ifms.edu.br",
        senha=hash_pass,
        cargo="Coordenador",
        status="Ativo"
    )

    db.add(coordenador)
    db.commit()
    db.close()
    
    print("Coordenador criado com sucesso")
    return True
