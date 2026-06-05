from fastapi import APIRouter, Depends
from schemas import UserCreate
from database import get_db
from sqlalchemy.orm import Session
from core import require_admin, get_current_user
from services import create_user_service, deactivate_user_service, list_users_service

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
def get_user_info(current_user: dict = Depends(get_current_user)):
    status = (
        current_user.status.value
        if hasattr(current_user.status, "value")
        else current_user.status
    )
    cargo = (
        current_user.cargo.value
        if hasattr(current_user.cargo, "value")
        else current_user.cargo
    )
    return {
        "siape": current_user.siape,
        "nome": current_user.nome,
        "cargo": cargo,
        "email": current_user.email,
        "status": status,
        "ativo": status == "Ativo",
    }

@router.get("")
def list_users(
    cargo: str | None = None,
    apenas_ativos: bool = True,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return list_users_service(db, cargo=cargo, apenas_ativos=apenas_ativos)


@router.post("/create")
def create_user(user_data: UserCreate, db: Session = Depends(get_db), admin: dict = Depends(require_admin)):
    return create_user_service(user_data, db)


@router.delete("/{user_id}")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    return deactivate_user_service(user_id, db)