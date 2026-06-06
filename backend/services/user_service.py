from sqlalchemy.orm import Session
from schemas import UserCreate
from models import Usuario, StatusUsuario, Cargo
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
    cargo_normalizado = user_data.cargo
    if cargo_normalizado == "Agente":
        cargo_normalizado = Cargo.ACOMPANHANTE.value
    if cargo_normalizado not in (Cargo.COORDENADOR.value, Cargo.ACOMPANHANTE.value):
        return error_message("Cargo inválido. Use Coordenador ou Acompanhante.", 400)

    if cargo_normalizado == Cargo.COORDENADOR.value:
        coordenadores = (
            db.query(Usuario)
            .filter(
                Usuario.cargo == Cargo.COORDENADOR,
                Usuario.status == StatusUsuario.ATIVO,
            )
            .count()
        )
        if coordenadores >= 1:
            return error_message("Já existe um coordenador ativo no sistema", 400)

    existing = db.query(Usuario).filter((Usuario.siape == user_data.siape) | (Usuario.email == user_data.email)).first()
    if existing:
        return error_message("Siape ou e-mail já cadastrado", 400)
    
    user = Usuario(
        siape=user_data.siape,
        nome=user_data.nome,
        cargo=cargo_normalizado,
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


def list_users_service(db: Session, cargo: str | None = None, apenas_ativos: bool = True):
    query = db.query(Usuario)
    if cargo is not None:
        query = query.filter(Usuario.cargo == cargo)
    if apenas_ativos:
        query = query.filter(Usuario.status == StatusUsuario.ATIVO)
    usuarios = query.order_by(Usuario.nome).all()
    return success_message(
        data=[_user_data(u) for u in usuarios],
        message="Usuários listados com sucesso",
    )


def deactivate_user_service(user_id: int, db: Session):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        return error_message("Usuário não encontrado", 404)

    if user.status == StatusUsuario.INATIVO:
        return error_message("Usuário já está inativo", 400)

    if user.cargo == Cargo.COORDENADOR:
        coordenadores_ativos = (
            db.query(Usuario)
            .filter(
                Usuario.cargo == Cargo.COORDENADOR,
                Usuario.status == StatusUsuario.ATIVO,
            )
            .count()
        )
        if coordenadores_ativos <= 1:
            return error_message(
                "Não é possível desativar o único coordenador ativo do sistema",
                400,
            )

    user.status = StatusUsuario.INATIVO
    db.commit()
    db.refresh(user)
    return success_message(
        data=_user_data(user),
        message="Usuário desativado com sucesso",
    )