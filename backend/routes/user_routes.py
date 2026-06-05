from fastapi import APIRouter, Depends
from schemas import UserCreate
from database import get_db
from sqlalchemy.orm import Session
from core import require_admin, get_current_user
from services import create_user_service

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
def get_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "siape": current_user.siape,
        "nome": current_user.nome,
        "cargo": current_user.cargo,
        "email": current_user.email,
        "status": current_user.status
    }

@router.post("/create")
def create_user(user_data: UserCreate, db: Session = Depends(get_db), admin: dict = Depends(require_admin)):
    return create_user_service(user_data, db)