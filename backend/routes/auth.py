from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from services.auth_service import login_service
from database import get_db
from schemas import authRequest

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
def login(user_data: authRequest, db: Session = Depends(get_db)):
    return login_service(user_data, db)
    