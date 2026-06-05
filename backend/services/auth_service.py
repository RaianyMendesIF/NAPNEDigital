from sqlalchemy.orm import Session
from utils.responses import success_message, error_message
from schemas import authRequest
from models import Usuario, StatusUsuario
from core import create_access_token, verify_password
from core.config import ACCESS_TOKEN_EXPIRE_MINUTES


def login_service(user_data: authRequest, db: Session):

    user = db.query(Usuario).filter(Usuario.siape == user_data.siape).first()
    if not user:
        return error_message("Siape ou senha inválidos", 404)

    if user.status == StatusUsuario.INATIVO:
        return error_message("Conta desativada. Contate o coordenador.", 403)

    is_password_valid = verify_password(user_data.senha, user.senha)
    if not is_password_valid:
        return error_message("Siape ou senha inválidos", 404)

    token = create_access_token(
        {"sub": str(user.id)},
        expires_minutes=ACCESS_TOKEN_EXPIRE_MINUTES,
    )

    return success_message(
        data={
            "usuario_id": user.id,
            "siape": user.siape,
            "nome": user.nome,
            "cargo": user.cargo,
            "access_token": token,
            "token_type": "bearer",
        }, 
        message="Login realizado com sucesso"
    )
