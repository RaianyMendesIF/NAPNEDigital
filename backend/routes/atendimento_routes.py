from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core import require_atendimento_permission, get_current_user
from database import get_db
from schemas import AtendimentoCreate
from services import create_atendimento_service, list_atendimentos_service

router = APIRouter(prefix="/atendimentos", tags=["atendimentos"])


@router.post("")
def create_atendimento(
    data: AtendimentoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_atendimento_permission),
):
    return create_atendimento_service(data, current_user, db)


@router.get("")
def list_atendimentos(
    aluno_id: int | None = Query(default=None),
    data_inicial: date | None = Query(default=None),
    data_final: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return list_atendimentos_service(
        db,
        aluno_id=aluno_id,
        data_inicial=data_inicial,
        data_final=data_final,
    )
