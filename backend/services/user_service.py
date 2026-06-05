
from sqlalchemy.orm import Session
from schemas import UserCreate
from models import Usuario
from utils import error_message, success_message
from core import hash_password




def create_user_service(user_data: UserCreate, db: Session):

    existing = db.query(Usuario).filter((Usuario.siape == user_data.siape) | (Usuario.email == user_data.email)).first()
    if existing:
        return error_message("Siape ou e-mail já cadastrado", 400)
    
    user = Usuario(
        siape=user_data.siape,
        nome=user_data.nome,
        cargo=user_data.cargo,
        email=user_data.email,
        senha=hash_password(user_data.senha)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return success_message(
        data={
            "siape": user.siape,
            "nome": user.nome,
            "cargo": user.cargo,
            "email": user.email,
            "status": user.status
        },
        message="Usuário criado com sucesso"
    )