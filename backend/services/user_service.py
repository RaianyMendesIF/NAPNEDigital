from sqlalchemy.orm import Session
from schemas import UserCreate
from models import Usuario, StatusUsuario
from utils import error_message, success_message
from core import hash_password


def _user_data(user: Usuario) -> dict:
    status = user.status.value if hasattr(user.status, "value") else user.status
    return {
        "id": user.id,
        "siape": user.siape,
        "nome": user.nome,
        "cargo": user.cargo.value if hasattr(user.cargo, "value") else user.cargo,
        "email": user.email,
        "status": status,
        "ativo": user.status == StatusUsuario.ATIVO,
    }




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
        data=_user_data(user),
        message="Usuário criado com sucesso",
    )


def deactivate_user_service(user_id: int, db: Session):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        return error_message("Usuário não encontrado", 404)

    if user.status == StatusUsuario.INATIVO:
        return error_message("Usuário já está inativo", 400)

    user.status = StatusUsuario.INATIVO
    db.commit()
    db.refresh(user)
    return success_message(
        data=_user_data(user),
        message="Usuário desativado com sucesso",
    )