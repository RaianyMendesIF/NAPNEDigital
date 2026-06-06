from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core import require_atendimento_permission
from database import get_db
from schemas import AtendimentoCreate, AtendimentoUpdate
from services import (
    create_atendimento_service,
    list_atendimentos_service,
    get_atendimento_service,
    update_atendimento_service,
)

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
    current_user=Depends(require_atendimento_permission),
):
    return list_atendimentos_service(
        db,
        usuario=current_user,
        aluno_id=aluno_id,
        data_inicial=data_inicial,
        data_final=data_final,
    )


@router.get("/{atendimento_id}")
def get_atendimento(
    atendimento_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_atendimento_permission),
):
    return get_atendimento_service(atendimento_id, db)


@router.patch("/{atendimento_id}")
def update_atendimento(
    atendimento_id: int,
    data: AtendimentoUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_atendimento_permission),
):
    return update_atendimento_service(atendimento_id, data, db)
