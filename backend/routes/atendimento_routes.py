from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core import get_current_user
from database import get_db
from schemas import AtendimentoCreate
from services import create_atendimento_service

router = APIRouter(prefix="/atendimentos", tags=["atendimentos"])


@router.post("")
def create_atendimento(
    data: AtendimentoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return create_atendimento_service(data, current_user, db)
